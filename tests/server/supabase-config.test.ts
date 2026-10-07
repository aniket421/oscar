// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A JWT-shaped string with the given payload. Unsigned test data, not a real key. */
function fakeJwt(payload: object): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.not-a-signature`;
}

async function loadConfig() {
  vi.resetModules();
  return import("@/server/supabase/config");
}

let errors: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getSupabaseConfig", () => {
  it("reads the NEXT_PUBLIC_SUPABASE_* names", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const { getSupabaseConfig } = await loadConfig();
    expect(getSupabaseConfig()).toEqual({
      url: "https://project.example.test",
      publishableKey: "sb_publishable_test",
    });
  });

  it("still accepts the older SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY names", async () => {
    vi.stubEnv("SUPABASE_URL", "https://legacy.example.test");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "legacy-anon-key");
    const { getSupabaseConfig } = await loadConfig();
    expect(getSupabaseConfig()).toEqual({
      url: "https://legacy.example.test",
      publishableKey: "legacy-anon-key",
    });
  });

  it("prefers the NEXT_PUBLIC_ names when both are set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://primary.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_primary");
    vi.stubEnv("SUPABASE_URL", "https://legacy.example.test");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "legacy-anon-key");
    const { getSupabaseConfig } = await loadConfig();
    expect(getSupabaseConfig()?.url).toBe("https://primary.example.test");
  });

  it("reports missing settings once, naming the variables but no values", async () => {
    const { getSupabaseConfig, resolveSupabaseSetup } = await loadConfig();
    expect(getSupabaseConfig()).toBeNull();
    expect(getSupabaseConfig()).toBeNull();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(String(errors.mock.calls[0]?.[0])).toContain(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
    expect(resolveSupabaseSetup()).toEqual({
      status: "missing",
      names: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
    });
  });

  it("names only the variable that is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.test");
    const { resolveSupabaseSetup } = await loadConfig();
    expect(resolveSupabaseSetup()).toEqual({
      status: "missing",
      names: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
    });
  });

  it("names the missing variable of the older pair when only that pair is used", async () => {
    vi.stubEnv("SUPABASE_URL", "https://legacy.example.test");
    const { resolveSupabaseSetup } = await loadConfig();
    expect(resolveSupabaseSetup()).toEqual({
      status: "missing",
      names: ["SUPABASE_PUBLISHABLE_KEY"],
    });
  });

  it("never pairs a URL and a key from different naming schemes", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://primary.example.test");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "legacy-anon-key");
    const { getSupabaseConfig, resolveSupabaseSetup } = await loadConfig();
    expect(getSupabaseConfig()).toBeNull();
    expect(resolveSupabaseSetup()).toEqual({
      status: "missing",
      names: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
    });
  });

  it.each([["project.example.test"], ["ftp://project.example.test"], ["https://"]])(
    "refuses the URL %j instead of letting every request fail, without logging it",
    async (url) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
      const { getSupabaseConfig, resolveSupabaseSetup } = await loadConfig();
      expect(getSupabaseConfig()).toBeNull();
      expect(resolveSupabaseSetup()).toEqual({
        status: "invalid-url",
        name: "NEXT_PUBLIC_SUPABASE_URL",
      });
      expect(errors).toHaveBeenCalledTimes(1);
      expect(String(errors.mock.calls[0]?.[0])).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(String(errors.mock.calls[0]?.[0])).not.toContain(url);
    },
  );

  it("accepts a local http URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const { getSupabaseConfig } = await loadConfig();
    expect(getSupabaseConfig()?.url).toBe("http://127.0.0.1:54321");
  });

  // Secret-shaped values are assembled at run time so the source holds nothing that looks like a
  // real secret key.
  const secret = ["sb", "secret", "fake-test-value"].join("_");

  it.each([
    ["a secret key", secret],
    ["a secret key in capitals", secret.toUpperCase()],
    ["a secret key with a prefix", `Bearer ${secret}`],
    ["a legacy service-role key", fakeJwt({ role: "service_role" })],
    ["a user access token", fakeJwt({ role: "authenticated", sub: "user" })],
    ["a token without a role", fakeJwt({ iss: "supabase" })],
  ])("refuses %s in the publishable slot, without logging it", async (_label, key) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);
    const { getSupabaseConfig, resolveSupabaseSetup } = await loadConfig();
    expect(getSupabaseConfig()).toBeNull();
    expect(resolveSupabaseSetup()).toEqual({
      status: "unsafe-key",
      name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    });
    expect(errors).toHaveBeenCalledTimes(1);
    expect(String(errors.mock.calls[0]?.[0])).not.toContain(key);
  });

  it("refuses a secret key under the older name too", async () => {
    vi.stubEnv("SUPABASE_URL", "https://legacy.example.test");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", fakeJwt({ role: "service_role" }));
    const { resolveSupabaseSetup } = await loadConfig();
    expect(resolveSupabaseSetup()).toEqual({
      status: "unsafe-key",
      name: "SUPABASE_PUBLISHABLE_KEY",
    });
  });

  it("reports each distinct problem once", async () => {
    const { getSupabaseConfig } = await loadConfig();
    expect(getSupabaseConfig()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", secret);
    expect(getSupabaseConfig()).toBeNull();
    expect(getSupabaseConfig()).toBeNull();
    expect(errors).toHaveBeenCalledTimes(2);
    expect(String(errors.mock.calls[0]?.[0])).toContain("not configured");
    expect(String(errors.mock.calls[1]?.[0])).toContain("publishable key");
  });

  it("accepts publishable and legacy anon keys", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", fakeJwt({ role: "anon" }));
    const { getSupabaseConfig, isUnsafePublishableKey } = await loadConfig();
    expect(getSupabaseConfig()).not.toBeNull();
    expect(errors).not.toHaveBeenCalled();
    expect(isUnsafePublishableKey("sb_publishable_x")).toBe(false);
    expect(isUnsafePublishableKey("e2e-test-key-not-a-secret")).toBe(false);
    // Three parts that do not decode to a JWT payload: an opaque key, left for Supabase to judge.
    expect(isUnsafePublishableKey("not.a.jwt")).toBe(false);
  });
});

describe("Supabase credentials stay on the server", () => {
  const root = join(process.cwd(), "src");

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return /\.(ts|tsx|mts)$/.test(name) ? [path] : [];
    });
  }

  const files = sourceFiles(root).map((path) => ({ path, text: readFileSync(path, "utf8") }));

  it("never reads Supabase settings in client components", () => {
    const offenders = files
      .filter((file) => /^\s*["']use client["']/m.test(file.text))
      .filter((file) => /SUPABASE/.test(file.text))
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it("never inlines Supabase settings with a static process.env reference", () => {
    // `process.env.NEXT_PUBLIC_X` is replaced with its value at build time; config.ts reads
    // the variables by name at run time instead, on the server only.
    const offenders = files
      .filter((file) => /process\.env\.(NEXT_PUBLIC_)?SUPABASE/.test(file.text))
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it("never reads the secret key in application code", () => {
    const offenders = files
      .filter((file) =>
        /(readEnv|requireEnv)\(\s*["']SUPABASE_SECRET_KEY|process\.env(\.|\[["'])SUPABASE_SECRET_KEY|SERVICE_ROLE/.test(
          file.text,
        ),
      )
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });
});
