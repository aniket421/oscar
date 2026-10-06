// @vitest-environment node

import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();

vi.mock("@/server/supabase/server-client", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

const { requireUser, toAuthUser } = await import("@/features/auth/session");

const user = {
  id: "user-1",
  email: "ada@example.com",
  user_metadata: { full_name: "  Ada Lovelace " },
} as unknown as User;

beforeEach(() => {
  getUser.mockReset();
});

describe("toAuthUser", () => {
  it("exposes only id, email, and name", () => {
    expect(toAuthUser(user)).toEqual({
      id: "user-1",
      email: "ada@example.com",
      name: "Ada Lovelace",
    });
  });

  it("handles a missing name", () => {
    expect(toAuthUser({ ...user, user_metadata: {} } as User).name).toBeNull();
  });
});

describe("requireUser", () => {
  it("returns the verified user", async () => {
    getUser.mockResolvedValue({ data: { user }, error: null });
    await expect(requireUser("/app")).resolves.toMatchObject({ id: "user-1" });
  });

  it("redirects to login when the session is invalid", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { status: 403, code: "session_not_found" },
    });
    await expect(requireUser("/app/reports")).rejects.toThrow(
      "REDIRECT /login?next=%2Fapp%2Freports",
    );
  });
});
