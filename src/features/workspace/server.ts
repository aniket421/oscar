import "server-only";

import { getCurrentUser, requireUser } from "@/features/auth/server";
import { logDataError } from "@/server/candidate/errors";
import { getProfileSummary } from "@/server/candidate/profile-repository";
import { createSupabaseServerClient } from "@/server/supabase/server-client";

import { createDatabaseDataSource } from "./data/database-source";
import { loadWorkspaceSnapshot, type WorkspaceSnapshot } from "./data/snapshot";
import { unconnectedDataSource } from "./data/source";

// Server-only entry point of the workspace feature.
export { AreaPage } from "./components/area-page";
export { toUserProfile, type WorkspaceSnapshot } from "./data/snapshot";
export type { ProfileSummary, WorkspaceDataSource } from "./data/source";

/**
 * Verifies the user (redirecting to login if needed) and loads their workspace.
 * Every workspace page calls this, so no page renders user data unverified.
 */
export async function getWorkspaceSnapshot(path: string): Promise<WorkspaceSnapshot> {
  const user = await requireUser(path);
  const db = await createSupabaseServerClient();
  return loadWorkspaceSnapshot(user, db ? createDatabaseDataSource(db) : unconnectedDataSource);
}

export interface AccountSummary {
  displayName: string;
  email: string;
  /** URL of the profile photo, versioned by its id; null when there is none. */
  avatarSrc: string | null;
}

/**
 * Who is signed in, for the account menu. Profile details are optional extras here: if they
 * cannot be read, the menu falls back to the account's name instead of failing the page.
 */
export async function getAccountSummary(): Promise<AccountSummary | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  let fullName: string | null = null;
  let avatarId: string | null = null;
  try {
    const db = await createSupabaseServerClient();
    if (db) ({ fullName, avatarId } = await getProfileSummary(db, user.id));
  } catch (error) {
    logDataError("workspace.account", error);
  }
  return {
    displayName: fullName ?? user.name ?? user.email,
    email: user.email,
    avatarSrc: avatarId ? `/profile/avatar?v=${avatarId}` : null,
  };
}
