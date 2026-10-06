import "server-only";

import { inflateRawSync } from "node:zlib";

import { readZipEntries, zipEntryData, type ZipEntry } from "@/lib/zip";

import { ResumeProcessingFailure } from "./errors";
import type { ExtractedText } from "./extract-pdf";

/** Upper bound for one decompressed XML part; real resumes are far smaller. */
export const DOCX_MAX_PART_BYTES = 10 * 1024 * 1024;
/** Compression ratios beyond this are treated as a decompression bomb. */
const MAX_COMPRESSION_RATIO = 200;

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeXmlText(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return XML_ENTITIES[entity] ?? match;
  });
}

/**
 * Plain text of a WordprocessingML part: the contents of text runs (`w:t`), with paragraphs,
 * line breaks, and tabs kept as whitespace. Everything else (formatting, fields, drawings) is
 * ignored.
 */
export function wordprocessingText(xml: string): string {
  let output = "";
  let inText = false;
  for (const match of xml.matchAll(/<(\/?)([A-Za-z][\w:.-]*)\b[^>]*?(\/?)>|([^<]+)/g)) {
    const [, closing, tag, selfClosing, text] = match;
    if (text !== undefined) {
      if (inText) output += decodeXmlText(text);
      continue;
    }
    if (tag === "w:t") {
      inText = closing !== "/" && selfClosing !== "/";
    } else if (tag === "w:p" && (closing === "/" || selfClosing === "/")) {
      output += "\n";
    } else if (tag === "w:tab" && closing !== "/") {
      output += "\t";
    } else if ((tag === "w:br" || tag === "w:cr") && closing !== "/") {
      output += "\n";
    }
  }
  return output;
}

function inflateEntry(bytes: Uint8Array, entry: ZipEntry): string {
  if (entry.encrypted) throw new ResumeProcessingFailure("encrypted");
  if (entry.uncompressedSize > DOCX_MAX_PART_BYTES) throw new ResumeProcessingFailure("unreadable");
  if (
    entry.compressedSize > 0 &&
    entry.uncompressedSize / entry.compressedSize > MAX_COMPRESSION_RATIO
  ) {
    throw new ResumeProcessingFailure("unreadable");
  }
  const data = zipEntryData(bytes, entry);
  if (!data) throw new ResumeProcessingFailure("unreadable");

  let raw: Uint8Array;
  if (entry.method === 0) raw = data;
  else if (entry.method === 8) {
    try {
      // The declared size can lie; the output limit is what actually stops a bomb.
      raw = inflateRawSync(data, { maxOutputLength: DOCX_MAX_PART_BYTES });
    } catch {
      throw new ResumeProcessingFailure("unreadable");
    }
  } else throw new ResumeProcessingFailure("unreadable");

  return new TextDecoder("utf-8").decode(raw);
}

/** Reads the text of a DOCX file: page headers first (where contact details often are), then the body. */
export function extractDocxText(bytes: Uint8Array): ExtractedText {
  const entries = readZipEntries(bytes);
  if (!entries) throw new ResumeProcessingFailure("unreadable");

  const body = entries.find((entry) => entry.name === "word/document.xml");
  if (!body) throw new ResumeProcessingFailure("unreadable");
  const headers = entries
    .filter((entry) => /^word\/header\d*\.xml$/.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const parts = [...headers, body].map((entry) => wordprocessingText(inflateEntry(bytes, entry)));
  return { text: parts.join("\n"), pageCount: null };
}
