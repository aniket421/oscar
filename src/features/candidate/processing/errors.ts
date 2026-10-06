import type { ResumeProcessingError } from "@/types/candidate";

/** A processing failure with a code that is safe to store and log (never file content). */
export class ResumeProcessingFailure extends Error {
  readonly code: ResumeProcessingError;

  constructor(code: ResumeProcessingError) {
    super(`Resume processing failed: ${code}`);
    this.name = "ResumeProcessingFailure";
    this.code = code;
  }
}
