import "server-only";

import { after } from "next/server";

import { isSameOriginRequest } from "@/features/auth";
import { getCurrentUser } from "@/features/auth/server";
import { logDataError } from "@/server/candidate/errors";
import { getProfileIdentity, setAvatarPath } from "@/server/candidate/profile-repository";
import { getCurrentResume } from "@/server/candidate/resume-repository";
import {
  AVATAR_BUCKET,
  avatarObjectPath,
  downloadObject,
  removeObjects,
  uploadObject,
} from "@/server/candidate/storage";

import { processResume } from "../processing/run";
import {
  AVATAR_MAX_BYTES,
  avatarFileMessages,
  avatarMimeTypes,
  checkAvatarBasics,
  checkResumeBasics,
  RESUME_MAX_BYTES,
  resumeFileMessages,
  resumeMimeTypes,
  validateAvatarUpload,
  type AvatarFileType,
  type FileCheckError,
} from "../resume-file";
import { getCandidateDb } from "./load";
import { readResumeFile, storeResume } from "./resume-service";

/*
 * Route Handlers for files: uploads need progress events (XMLHttpRequest), and downloads must be
 * streamed by Oscar so storage URLs never reach the browser. Each handler verifies the session
 * itself; uploads also require a same-origin request (Server Actions get this check from Next.js,
 * Route Handlers do not).
 */

/** Room for multipart boundaries and headers around the file itself. */
const MULTIPART_OVERHEAD = 64 * 1024;

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

export interface UploadErrorBody {
  error: FileCheckError | "forbidden" | "unauthorized" | "unavailable" | "invalid_request";
  message: string;
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: privateHeaders });
}

function uploadError(error: UploadErrorBody["error"], message: string, status: number): Response {
  return json({ error, message } satisfies UploadErrorBody, status);
}

function fileCheckStatus(error: FileCheckError): number {
  return error === "too_large" ? 413 : error === "unsupported_type" ? 415 : 400;
}

const sessionEnded = "Your session has ended. Log in again, then upload your file.";
const unavailable = "Oscar could not store your file right now. Try again in a moment.";

/** Reads the one file field of a multipart upload, enforcing a size limit before buffering. */
async function readUploadedFile(
  request: Request,
  maxBytes: number,
): Promise<{ file: File } | { error: "too_large" | "missing" }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes + MULTIPART_OVERHEAD) return { error: "too_large" };
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { error: "missing" };
  }
  const file = form.get("file");
  return file instanceof File ? { file } : { error: "missing" };
}

/** POST /resume/upload: validate, store, record, and start processing a new resume. */
export async function handleResumeUpload(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request.headers, request.url)) {
    return uploadError("forbidden", "This upload was not sent from Oscar.", 403);
  }
  const user = await getCurrentUser();
  if (!user) return uploadError("unauthorized", sessionEnded, 401);

  const upload = await readUploadedFile(request, RESUME_MAX_BYTES);
  if ("error" in upload) {
    return uploadError(
      upload.error,
      resumeFileMessages[upload.error],
      fileCheckStatus(upload.error),
    );
  }
  const basics = checkResumeBasics(upload.file);
  if (!basics.ok) {
    return uploadError(
      basics.error,
      resumeFileMessages[basics.error],
      fileCheckStatus(basics.error),
    );
  }

  const db = await getCandidateDb();
  const bytes = new Uint8Array(await upload.file.arrayBuffer());
  const result = await storeResume(db, user.id, {
    name: upload.file.name,
    type: upload.file.type,
    bytes,
  });
  if (!result.ok) {
    return result.error === "storage" || result.error === "database"
      ? uploadError("unavailable", unavailable, 503)
      : uploadError(result.error, resumeFileMessages[result.error], fileCheckStatus(result.error));
  }

  const { resume } = result;
  // Processing runs after the response is sent; the page shows its progress.
  after(() =>
    processResume({
      db,
      userId: user.id,
      resumeId: resume.id,
      fileType: resume.fileType,
      loadFile: async () => result.bytes,
    }),
  );
  return json({ resume: { id: resume.id, status: resume.status } }, 201);
}

