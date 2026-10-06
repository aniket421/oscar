import "server-only";

import { extractText, getDocumentProxy } from "unpdf";

import { ResumeProcessingFailure } from "./errors";

/** Longer files are rejected rather than read: resumes are a few pages long. */
export const PDF_MAX_PAGES = 30;

export interface ExtractedText {
  text: string;
  pageCount: number | null;
}

function isPasswordError(error: unknown): boolean {
  return error instanceof Error && error.name === "PasswordException";
}

/** Reads the text of a PDF with pdf.js, entirely in this process. */
export async function extractPdfText(bytes: Uint8Array): Promise<ExtractedText> {
  let document: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    // pdf.js may detach the buffer it is given, so it gets its own copy.
    document = await getDocumentProxy(new Uint8Array(bytes), {
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0,
    });
  } catch (error) {
    throw new ResumeProcessingFailure(isPasswordError(error) ? "encrypted" : "unreadable");
  }

  try {
    if (document.numPages > PDF_MAX_PAGES) throw new ResumeProcessingFailure("too_many_pages");
    const { text, totalPages } = await extractText(document, { mergePages: false });
    return { text: text.join("\n"), pageCount: totalPages };
  } catch (error) {
    if (error instanceof ResumeProcessingFailure) throw error;
    throw new ResumeProcessingFailure(isPasswordError(error) ? "encrypted" : "unreadable");
  } finally {
    await document.loadingTask.destroy().catch(() => undefined);
  }
}
