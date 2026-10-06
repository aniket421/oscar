import "server-only";

import { getProfileSummary } from "@/server/candidate/profile-repository";
import { getCurrentResume } from "@/server/candidate/resume-repository";
import type { ServerSupabaseClient } from "@/server/supabase/server-client";

import { unconnectedDataSource, type WorkspaceDataSource } from "./source";

/**
 * Workspace data from the database, read with the user's own session (RLS applies). Profile and
 * resume exist since Phase 4; interviews, roadmaps, and practice are not stored yet, so they are
 * truthfully empty.
 */
export function createDatabaseDataSource(db: ServerSupabaseClient): WorkspaceDataSource {
  return {
    ...unconnectedDataSource,
    getProfileSummary: (userId) => getProfileSummary(db, userId),
    getResume: (userId) => getCurrentResume(db, userId),
  };
}
