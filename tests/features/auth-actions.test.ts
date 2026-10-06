// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};
let configured = true;
const cookieStore = {
  getAll: vi.fn(() => [
    { name: "sb-project-auth-token", value: "x" },
    { name: "sb-project-auth-token.1", value: "y" },
    { name: "unrelated", value: "z" },
  ]),
  delete: vi.fn(),
};

vi.mock("@/server/supabase/server-client", () => ({
  createSupabaseServerClient: vi.fn(async () => (configured ? { auth } : null)),
}));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

const { login, signup } = await import("@/features/auth/actions");

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const idle = { status: "idle" } as const;

beforeEach(() => {
  configured = true;
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("login", () => {
  it("returns field errors without calling the provider", async () => {
    const state = await login(idle, form({ email: "", password: "" }));
    expect(state).toMatchObject({ status: "error", fieldErrors: { email: expect.any(String) } });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("maps provider errors to safe messages", async () => {
    auth.signInWithPassword.mockResolvedValue({
      error: {
        name: "AuthApiError",
        status: 400,
        code: "invalid_credentials",
        message: "internal detail",
      },
    });
    const state = await login(idle, form({ email: "a@b.co", password: "pw" }));
    expect(state).toEqual({ status: "error", message: "The email or password is incorrect." });
  });

  it("handles thrown network failures", async () => {
    auth.signInWithPassword.mockRejectedValue(
      Object.assign(new Error("fetch failed"), { name: "AuthRetryableFetchError", status: 0 }),
    );
    const state = await login(idle, form({ email: "a@b.co", password: "pw" }));
    expect(state).toMatchObject({
      status: "error",
      message: expect.stringMatching(/could not reach/),
    });
  });

  it("redirects to a safe destination on success", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    await expect(
      login(idle, form({ email: "A@B.co", password: "pw", next: "/resume?x=1" })),
    ).rejects.toThrow("REDIRECT /resume?x=1");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.co", password: "pw" });
  });

  it("ignores unsafe destinations", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    await expect(
      login(idle, form({ email: "a@b.co", password: "pw", next: "https://evil.example" })),
    ).rejects.toThrow("REDIRECT /dashboard");
  });

  it("reports unavailability when auth is not configured", async () => {
    configured = false;
    const state = await login(idle, form({ email: "a@b.co", password: "pw" }));
    expect(state).toEqual({
      status: "error",
      message: "Sign-in is temporarily unavailable. Please try again later.",
    });
  });
});

describe("signup", () => {
  const valid = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "engine-1843",
    confirmPassword: "engine-1843",
  };

  it("validates before calling the provider", async () => {
    const state = await signup(idle, form({ ...valid, confirmPassword: "nope" }));
    expect(state).toMatchObject({
      status: "error",
      fieldErrors: { confirmPassword: "Passwords do not match." },
    });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("sends the name as metadata and never stores the password itself", async () => {
    auth.signUp.mockResolvedValue({
      data: { user: { identities: [{}] }, session: null },
      error: null,
    });
    const state = await signup(idle, form(valid));
    expect(state).toEqual({ status: "confirm_email", email: "ada@example.com" });
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ada@example.com",
        password: "engine-1843",
        options: expect.objectContaining({ data: { full_name: "Ada Lovelace" } }),
      }),
    );
  });

  it("signs the user in when email confirmation is off", async () => {
    auth.signUp.mockResolvedValue({
      data: { user: { identities: [{}] }, session: { access_token: "t" } },
      error: null,
    });
    await expect(signup(idle, form(valid))).rejects.toThrow("REDIRECT /dashboard");
  });

  it("detects duplicate accounts from an explicit error", async () => {
    auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { status: 422, code: "user_already_exists" },
    });
    expect(await signup(idle, form(valid))).toMatchObject({
      status: "error",
      kind: "duplicate_account",
    });
  });

  it("detects duplicate accounts from an obfuscated user", async () => {
    auth.signUp.mockResolvedValue({
      data: { user: { identities: [] }, session: null },
      error: null,
    });
    expect(await signup(idle, form(valid))).toMatchObject({
      status: "error",
      kind: "duplicate_account",
    });
  });

  it("puts weak password errors on the password field", async () => {
    auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        name: "AuthWeakPasswordError",
        status: 422,
        code: "weak_password",
        reasons: ["pwned"],
      },
    });
    expect(await signup(idle, form(valid))).toMatchObject({
      status: "error",
      fieldErrors: { password: expect.stringMatching(/breach/) },
    });
  });
});
