// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const getCurrentUser = vi.fn();
vi.mock("@/features/auth/server", () => ({ requireUser, getCurrentUser }));
// No Supabase project in unit tests: the workspace falls back to its empty data source.
vi.mock("@/server/supabase/server-client", () => ({
  createSupabaseServerClient: async () => null,
}));

const { getWorkspaceSnapshot } = await import("@/features/workspace/server");

beforeEach(() => {
  requireUser.mockReset();
});

describe("getWorkspaceSnapshot", () => {
  it("verifies the session with the page path before loading anything", async () => {
    requireUser.mockRejectedValue(new Error("REDIRECT /login?next=%2Fresume"));
    await expect(getWorkspaceSnapshot("/resume")).rejects.toThrow("REDIRECT /login?next=%2Fresume");
    expect(requireUser).toHaveBeenCalledWith("/resume");
  });

  it("loads the verified user's workspace", async () => {
    requireUser.mockResolvedValue({ id: "u1", email: "a@b.co", name: null, createdAt: null });
    const snapshot = await getWorkspaceSnapshot("/dashboard");
    expect(snapshot.profile).toMatchObject({ id: "u1", email: "a@b.co" });
    expect(snapshot.recentInterviews).toEqual([]);
  });
});
