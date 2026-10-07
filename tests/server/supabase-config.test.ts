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
    const { getSupabaseConfig } = await loadConfig();
    expect(getSupabaseConfig()).toBeNull();
    expect(getSupabaseConfig()).toBeNull();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(String(errors.mock.calls[0]?.[0])).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it.each([
    // Assembled at run time so the source holds nothing shaped like a real secret key.
    ["a secret key", ["sb", "secret", "fake-test-value"].join("_")],
    ["a legacy service-role key", fakeJwt({ role: "service_role" })],
  ])("refuses %s in the publishable slot, without logging it", async (_label, key) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);
    const { getSupabaseConfig } = await loadConfig();
    expect(getSupabaseConfig()).toBeNull();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(String(errors.mock.calls[0]?.[0])).not.toContain(key);
  });

  it("accepts a legacy anon key", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", fakeJwt({ role: "anon" }));
    const { getSupabaseConfig, isElevatedKey } = await loadConfig();
    expect(getSupabaseConfig()).not.toBeNull();
    expect(isElevatedKey("sb_publishable_x")).toBe(false);
    expect(isElevatedKey("not.a.jwt")).toBe(false);
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
