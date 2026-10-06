// @vitest-environment node

import { describe, expect, it } from "vitest";

import { authMessages, describeAuthError } from "@/features/auth/errors";
import {
  decideRouteAccess,
  isSameOriginRequest,
  loginUrl,
  safeRedirectPath,
} from "@/features/auth/routes";
import { validateLogin, validateNewPassword, validateSignup } from "@/features/auth/validation";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("validateLogin", () => {
  it("requires email and password", () => {
    expect(validateLogin(form({}))).toEqual({
      ok: false,
      errors: { email: "Enter your email address.", password: "Enter your password." },
    });
  });

  it("rejects malformed email", () => {
    const result = validateLogin(form({ email: "nope", password: "x" }));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.email).toMatch(/valid email/);
  });

  it("normalizes email but never alters the password", () => {
    expect(validateLogin(form({ email: "  Name@Example.COM ", password: " pass " }))).toEqual({
      ok: true,
      data: { email: "name@example.com", password: " pass " },
    });
  });
});

describe("validateNewPassword", () => {
  it.each([
    ["", "Create a password."],
    ["abc12", "Use at least 8 characters."],
    ["abcdefgh", "Include at least one letter and one number."],
    ["12345678", "Include at least one letter and one number."],
    ["a1".repeat(37), "Use 72 characters or fewer."],
  ])("rejects %j", (password, message) => {
    expect(validateNewPassword(password)).toBe(message);
  });

  it("accepts a reasonable password", () => {
    expect(validateNewPassword("practice-2026")).toBeUndefined();
  });
});

describe("validateSignup", () => {
  const valid = {
    name: "  Ada   Lovelace ",
    email: "ADA@example.com",
    password: "engine-1843",
    confirmPassword: "engine-1843",
  };

  it("accepts and normalizes valid input", () => {
    expect(validateSignup(form(valid))).toEqual({
      ok: true,
      data: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "engine-1843",
        confirmPassword: "engine-1843",
      },
    });
  });

  it("reports every invalid field", () => {
    const result = validateSignup(
      form({ name: "", email: "bad", password: "short", confirmPassword: "other" }),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual([
      "confirmPassword",
      "email",
      "name",
      "password",
    ]);
  });

  it("requires matching passwords", () => {
    const result = validateSignup(form({ ...valid, confirmPassword: "engine-1844" }));
    expect(!result.ok && result.errors).toEqual({ confirmPassword: "Passwords do not match." });
  });

  it("limits name length", () => {
    const result = validateSignup(form({ ...valid, name: "x".repeat(81) }));
    expect(!result.ok && result.errors.name).toBe("Use 80 characters or fewer.");
  });
});

describe("describeAuthError", () => {
  it.each([
    [{ name: "AuthApiError", status: 400, code: "invalid_credentials" }, "invalid_credentials"],
    [{ name: "AuthApiError", status: 400, code: "email_not_confirmed" }, "email_not_confirmed"],
    [{ name: "AuthApiError", status: 422, code: "user_already_exists" }, "duplicate_account"],
    [{ name: "AuthApiError", status: 422, code: "email_exists" }, "duplicate_account"],
    [{ name: "AuthApiError", status: 429, code: "over_request_rate_limit" }, "rate_limited"],
    [{ name: "AuthApiError", status: 429, code: undefined }, "rate_limited"],
    [{ name: "AuthApiError", status: 422, code: "signup_disabled" }, "signup_disabled"],
    [{ name: "AuthApiError", status: 403, code: "session_not_found" }, "session_expired"],
    [{ name: "AuthApiError", status: 400, code: "refresh_token_not_found" }, "session_expired"],
    [{ name: "AuthRetryableFetchError", status: 0 }, "network"],
    [{ name: "AuthRetryableFetchError", status: 503 }, "network"],
    [{ name: "AuthApiError", status: 400, code: "something_new" }, "unknown"],
    [new Error("boom"), "unknown"],
    [null, "unknown"],
  ])("maps %j to %s", (error, kind) => {
    expect(describeAuthError(error).kind).toBe(kind);
  });

  it("ties field-level problems to their field", () => {
    expect(describeAuthError({ status: 400, code: "email_address_invalid" })).toEqual({
      kind: "invalid_email",
      message: authMessages.invalid_email,
      field: "email",
    });
    expect(
      describeAuthError({ status: 422, code: "weak_password", reasons: ["length"] }).field,
    ).toBe("password");
  });

  it("explains breached passwords specifically", () => {
    const failure = describeAuthError({
      name: "AuthWeakPasswordError",
      status: 422,
      code: "weak_password",
      reasons: ["pwned"],
    });
    expect(failure.message).toMatch(/data breach/);
  });

  it("never leaks provider messages", () => {
    const failure = describeAuthError({
      status: 400,
      code: "invalid_credentials",
      message: "Invalid login credentials (internal)",
    });
    expect(failure.message).toBe(authMessages.invalid_credentials);
  });
});

