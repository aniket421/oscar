import "server-only";

import { DataAccessError, logDataError } from "@/server/candidate/errors";
import {
  deleteResumeRow,
  getResume,
  insertResume,
  listResumeFiles,
} from "@/server/candidate/resume-repository";
import {
  downloadObject,
  removeObjects,
  removeOrphanedResumeObjects,
  RESUME_BUCKET,
  resumeObjectPath,
  uploadObject,
} from "@/server/candidate/storage";
import type { ServerSupabaseClient } from "@/server/supabase/server-client";
import type { Resume } from "@/types/candidate";

import { processResume } from "../processing/run";
import {
  resumeMimeTypes,
  safeDisplayName,
  validateResumeUpload,
  type FileCheckError,
} from "../resume-file";

/**
 * Resume lifecycle: store, replace, delete, and reprocess, in an order that never leaves a file
 * without metadata or metadata without a file. See docs/candidate-intelligence.md, section 4.
 */

export type StoreResumeResult =
  | { ok: true; resume: Resume; bytes: Uint8Array }
  | { ok: false; error: FileCheckError | "storage" | "database" };

export interface IncomingFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

/**
 * Validates and stores a new resume, which becomes the current one. Older resumes are removed
 * only after the new one is safely stored.
 */
export async function storeResume(
  db: ServerSupabaseClient,
  userId: string,
  file: IncomingFile,
): Promise<StoreResumeResult> {
  const check = validateResumeUpload(
    { name: file.name, type: file.type, size: file.bytes.length },
    file.bytes,
  );
  if (!check.ok) return check;

  const id = crypto.randomUUID();
  const storagePath = resumeObjectPath(userId, id, check.fileType);

  try {
    await uploadObject(db, RESUME_BUCKET, storagePath, file.bytes, resumeMimeTypes[check.fileType]);
  } catch (error) {
    logDataError("resume.upload.object", error);
    return { ok: false, error: "storage" };
  }

  let resume: Resume;
  try {
    resume = await insertResume(db, {
      id,
      userId,
      fileName: safeDisplayName(file.name, check.fileType),
      storagePath,
      fileType: check.fileType,
      fileSize: file.bytes.length,
    });
  } catch (error) {
    logDataError("resume.upload.row", error);
    // Without its row the file would be an orphan: remove it before reporting the failure.
    await removeObjects(db, RESUME_BUCKET, [storagePath]).catch((cleanupError: unknown) =>
      logDataError("resume.upload.rollback", cleanupError),
    );
    return { ok: false, error: "database" };
  }

  await removeOtherResumes(db, userId, id);
  return { ok: true, resume, bytes: file.bytes };
}

/**
 * Removes every resume except `keepId` (file first, then row), then any stored file that has no
 * row. Failures are logged and retried on the next upload or delete; they never undo the
 * caller's work.
 */
export async function removeOtherResumes(
  db: ServerSupabaseClient,
  userId: string,
  keepId: string | null,
): Promise<void> {
  try {
    const remaining = new Set<string>();
    for (const file of await listResumeFiles(db, userId)) {
      if (file.id === keepId) {
        remaining.add(file.id);
        continue;
      }
      try {
        await removeObjects(db, RESUME_BUCKET, [file.storagePath]);
        await deleteResumeRow(db, userId, file.id);
      } catch (error) {
        remaining.add(file.id);
        logDataError("resume.cleanup.previous", error);
      }
    }
    await removeOrphanedResumeObjects(db, userId, remaining);
  } catch (error) {
    logDataError("resume.cleanup", error);
  }
}

/**
 * Deletes a resume: the file first, then its row (its parse and analyses cascade). If the file
 * cannot be removed nothing is deleted, so the candidate can retry; removing a file that is
 * already gone succeeds, so a retry after a partial failure completes the deletion.
 */
export async function deleteResume(
  db: ServerSupabaseClient,
  userId: string,
  resumeId: string,
): Promise<void> {
  const resume = await getResume(db, userId, resumeId);
  if (!resume) throw new DataAccessError("not_found");
  await removeObjects(db, RESUME_BUCKET, [resumeObjectPath(userId, resume.id, resume.fileType)]);
  await deleteResumeRow(db, userId, resume.id);
  await removeOtherResumes(db, userId, null);
}

/** Runs the processing pipeline on a stored resume, reading the file back from storage. */
export async function reprocessResume(
  db: ServerSupabaseClient,
  userId: string,
  resume: Resume,
): Promise<void> {
  await processResume({
    db,
    userId,
    resumeId: resume.id,
    fileType: resume.fileType,
    loadFile: () =>
      downloadObject(db, RESUME_BUCKET, resumeObjectPath(userId, resume.id, resume.fileType)),
  });
}

/** Reads the current resume file for its owner (for download). */
export async function readResumeFile(
  db: ServerSupabaseClient,
  userId: string,
  resume: Resume,
): Promise<Uint8Array<ArrayBuffer>> {
  return downloadObject(db, RESUME_BUCKET, resumeObjectPath(userId, resume.id, resume.fileType));
}