/** RFC 6266 attachment header with an ASCII fallback and the UTF-8 name. */
export function attachmentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/** GET /resume/file: the current resume, for its owner only, never cached. */
export async function handleResumeDownload(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in.", { status: 401, headers: privateHeaders });
  const db = await getCandidateDb();
  try {
    const resume = await getCurrentResume(db, user.id);
    if (!resume) return new Response("No resume.", { status: 404, headers: privateHeaders });
    const bytes = await readResumeFile(db, user.id, resume);
    return new Response(bytes, {
      headers: {
        ...privateHeaders,
        "Content-Type": resumeMimeTypes[resume.fileType],
        "Content-Length": String(bytes.length),
        "Content-Disposition": attachmentDisposition(resume.fileName),
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    logDataError("resume.download", error);
    return new Response("Unavailable.", { status: 503, headers: privateHeaders });
  }
}

/** POST /profile/avatar: replace the profile photo. */
export async function handleAvatarUpload(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request.headers, request.url)) {
    return uploadError("forbidden", "This upload was not sent from Oscar.", 403);
  }
  const user = await getCurrentUser();
  if (!user) return uploadError("unauthorized", sessionEnded, 401);

  const upload = await readUploadedFile(request, AVATAR_MAX_BYTES);
  if ("error" in upload) {
    return uploadError(
      upload.error,
      avatarFileMessages[upload.error],
      fileCheckStatus(upload.error),
    );
  }
  const basics = checkAvatarBasics(upload.file);
  if (!basics.ok) {
    return uploadError(
      basics.error,
      avatarFileMessages[basics.error],
      fileCheckStatus(basics.error),
    );
  }
  const bytes = new Uint8Array(await upload.file.arrayBuffer());
  const check = validateAvatarUpload(
    { name: upload.file.name, type: upload.file.type, size: bytes.length },
    bytes,
  );
  if (!check.ok) {
    return uploadError(check.error, avatarFileMessages[check.error], fileCheckStatus(check.error));
  }

  const db = await getCandidateDb();
  const avatarId = crypto.randomUUID();
  const path = avatarObjectPath(user.id, avatarId, check.fileType);
  try {
    await uploadObject(db, AVATAR_BUCKET, path, bytes, avatarMimeTypes[check.fileType]);
  } catch (error) {
    logDataError("profile.avatar.upload", error);
    return uploadError("unavailable", unavailable, 503);
  }

  let previous: string | null;
  try {
    previous = await setAvatarPath(db, user.id, path);
  } catch (error) {
    logDataError("profile.avatar.save", error);
    await removeObjects(db, AVATAR_BUCKET, [path]).catch((cleanup: unknown) =>
      logDataError("profile.avatar.rollback", cleanup),
    );
    return uploadError("unavailable", unavailable, 503);
  }
  if (previous && previous !== path) {
    await removeObjects(db, AVATAR_BUCKET, [previous]).catch((cleanup: unknown) =>
      logDataError("profile.avatar.previous", cleanup),
    );
  }
  return json({ avatarId }, 201);
}

const avatarTypes: Record<string, AvatarFileType> = { png: "png", jpg: "jpg", webp: "webp" };

/** GET /profile/avatar: the current profile photo, revalidated on every use. */
export async function handleAvatarDownload(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401, headers: privateHeaders });
  const db = await getCandidateDb();
  try {
    const identity = await getProfileIdentity(db, user.id);
    const path = identity?.avatarPath;
    const fileType = path ? avatarTypes[path.slice(path.lastIndexOf(".") + 1)] : undefined;
    if (!path || !fileType) return new Response(null, { status: 404, headers: privateHeaders });

    const etag = `"${path.slice(path.lastIndexOf("/") + 1)}"`;
    const headers = {
      "Cache-Control": "private, no-cache",
      "X-Content-Type-Options": "nosniff",
      ETag: etag,
    };
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers });
    }
    const bytes = await downloadObject(db, AVATAR_BUCKET, path);
    return new Response(bytes, {
      headers: { ...headers, "Content-Type": avatarMimeTypes[fileType] },
    });
  } catch (error) {
    logDataError("profile.avatar.download", error);
    return new Response(null, { status: 503, headers: privateHeaders });
  }
}