describe("safeRedirectPath", () => {
  it.each(["/dashboard", "/interviews/new", "/practice/coding", "/settings?tab=account"])(
    "allows %s",
    (path) => {
      expect(safeRedirectPath(path)).toBe(path);
    },
  );

  it.each([
    "https://evil.example/dashboard",
    "//evil.example/dashboard",
    "/\\evil.example",
    "/login",
    "/",
    "/apple",
    "/dashboards",
    "/app",
    "javascript:alert(1)",
    "/dashboard path",
    undefined,
    42,
    `/dashboard/${"x".repeat(600)}`,
  ])("rejects %j", (value) => {
    expect(safeRedirectPath(value)).toBeUndefined();
  });
});

describe("loginUrl", () => {
  it("omits the default destination", () => {
    expect(loginUrl({ next: "/dashboard" })).toBe("/login");
  });

  it("encodes the destination and notice", () => {
    expect(loginUrl({ next: "/resume?x=1", notice: "session_expired" })).toBe(
      "/login?next=%2Fresume%3Fx%3D1&notice=session_expired",
    );
  });

  it("drops unsafe destinations", () => {
    expect(loginUrl({ next: "https://evil.example" })).toBe("/login");
  });
});

describe("decideRouteAccess", () => {
  const base = { search: "", sessionRejected: false, isAuthenticated: false };

  it("sends visitors from protected pages to login with a return path", () => {
    expect(decideRouteAccess({ ...base, pathname: "/interviews/new", search: "?id=1" })).toEqual({
      type: "redirect",
      location: "/login?next=%2Finterviews%2Fnew%3Fid%3D1",
    });
  });

  it("redirects page loads but passes signed-out mutations to their handlers", () => {
    expect(decideRouteAccess({ ...base, pathname: "/profile", method: "GET" }).type).toBe(
      "redirect",
    );
    expect(decideRouteAccess({ ...base, pathname: "/profile", method: "HEAD" }).type).toBe(
      "redirect",
    );
    // Server Actions and uploads verify the session themselves and answer in their own format.
    expect(decideRouteAccess({ ...base, pathname: "/profile", method: "POST" })).toEqual({
      type: "allow",
    });
    expect(decideRouteAccess({ ...base, pathname: "/resume/upload", method: "POST" })).toEqual({
      type: "allow",
    });
  });

  it("explains expired sessions", () => {
    expect(decideRouteAccess({ ...base, pathname: "/dashboard", sessionRejected: true })).toEqual({
      type: "redirect",
      location: "/login?notice=session_expired",
    });
  });

  it("sends signed-in users away from login and signup", () => {
    expect(decideRouteAccess({ ...base, pathname: "/login", isAuthenticated: true })).toEqual({
      type: "redirect",
      location: "/dashboard",
    });
    expect(
      decideRouteAccess({ ...base, pathname: "/signup", isAuthenticated: true, next: "/roadmap" }),
    ).toEqual({ type: "redirect", location: "/roadmap" });
  });

  it("allows everything else", () => {
    expect(decideRouteAccess({ ...base, pathname: "/login" })).toEqual({ type: "allow" });
    expect(decideRouteAccess({ ...base, pathname: "/dashboard", isAuthenticated: true })).toEqual({
      type: "allow",
    });
    expect(decideRouteAccess({ ...base, pathname: "/" })).toEqual({ type: "allow" });
  });
});

describe("isSameOriginRequest", () => {
  const url = "http://localhost:3000/auth/logout";
  const headers = (values: Record<string, string>) => new Headers(values);

  it("accepts a matching Origin", () => {
    expect(
      isSameOriginRequest(
        headers({ origin: "http://localhost:3000", host: "localhost:3000" }),
        url,
      ),
    ).toBe(true);
  });

  it("honors the forwarded host behind a proxy", () => {
    expect(
      isSameOriginRequest(
        headers({
          origin: "https://oscar.example",
          host: "internal:3000",
          "x-forwarded-host": "oscar.example",
        }),
        url,
      ),
    ).toBe(true);
  });

  it("rejects another site", () => {
    expect(
      isSameOriginRequest(headers({ origin: "https://evil.example", host: "localhost:3000" }), url),
    ).toBe(false);
    expect(isSameOriginRequest(headers({ origin: "null", host: "localhost:3000" }), url)).toBe(
      false,
    );
  });

  it("falls back to Sec-Fetch-Site and rejects requests with neither header", () => {
    expect(
      isSameOriginRequest(
        headers({ "sec-fetch-site": "same-origin", host: "localhost:3000" }),
        url,
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(headers({ "sec-fetch-site": "cross-site", host: "localhost:3000" }), url),
    ).toBe(false);
    expect(isSameOriginRequest(headers({ host: "localhost:3000" }), url)).toBe(false);
  });
});
