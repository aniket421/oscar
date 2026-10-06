import "server-only";

import { requireUser } from "@/features/auth/server";

import { loadWorkspaceSnapshot, type WorkspaceSnapshot } from "./data/snapshot";

// Server-only entry point of the workspace feature.
export { AreaPage } from "./components/area-page";
export { toUserProfile, type WorkspaceSnapshot } from "./data/snapshot";
export type { WorkspaceDataSource } from "./data/source";

/**
 * Verifies the user (redirecting to login if needed) and loads their workspace.
 * Every workspace page calls this, so no page renders user data unverified.
 */
export async function getWorkspaceSnapshot(path: string): Promise<WorkspaceSnapshot> {
  const user = await requireUser(path);
  return loadWorkspaceSnapshot(user);
}
