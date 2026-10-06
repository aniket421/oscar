/**
 * TEST FIXTURES. Generates small, valid PDF and DOCX files for a fictional candidate, so tests
 * never depend on binary files or real people's resumes. Never used by application code.
 */
import { deflateRawSync } from "node:zlib";

/** A fictional resume. Contact details use reserved example domains and numbers. */
export const fixtureResumeLines = [
  "Jordan Example",
  "Product Engineer",
  "jordan.example@example.test | +1 555 010 4477 | linkedin.com/in/jordan-example",
  "https://jordan.example.test",
  "Summary",
  "Product engineer with six years of experience building web applications for small teams.",
  "Experience",
  "Example Labs, Senior Engineer, 2021 to present",
  "Led the migration of a billing service to TypeScript and PostgreSQL.",
  "Mentoring two junior engineers through code review.",
  "Education",
  "Example University, BSc Computer Science, 2014 to 2018",
  "Skills",
  "TypeScript, React, Node.js, Go, Docker, AWS, Communication",
  "Projects",
  "Open source form library used by internal teams.",
] as const;

// PDF -----------------------------------------------------------------------------------------

function pdfString(value: string): string {
  return `(${value.replace(/[()\\]/g, (match) => `\\${match}`)})`;
}

/** A one-page PDF (Helvetica text), or several pages when `pages` is given. */
export function buildPdf(lines: readonly string[] = fixtureResumeLines, pages = 1): Uint8Array {
  const objects: string[] = [];
  // push returns the new length, which is the 1-based PDF object number.
  const add = (body: string) => objects.push(body);
  const catalog = add("");
  const pageTree = add("");
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];
  for (let page = 0; page < pages; page += 1) {
    const content = `BT /F1 11 Tf 56 760 Td 15 TL ${lines.map((line) => `${pdfString(line)} Tj T*`).join(" ")} ET`;
    const stream = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    pageIds.push(
      add(
        `<< /Type /Page /Parent ${pageTree} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${stream} 0 R >>`,
      ),
    );
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pageTree} 0 R >>`;
  objects[pageTree - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages} >>`;

  let output = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(output.length);
    output += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(output);
}

// ZIP and DOCX ------------------------------------------------------------------------------

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFixtureEntry {
  name: string;
  data: Uint8Array | string;
  /** Store without compression (method 0). */
  stored?: boolean;
}

/** A standard ZIP archive (deflate by default) with a valid central directory. */
export function buildZip(entries: readonly ZipFixtureEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const raw = typeof entry.data === "string" ? encoder.encode(entry.data) : entry.data;
    const compressed = entry.stored ? raw : new Uint8Array(deflateRawSync(raw));
    const method = entry.stored ? 0 : 8;
    const crc = crc32(raw);

    const local = new Uint8Array(30 + name.length + compressed.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, method, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, compressed.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(compressed, 30 + name.length);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, method, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, compressed.length, true);
    cv.setUint32(24, raw.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);

    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const directorySize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, directorySize, true);
  ev.setUint32(16, offset, true);

  const parts = [...locals, ...centrals, end];
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let position = 0;
  for (const part of parts) {
    output.set(part, position);
    position += part.length;
  }
  return output;
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paragraphs(lines: readonly string[]): string {
  return lines
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r></w:p>`)
    .join("");
}

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

const packageRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

const W_NAMESPACE = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

/** A minimal Word document. `headerLines` go into a page header part, as some resumes do. */
export function buildDocx(
  lines: readonly string[] = fixtureResumeLines,
  options: { headerLines?: readonly string[] } = {},
): Uint8Array {
  const entries: ZipFixtureEntry[] = [
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: packageRels },
    {
      name: "word/document.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NAMESPACE}><w:body>${paragraphs(lines)}<w:sectPr/></w:body></w:document>`,
    },
  ];
  if (options.headerLines) {
    entries.push({
      name: "word/header1.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${W_NAMESPACE}>${paragraphs(options.headerLines)}</w:hdr>`,
    });
  }
  return buildZip(entries);
}

/** Bytes that start like a Windows executable, for rejection tests. */
export function executableBytes(): Uint8Array {
  const bytes = new Uint8Array(256);
  bytes.set([0x4d, 0x5a, 0x90, 0x00]);
  return bytes;
}

/** A tiny valid PNG (1x1 pixel). */
export function buildPng(): Uint8Array {
  return Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
}
