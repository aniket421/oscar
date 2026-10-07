import "server-only";

import { readEnv } from "@/lib/env";

/**
 * Supabase settings, read by name on the server only. Oscar never creates a Supabase client in
 * the browser and never references these variables in a form the bundler inlines, so neither
 * value is placed in a browser bundle, even though the names follow Supabase's `NEXT_PUBLIC_*`
 * convention (tests enforce both). The session cookie name, `sb-<project ref>-auth-token`, does
 * carry the project ref, which Supabase does not treat as secret.
 *
 * Names come in pairs. The first pair with either value set is used, so a URL and a key are never
 * taken from different pairs:
 *   NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY (older names)
 *
 * `SUPABASE_SECRET_KEY` is deliberately not read here: the application runs every request with
 * the signed-in user's session so Row Level Security applies. The secret key is for trusted
 * operator tooling only.
 */
export interface SupabaseConfig {
  url: string;
  /** Publishable (or legacy anon) key. Never the secret/service-role key. */
  publishableKey: string;
}

export const SUPABASE_ENV = [
  { url: "NEXT_PUBLIC_SUPABASE_URL", publishableKey: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" },
  { url: "SUPABASE_URL", publishableKey: "SUPABASE_PUBLISHABLE_KEY" },
] as const;

/** Whether Supabase can be used, and if not, why. Problems name variables, never their values. */
export type SupabaseSetup =
  | { status: "ready"; config: SupabaseConfig }
  | { status: "missing"; names: string[] }
  | { status: "invalid-url"; name: string }
  | { status: "unsafe-key"; name: string };

function decodeJwtPayload(key: string): Record<string, unknown> | null {
  const parts = key.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * True for a key that must never be used as the publishable key: a secret key (`sb_secret_…`,
 * in any case or position), or a JWT whose role is anything but `anon` (a legacy service-role
 * key, or a user's access token). A secret or service-role key would bypass RLS for every
 * request, so these are refused rather than trusted.
 */
export function isUnsafePublishableKey(key: string): boolean {
  if (/sb_secret_/i.test(key)) return true;
  const payload = decodeJwtPayload(key);
  return payload !== null && payload.role !== "anon";
}

/** Mirrors supabase-js, which throws on every request for a URL without an http(s) scheme. */
function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) && URL.canParse(value);
}

export function resolveSupabaseSetup(): SupabaseSetup {
  const names =
    SUPABASE_ENV.find((pair) => readEnv(pair.url) || readEnv(pair.publishableKey)) ??
    SUPABASE_ENV[0];
  const url = readEnv(names.url);
  const publishableKey = readEnv(names.publishableKey);
  if (!url || !publishableKey) {
    const missing: string[] = [];
    if (!url) missing.push(names.url);
    if (!publishableKey) missing.push(names.publishableKey);
    return { status: "missing", names: missing };
  }
  if (!isHttpUrl(url)) return { status: "invalid-url", name: names.url };
  // Fail closed: never run the app with a key that bypasses Row Level Security.
  if (isUnsafePublishableKey(publishableKey)) {
    return { status: "unsafe-key", name: names.publishableKey };
  }
  return { status: "ready", config: { url, publishableKey } };
}

function describeProblem(setup: Exclude<SupabaseSetup, { status: "ready" }>): string {
  switch (setup.status) {
    case "missing":
      return `[auth] Supabase is not configured. Set ${setup.names.join(" and ")} (see .env.example).`;
    case "invalid-url":
      return `[auth] ${setup.name} is not an http or https URL. Use the project URL; Supabase stays disabled until then.`;
    case "unsafe-key":
      return `[auth] ${setup.name} must hold the project's publishable key, not a secret, service-role, or user key. Supabase stays disabled until then.`;
  }
}

const reported = new Set<string>();

/** The settings, or `null` (reported once per problem) when Supabase cannot be used safely. */
export function getSupabaseConfig(): SupabaseConfig | null {
  const setup = resolveSupabaseSetup();
  if (setup.status === "ready") return setup.config;
  const message = describeProblem(setup);
  if (!reported.has(message)) {
    reported.add(message);
    console.error(message);
  }
  return null;
}
