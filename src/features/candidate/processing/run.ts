import "server-only";

import { logDataError } from "@/server/candidate/errors";
import { saveResumeParse, setResumeStatus } from "@/server/candidate/resume-repository";
import type { ServerSupabaseClient } from "@/server/supabase/server-client";
import type { ResumeFileType, ResumeParse, ResumeProcessingError } from "@/types/candidate";

import { extractDocxText } from "./extract-docx";
import { extractPdfText, type ExtractedText } from "./extract-pdf";
import { ResumeProcessingFailure } from "./errors";
import { MIN_WORDS, PARSER_VERSION, parseResumeText } from "./parse-text";

/** Stage 1: plain text from the file, in this process. */
export async function extractResumeText(
  bytes: Uint8Array,
  fileType: ResumeFileType,
): Promise<ExtractedText> {
  return fileType === "pdf" ? extractPdfText(bytes) : extractDocxText(bytes);
}

/** Stages 1 and 2: file bytes to parse results. The text is discarded when this returns. */
export async function parseResumeFile(
  resumeId: string,
  bytes: Uint8Array,
  fileType: ResumeFileType,
): Promise<ResumeParse> {
  const { text, pageCount } = await extractResumeText(bytes, fileType);
  const parsed = parseResumeText(text);
  if (parsed.wordCount < MIN_WORDS) throw new ResumeProcessingFailure("no_text");
  return { resumeId, parserVersion: PARSER_VERSION, pageCount, ...parsed };
}

export interface ProcessResumeInput {
  db: ServerSupabaseClient;
  userId: string;
  resumeId: string;
  fileType: ResumeFileType;
  /** Supplies the file: the uploaded bytes, or a download from storage on a retry. */
  loadFile: () => Promise<Uint8Array>;
}

function failureCode(error: unknown): ResumeProcessingError {
  return error instanceof ResumeProcessingFailure ? error.code : "internal";
}

/**
 * Runs the pipeline for one resume and records the outcome on its row:
 * uploaded → processing → processed (with a parse) or failed (with a code).
 * Never throws; failures are stored and logged with codes only.
 */
export async function processResume(input: ProcessResumeInput): Promise<void> {
  const { db, userId, resumeId, fileType } = input;
  try {
    await setResumeStatus(db, userId, resumeId, { status: "processing" });
  } catch (error) {
    // The resume was deleted or replaced before processing started; nothing to do.
    logDataError("resume.process.start", error);
    return;
  }

  try {
    let bytes: Uint8Array;
    try {
      bytes = await input.loadFile();
    } catch (error) {
      logDataError("resume.process.load", error);
      throw new ResumeProcessingFailure("storage");
    }
    const parse = await parseResumeFile(resumeId, bytes, fileType);
    await saveResumeParse(db, userId, parse);
    await setResumeStatus(db, userId, resumeId, {
      status: "processed",
      parsedVersion: parse.parserVersion,
    });
  } catch (error) {
    const code = failureCode(error);
    if (!(error instanceof ResumeProcessingFailure)) logDataError("resume.process", error);
    console.warn("[candidate] resume.process.failed", { resumeId, code });
    await setResumeStatus(db, userId, resumeId, { status: "failed", error: code }).catch(
      (statusError: unknown) => logDataError("resume.process.fail", statusError),
    );
  }
}
