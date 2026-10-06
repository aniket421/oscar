import "server-only";

import type { ResumeFileType } from "@/types/candidate";

import type { ServerSupabaseClient } from "../supabase/server-client";
import { toDataError } from "./errors";

/**
 * Private file storage for resumes and profile photos (Supabase Storage). Objects are only ever
 * reached with the user's session, so storage policies limit each user to their own folder.
 * No public or signed URLs are created: files reach the browser through authenticated Route
 * Handlers only.
 */

export const RESUME_BUCKET = "resumes";
export const AVATAR_BUCKET = "avatars";

export type Bucket = typeof RESUME_BUCKET | typeof AVATAR_BUCKET;

export function resumeObjectPath(userId: string, resumeId: string, fileType: ResumeFileType) {
  return `user/${userId}/resume/${resumeId}/original.${fileType}`;
}

export function avatarObjectPath(
  userId: string,
  avatarId: string,
  extension: "png" | "jpg" | "webp",
) {
  return `user/${userId}/avatar/${avatarId}.${extension}`;
}

export async function uploadObject(
  db: ServerSupabaseClient,
  bucket: Bucket,
  path: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  const { error } = await db.storage
    .from(bucket)
    .upload(path, bytes, { contentType, upsert: false, cacheControl: "0" });
  if (error) throw toDataError(error);
}

export async function downloadObject(
  db: ServerSupabaseClient,
  bucket: Bucket,
  path: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const { data, error } = await db.storage.from(bucket).download(path);
  if (error) throw toDataError(error);
  return new Uint8Array(await data.arrayBuffer());
}

/** Removes objects. Removing an object that no longer exists is not an error. */
export async function removeObjects(
  db: ServerSupabaseClient,
  bucket: Bucket,
  paths: readonly string[],
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await db.storage.from(bucket).remove([...paths]);
  if (error) throw toDataError(error);
}

/** Names directly inside a folder (files and subfolders), up to `limit`. */
export async function listFolder(
  db: ServerSupabaseClient,
  bucket: Bucket,
  folder: string,
  limit = 100,
): Promise<string[]> {
  const { data, error } = await db.storage.from(bucket).list(folder, { limit });
  if (error) throw toDataError(error);
  return data.map((entry) => entry.name);
}

/**
 * Removes resume files that have no metadata row (for example after an interrupted upload).
 * `keepIds` are resume ids that still exist.
 */
export async function removeOrphanedResumeObjects(
  db: ServerSupabaseClient,
  userId: string,
  keepIds: ReadonlySet<string>,
): Promise<number> {
  const folder = `user/${userId}/resume`;
  const orphans: string[] = [];
  for (const resumeId of await listFolder(db, RESUME_BUCKET, folder)) {
    if (keepIds.has(resumeId)) continue;
    for (const name of await listFolder(db, RESUME_BUCKET, `${folder}/${resumeId}`)) {
      orphans.push(`${folder}/${resumeId}/${name}`);
    }
  }
  await removeObjects(db, RESUME_BUCKET, orphans);
  return orphans.length;
}
