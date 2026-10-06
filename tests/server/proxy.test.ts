// @vitest-environment node

import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser } })),
}));

const { config, proxy } = await import("@/proxy");
const { protectedPrefixes } = await import("@/features/auth/routes");
const { isAuthCookieName } = await import("@/server/supabase/cookies");

beforeEach(() => {
  getUser.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function configure() {
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54329");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-key-not-a-secret");
}

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: cookie ? { cookie } : {},
  });
}

describe("proxy matcher", () => {
  it.each(["/login", "/signup", "/interviews/new", "/practice/coding"])("runs on %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });

  it.each(protectedPrefixes)("covers every protected area: %s and its children", (prefix) => {
    expect(unstable_doesMiddlewareMatch({ config, url: prefix })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: `${prefix}/nested/page` })).toBe(true);
  });

  it.each(["/", "/privacy", "/terms", "/api/health", "/_next/static/chunk.js", "/dashboards"])(
    "skips %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    },
  );
});

describe("proxy", () => {
  it("redirects anonymous visitors from the workspace to login without calling the provider", async () => {
    configure();
    const response = await proxy(request("/interviews/new?id=2"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Finterviews%2Fnew%3Fid%3D2",
    );
    expect(getUser).not.toHaveBeenCalled();
  });

  it("lets a verified user through", async () => {
    configure();
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const response = await proxy(request("/dashboard", "sb-proj-auth-token=valid"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("sends a verified user from login to the workspace", async () => {
    configure();
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const response = await proxy(request("/login", "sb-proj-auth-token=valid"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("explains a rejected session and clears its cookies", async () => {
    configure();
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthApiError", status: 403, code: "session_not_found" },
    });
    const response = await proxy(request("/dashboard", "sb-proj-auth-token=stale; theme=dark"));
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?notice=session_expired",
    );
    const cleared = response.cookies.get("sb-proj-auth-token");
    expect(cleared?.value).toBe("");
    expect(cleared?.httpOnly).toBe(true);
    // Must actually expire, not become an empty session cookie.
    expect(cleared?.maxAge).toBe(0);
    expect(response.headers.get("set-cookie")).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(response.cookies.get("theme")).toBeUndefined();
  });

  it("keeps the session when the provider is unreachable", async () => {
    configure();
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthRetryableFetchError", status: 0 },
    });
    const response = await proxy(request("/dashboard", "sb-proj-auth-token=valid"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    expect(response.cookies.get("sb-proj-auth-token")).toBeUndefined();
  });

  it("denies protected pages when authentication is not configured", async () => {
    const response = await proxy(request("/dashboard", "sb-proj-auth-token=valid"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("lets anonymous visitors reach the login page", async () => {
    const response = await proxy(request("/login"));
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("isAuthCookieName", () => {
  it.each(["sb-abc-auth-token", "sb-abc-auth-token.0", "sb-abc-auth-token.12"])(
    "matches %s",
    (name) => {
      expect(isAuthCookieName(name)).toBe(true);
    },
  );

  it.each(["sb-abc-auth-token-code-verifier", "session", "sb-abc", "xsb-abc-auth-token"])(
    "ignores %s",
    (name) => {
      expect(isAuthCookieName(name)).toBe(false);
    },
  );
});
