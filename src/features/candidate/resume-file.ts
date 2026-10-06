/**
 * File checks for resumes and profile photos. `checkFileBasics` runs in the browser for instant
 * feedback and again on the server; `detect*` checks the file's actual content (signature) and is
 * what the server relies on. A renamed executable, script, or archive fails whatever its name or
 * declared type.
 */
import { readZipEntries } from "@/lib/zip";
import type { ResumeFileType } from "@/types/candidate";

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const resumeMimeTypes: Record<ResumeFileType, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export type AvatarFileType = "png" | "jpg" | "webp";

export const avatarMimeTypes: Record<AvatarFileType, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

/** For the file input's `accept` attribute (a hint only; the server decides). */
export const RESUME_ACCEPT = `.pdf,.docx,${resumeMimeTypes.pdf},${resumeMimeTypes.docx}`;
export const AVATAR_ACCEPT = ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";

export type FileCheckError =
  "missing" | "empty" | "too_large" | "unsupported_type" | "mismatched_content";

export const resumeFileMessages: Record<FileCheckError, string> = {
  missing: "Choose a file to upload.",
  empty: "This file is empty. Choose another file.",
  too_large: "This file is larger than 5 MB. Upload a smaller PDF or Word file.",
  unsupported_type: "Upload a PDF or Word (.docx) file.",
  mismatched_content:
    "This file does not look like a PDF or Word document. Export your resume again and upload the new file.",
};

export const avatarFileMessages: Record<FileCheckError, string> = {
  missing: "Choose an image to upload.",
  empty: "This image is empty. Choose another file.",
  too_large: "This image is larger than 2 MB. Choose a smaller image.",
  unsupported_type: "Upload a PNG, JPEG, or WebP image.",
  mismatched_content:
    "This file does not look like a PNG, JPEG, or WebP image. Choose another file.",
};

/** Declared types that say nothing about the file. */
const GENERIC_TYPES: ReadonlySet<string> = new Set(["", "application/octet-stream"]);

export interface FileBasics {
  name: string;
  size: number;
  /** The declared MIME type; browsers send an empty string for some files. */
  type: string;
}

export type FileCheck<Type extends string> =
  { ok: true; fileType: Type } | { ok: false; error: FileCheckError };

function extensionOf(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  return match?.[1]?.toLowerCase() ?? "";
}

function checkBasics<Type extends string>(
  file: FileBasics | null | undefined,
  maxBytes: number,
  extensions: Record<string, Type>,
  mimeTypes: Record<Type, string>,
): FileCheck<Type> {
  if (!file || file.name.trim() === "") return { ok: false, error: "missing" };
  const fileType = extensions[extensionOf(file.name)];
  if (!fileType) return { ok: false, error: "unsupported_type" };
  // Browsers send an empty or generic type when they do not know a file; the content check
  // decides then. Any other declared type must match the extension.
  if (!GENERIC_TYPES.has(file.type) && file.type !== mimeTypes[fileType]) {
    return { ok: false, error: "unsupported_type" };
  }
  if (file.size <= 0) return { ok: false, error: "empty" };
  if (file.size > maxBytes) return { ok: false, error: "too_large" };
  return { ok: true, fileType };
}

export function checkResumeBasics(file: FileBasics | null | undefined): FileCheck<ResumeFileType> {
  return checkBasics(file, RESUME_MAX_BYTES, { pdf: "pdf", docx: "docx" }, resumeMimeTypes);
}

export function checkAvatarBasics(file: FileBasics | null | undefined): FileCheck<AvatarFileType> {
  return checkBasics(
    file,
    AVATAR_MAX_BYTES,
    { png: "png", jpg: "jpg", jpeg: "jpg", webp: "webp" },
    avatarMimeTypes,
  );
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/** Identifies a resume from its bytes: a PDF header, or a ZIP that is a Word document. */
export function detectResumeContent(bytes: Uint8Array): ResumeFileType | null {
  if (startsWith(bytes, PDF_SIGNATURE)) return "pdf";
  const entries = readZipEntries(bytes);
  if (!entries) return null;
  const names = new Set(entries.map((entry) => entry.name));
  return names.has("[Content_Types].xml") && names.has("word/document.xml") ? "docx" : null;
}

/** Identifies a profile photo from its bytes. */
export function detectAvatarContent(bytes: Uint8Array): AvatarFileType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "webp";
  }
  return null;
}

/** Full server-side check: name, size, declared type, and content must all agree. */
export function validateResumeUpload(
  file: FileBasics,
  bytes: Uint8Array,
): FileCheck<ResumeFileType> {
  const basics = checkResumeBasics({ ...file, size: bytes.length });
  if (!basics.ok) return basics;
  return detectResumeContent(bytes) === basics.fileType
    ? basics
    : { ok: false, error: "mismatched_content" };
}

export function validateAvatarUpload(
  file: FileBasics,
  bytes: Uint8Array,
): FileCheck<AvatarFileType> {
  const basics = checkAvatarBasics({ ...file, size: bytes.length });
  if (!basics.ok) return basics;
  return detectAvatarContent(bytes) === basics.fileType
    ? basics
    : { ok: false, error: "mismatched_content" };
}

const UNSAFE_NAME_CHARACTERS = /[\u0000-\u001F\u007F<>:"/\\|?*]/g;

/**
 * The name shown to the candidate: no folders, control or reserved characters, at most 255
 * characters, and always ending in the real extension.
 */
export function safeDisplayName(name: string, fileType: ResumeFileType): string {
  const base = (name.split(/[\\/]/).pop() ?? "")
    .replace(UNSAFE_NAME_CHARACTERS, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.[a-z0-9]+$/i, "");
  const extension = `.${fileType}`;
  const stem = (base || "resume").slice(0, 255 - extension.length).trim();
  return `${stem || "resume"}${extension}`;
}

/** File sizes for people: "312 KB", "1.4 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
}
