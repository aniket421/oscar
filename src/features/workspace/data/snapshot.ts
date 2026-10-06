import "server-only";

import type { AuthUser } from "@/features/auth/server";
import type {
  Interview,
  PracticeKind,
  PracticeSession,
  Resume,
  Roadmap,
  UserProfile,
} from "@/types/domain";

import { unconnectedDataSource, type ProfileSummary, type WorkspaceDataSource } from "./source";

/** Everything the dashboard needs, loaded for one verified user. */
export interface WorkspaceSnapshot {
  profile: UserProfile;
  recentInterviews: readonly Interview[];
  resume: Resume | null;
  roadmap: Roadmap | null;
  practice: Record<PracticeKind, readonly PracticeSession[]>;
}

export const RECENT_INTERVIEW_LIMIT = 5;

/** The signed-in person: the profile's name when set, otherwise the account's. */
export function toUserProfile(user: AuthUser, summary: ProfileSummary | null = null): UserProfile {
  return {
    id: user.id,
    email: user.email,
    name: summary?.fullName ?? user.name,
    createdAt: user.createdAt,
    targetRole: summary?.targetRole ?? null,
    experienceLevel: summary?.experienceLevel ?? null,
  };
}

/**
 * Loads the workspace for a user who has already been verified by the caller
 * (`requireUser`). Queries are scoped to that user's id only.
 */
export async function loadWorkspaceSnapshot(
  user: AuthUser,
  source: WorkspaceDataSource = unconnectedDataSource,
): Promise<WorkspaceSnapshot> {
  const [summary, recentInterviews, resume, roadmap, technical, behavioral, coding] =
    await Promise.all([
      source.getProfileSummary(user.id),
      source.listRecentInterviews(user.id, RECENT_INTERVIEW_LIMIT),
      source.getResume(user.id),
      source.getRoadmap(user.id),
      source.listPracticeSessions(user.id, "technical"),
      source.listPracticeSessions(user.id, "behavioral"),
      source.listPracticeSessions(user.id, "coding"),
    ]);

  return {
    profile: toUserProfile(user, summary),
    recentInterviews,
    resume,
    roadmap,
    practice: { technical, behavioral, coding },
  };
}
