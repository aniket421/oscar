import "server-only";

import type {
  Resume,
  ResumeAnalysis,
  ResumeFileType,
  ResumeParse,
  ResumeProcessingError,
} from "@/types/candidate";

import type { ServerSupabaseClient } from "../supabase/server-client";
import { DataAccessError, toDataError } from "./errors";
import { toResume, toResumeAnalysis, toResumeParse } from "./mappers";

/**
 * Resume metadata, parse results, and analyses. Runs with the user's session (RLS applies) and
 * filters by `userId` on every query.
 */

/** The candidate's current resume: the newest one. */
export async function getCurrentResume(
  db: ServerSupabaseClient,
  userId: string,
): Promise<Resume | null> {
  const response = await db
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (response.error) throw toDataError(response.error, response.status);
  return response.data ? toResume(response.data) : null;
}

export async function getResume(
  db: ServerSupabaseClient,
  userId: string,
  resumeId: string,
): Promise<Resume | null> {
  const response = await db
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .eq("id", resumeId)
    .maybeSingle();
  if (response.error) throw toDataError(response.error, response.status);
  return response.data ? toResume(response.data) : null;
}

/** Every resume the candidate has, newest first, with where each file is stored. */
export async function listResumeFiles(
  db: ServerSupabaseClient,
  userId: string,
): Promise<Array<{ id: string; storagePath: string }>> {
  const response = await db
    .from("resumes")
    .select("id, storage_path")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (response.error) throw toDataError(response.error, response.status);
  return response.data.map((row) => ({ id: row.id, storagePath: row.storage_path }));
}

export async function getResumeStoragePath(
  db: ServerSupabaseClient,
  userId: string,
  resumeId: string,
): Promise<string | null> {
  const response = await db
    .from("resumes")
    .select("storage_path")
    .eq("user_id", userId)
    .eq("id", resumeId)
    .maybeSingle();
  if (response.error) throw toDataError(response.error, response.status);
  return response.data?.storage_path ?? null;
}

export async function insertResume(
  db: ServerSupabaseClient,
  resume: {
    id: string;
    userId: string;
    fileName: string;
    storagePath: string;
    fileType: ResumeFileType;
    fileSize: number;
  },
): Promise<Resume> {
  const response = await db
    .from("resumes")
    .insert({
      id: resume.id,
      user_id: resume.userId,
      file_name: resume.fileName,
      storage_path: resume.storagePath,
      file_type: resume.fileType,
      file_size: resume.fileSize,
      status: "uploaded",
    })
    .select("*")
    .single();
  if (response.error) throw toDataError(response.error, response.status);
  return toResume(response.data);
}

export type ResumeStatusChange =
  | { status: "processing" }
  | { status: "processed"; parsedVersion: number }
  | { status: "failed"; error: ResumeProcessingError };

export async function setResumeStatus(
  db: ServerSupabaseClient,
  userId: string,
  resumeId: string,
  change: ResumeStatusChange,
): Promise<void> {
  const values =
    change.status === "processing"
      ? { status: change.status, processing_error: null }
      : change.status === "processed"
        ? {
            status: change.status,
            processing_error: null,
            parsed_version: change.parsedVersion,
            processed_at: new Date().toISOString(),
          }
        : {
            status: change.status,
            processing_error: change.error,
            processed_at: new Date().toISOString(),
          };
  const response = await db
    .from("resumes")
    .update(values)
    .eq("id", resumeId)
    .eq("user_id", userId)
    .select("id");
  if (response.error) throw toDataError(response.error, response.status);
  if (response.data.length === 0) throw new DataAccessError("not_found");
}

export async function deleteResumeRow(
  db: ServerSupabaseClient,
  userId: string,
  resumeId: string,
): Promise<void> {
  const response = await db
    .from("resumes")
    .delete()
    .eq("id", resumeId)
    .eq("user_id", userId)
    .select("id");
  if (response.error) throw toDataError(response.error, response.status);
}

export async function getResumeParse(
  db: ServerSupabaseClient,
  userId: string,
  resumeId: string,
): Promise<ResumeParse | null> {
  const response = await db
    .from("resume_parses")
    .select("*")
    .eq("user_id", userId)
    .eq("resume_id", resumeId)
    .maybeSingle();
  if (response.error) throw toDataError(response.error, response.status);
  return response.data ? toResumeParse(response.data) : null;
}

export async function saveResumeParse(
  db: ServerSupabaseClient,
  userId: string,
  parse: ResumeParse,
): Promise<void> {
  const response = await db.from("resume_parses").upsert(
    {
      resume_id: parse.resumeId,
      user_id: userId,
      parser_version: parse.parserVersion,
      email: parse.email,
      phone: parse.phone,
      links: parse.links,
      summary: parse.summary,
      detected_sections: parse.detectedSections,
      skill_names: parse.skillNames,
      word_count: parse.wordCount,
      page_count: parse.pageCount,
    },
    { onConflict: "resume_id" },
  );
  if (response.error) throw toDataError(response.error, response.status);
}

/** The newest analysis of a resume. Nothing writes analyses yet, so this is null for everyone. */
export async function getLatestResumeAnalysis(
  db: ServerSupabaseClient,
  userId: string,
  resumeId: string,
): Promise<ResumeAnalysis | null> {
  const response = await db
    .from("resume_analyses")
    .select("*")
    .eq("user_id", userId)
    .eq("resume_id", resumeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (response.error) throw toDataError(response.error, response.status);
  return response.data ? toResumeAnalysis(response.data) : null;
}
