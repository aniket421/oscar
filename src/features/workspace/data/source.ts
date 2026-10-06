import "server-only";

import type { Interview, PracticeKind, PracticeSession, Resume, Roadmap } from "@/types/domain";

/**
 * Read access to a user's workspace data. The database phase provides the real
 * implementation; pages depend only on this interface.
 */
export interface WorkspaceDataSource {
  listRecentInterviews(userId: string, limit: number): Promise<readonly Interview[]>;
  getResume(userId: string): Promise<Resume | null>;
  getRoadmap(userId: string): Promise<Roadmap | null>;
  listPracticeSessions(userId: string, kind: PracticeKind): Promise<readonly PracticeSession[]>;
}

/**
 * The current source: no storage exists yet, so every user truthfully has no
 * interviews, resume, roadmap, or practice history. This is not sample data.
 */
export const unconnectedDataSource: WorkspaceDataSource = {
  async listRecentInterviews() {
    return [];
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
