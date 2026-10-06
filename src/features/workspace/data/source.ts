import "server-only";

import type {
  ExperienceLevel,
  Interview,
  PracticeKind,
  PracticeSession,
  Resume,
  Roadmap,
} from "@/types/domain";

/** Profile facts the workspace shows (from the candidate profile, Phase 4). */
export interface ProfileSummary {
  fullName: string | null;
  avatarId: string | null;
  experienceLevel: ExperienceLevel | null;
  targetRole: string | null;
}

/**
 * Read access to a user's workspace data. Pages depend only on this interface;
 * `createDatabaseDataSource` reads what exists in storage today.
 */
export interface WorkspaceDataSource {
  listRecentInterviews(userId: string, limit: number): Promise<readonly Interview[]>;
  getProfileSummary(userId: string): Promise<ProfileSummary | null>;
  getResume(userId: string): Promise<Resume | null>;
  getRoadmap(userId: string): Promise<Roadmap | null>;
  listPracticeSessions(userId: string, kind: PracticeKind): Promise<readonly PracticeSession[]>;
}

/**
 * A source with no storage behind it (Supabase not configured): every user
 * truthfully has no data. This is not sample data.
 */
export const unconnectedDataSource: WorkspaceDataSource = {
  async listRecentInterviews() {
    return [];
  },
  async getProfileSummary() {
    return null;
  },
  async getResume() {
    return null;
  },
  async getRoadmap() {
    return null;
  },
  async listPracticeSessions() {
    return [];
  },
};
