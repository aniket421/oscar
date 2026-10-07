// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signOut = vi.fn();
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn(() => ({ auth: { signOut } })) }));

const { POST } = await import("@/app/auth/logout/route");

function logoutRequest(headers: Record<string, string>) {
  return new NextRequest("http://localhost:3000/auth/logout", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      cookie: "sb-proj-auth-token=abc; sb-proj-auth-token.1=def; theme=dark",
      ...headers,
    },
  });
}

beforeEach(() => {
  signOut.mockReset();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54329");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key-not-a-secret");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function expectExpired(
  cookie: { value: string; expires?: unknown; maxAge?: unknown; httpOnly?: boolean } | undefined,
) {
  expect(cookie?.value).toBe("");
  expect(cookie?.maxAge).toBe(0);
  expect(new Date(cookie?.expires as Date).getTime()).toBe(0);
  expect(cookie?.httpOnly).toBe(true);
}

describe("POST /auth/logout", () => {
  it("revokes the session, expires every session cookie, and redirects with a full page load", async () => {
    signOut.mockResolvedValue({ error: null });
    const response = await POST(logoutRequest({ origin: "http://localhost:3000" }));

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?notice=signed_out");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expectExpired(response.cookies.get("sb-proj-auth-token"));
    expectExpired(response.cookies.get("sb-proj-auth-token.1"));
    expect(response.cookies.get("theme")).toBeUndefined();
    expect(response.headers.get("set-cookie")).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it("still expires the cookies when the provider is unreachable", async () => {
    signOut.mockRejectedValue(new Error("offline"));
    const response = await POST(logoutRequest({ origin: "http://localhost:3000" }));
    expect(response.status).toBe(303);
    expectExpired(response.cookies.get("sb-proj-auth-token"));
  });

  it("refuses cross-site requests without touching the session", async () => {
    const response = await POST(logoutRequest({ origin: "https://evil.example" }));
    expect(response.status).toBe(403);
    expect(signOut).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
