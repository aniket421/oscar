// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { isProtectedPath } from "@/features/auth/routes";
import { availability } from "@/features/workspace/availability";
import { loadWorkspaceSnapshot, toUserProfile } from "@/features/workspace/data/snapshot";
import { unconnectedDataSource, type WorkspaceDataSource } from "@/features/workspace/data/source";
import {
  findNavLocation,
  isActiveHref,
  workspaceNavigation,
} from "@/features/workspace/navigation";
import { derivePreparationSteps } from "@/features/workspace/preparation";

import { emptySnapshot, populatedSnapshot } from "../fixtures/workspace";

const authUser = {
  id: "user-42",
  email: "ada@example.com",
  name: "Ada Lovelace",
  createdAt: "2026-03-01T00:00:00.000Z",
};

describe("workspace navigation", () => {
  const items = workspaceNavigation.flatMap((group) => group.items);

  it.each(items.map((item) => [item.href]))("protects %s", (href) => {
    expect(isProtectedPath(href)).toBe(true);
  });

  it("has unique destinations", () => {
    expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
  });

  it("matches pages and their sub-pages only", () => {
    expect(isActiveHref("/interviews", "/interviews")).toBe(true);
    expect(isActiveHref("/interviews/new", "/interviews")).toBe(true);
    expect(isActiveHref("/interviewsx", "/interviews")).toBe(false);
  });

  it("locates the current page for the header context line", () => {
    expect(findNavLocation("/practice/coding")).toMatchObject({
      group: { label: "Preparation" },
      item: { label: "Coding" },
    });
    expect(findNavLocation("/interviews/new")?.item.label).toBe("Interviews");
    expect(findNavLocation("/unknown")).toBeNull();
  });
});

describe("availability", () => {
  it("marks every Phase 3 capability as not yet available", () => {
    expect(Object.values(availability).every((value) => value === false)).toBe(true);
  });
});

describe("loadWorkspaceSnapshot", () => {
  it("returns an honest empty workspace while no storage exists", async () => {
    const snapshot = await loadWorkspaceSnapshot(authUser);
    expect(snapshot).toEqual({
      profile: toUserProfile(authUser),
      recentInterviews: [],
      resume: null,
      roadmap: null,
      practice: { technical: [], behavioral: [], coding: [] },
    });
  });

  it("scopes every query to the verified user's id", async () => {
    const source: WorkspaceDataSource = {
      listRecentInterviews: vi.fn(unconnectedDataSource.listRecentInterviews),
      getResume: vi.fn(unconnectedDataSource.getResume),
      getRoadmap: vi.fn(unconnectedDataSource.getRoadmap),
      listPracticeSessions: vi.fn(unconnectedDataSource.listPracticeSessions),
    };
    await loadWorkspaceSnapshot(authUser, source);
    expect(source.listRecentInterviews).toHaveBeenCalledWith("user-42", 5);
    expect(source.getResume).toHaveBeenCalledWith("user-42");
    expect(source.getRoadmap).toHaveBeenCalledWith("user-42");
    for (const kind of ["technical", "behavioral", "coding"]) {
      expect(source.listPracticeSessions).toHaveBeenCalledWith("user-42", kind);
    }
  });

  it("maps the auth user to a profile without inventing preferences", () => {
    expect(toUserProfile(authUser)).toEqual({
      ...authUser,
      targetRole: null,
      experienceLevel: null,
    });
  });
});

describe("derivePreparationSteps", () => {
  it("reports every step as not started when there is no data", () => {
    const steps = derivePreparationSteps(emptySnapshot());
    expect(steps.map((step) => step.id)).toEqual(["resume", "interview", "feedback", "roadmap"]);
    expect(steps.every((step) => step.state === "not_started")).toBe(true);
    expect(steps.every((step) => step.available === false)).toBe(true);
  });

  it("derives completion only from stored records", () => {
    const steps = derivePreparationSteps(populatedSnapshot());
    expect(steps.every((step) => step.state === "complete")).toBe(true);
  });

  it("does not count unfinished interviews", () => {
    const snapshot = populatedSnapshot();
    const unfinished = {
      ...snapshot,
      recentInterviews: snapshot.recentInterviews.map((interview) => ({
        ...interview,
        status: "in_progress" as const,
        completedAt: null,
      })),
    };
    const steps = derivePreparationSteps(unfinished);
    expect(steps.find((step) => step.id === "interview")?.state).toBe("not_started");
  });
});
