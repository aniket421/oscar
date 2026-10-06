/**
 * TEST FIXTURES ONLY. Example workspace records used to check that components
 * render real data correctly once it exists. Never imported by application code.
 */
import type { WorkspaceSnapshot } from "@/features/workspace/data/snapshot";
import type { Interview, UserProfile } from "@/types/domain";

export const fixtureProfile: UserProfile = {
  id: "user-fixture",
  email: "fixture.user@example.test",
  name: "Fixture User",
  createdAt: "2026-01-15T10:00:00.000Z",
  targetRole: null,
  experienceLevel: null,
};

export function emptySnapshot(profile: UserProfile = fixtureProfile): WorkspaceSnapshot {
  return {
    profile,
    recentInterviews: [],
    resume: null,
    roadmap: null,
    practice: { technical: [], behavioral: [], coding: [] },
  };
}

export const fixtureInterview: Interview = {
  id: "interview-fixture",
  userId: fixtureProfile.id,
  config: {
    role: "Fixture Role",
    experienceLevel: "mid",
    type: "behavioral",
    format: "voice",
    questionCount: 6,
  },
  status: "completed",
  createdAt: "2026-02-01T09:00:00.000Z",
  completedAt: "2026-02-01T09:40:00.000Z",
};

export function populatedSnapshot(): WorkspaceSnapshot {
  return {
    ...emptySnapshot(),
    recentInterviews: [fixtureInterview],
    resume: {
      id: "resume-fixture",
      userId: fixtureProfile.id,
      fileName: "fixture-resume.pdf",
      uploadedAt: "2026-01-20T12:00:00.000Z",
      status: "ready",
    },
    roadmap: {
      id: "roadmap-fixture",
      userId: fixtureProfile.id,
      generatedAt: "2026-02-02T08:00:00.000Z",
      steps: [
        { id: "s1", title: "Fixture step one", description: "", skillId: null, status: "done" },
        { id: "s2", title: "Fixture step two", description: "", skillId: null, status: "todo" },
      ],
    },
    practice: {
      technical: [
        {
          id: "p1",
          userId: fixtureProfile.id,
          kind: "technical",
          skillIds: [],
          startedAt: "2026-02-03T10:00:00.000Z",
          completedAt: "2026-02-03T10:20:00.000Z",
        },
      ],
      behavioral: [],
      coding: [],
    },
  };
}
