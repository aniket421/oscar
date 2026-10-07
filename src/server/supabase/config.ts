import "server-only";

import { readEnv } from "@/lib/env";

/**
 * Supabase settings, read on the server only. Oscar never creates a Supabase client in the
 * browser, so these values are never sent to it, even though the names follow Supabase's
 * `NEXT_PUBLIC_*` convention (a test keeps them out of client code).
 *
 * Names, in order of preference:
 *   NEXT_PUBLIC_SUPABASE_URL              (fallback: SUPABASE_URL)
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  (fallback: SUPABASE_PUBLISHABLE_KEY)
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

export const SUPABASE_ENV = {
  url: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"],
  publishableKey: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY"],
} as const;

function firstSet(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = readEnv(name);
    if (value) return value;
  }
  return undefined;
}

/**
 * True for a key that grants elevated access: a secret key (`sb_secret_…`) or a legacy JWT key
 * whose role is `service_role`. Using one as the publishable key would bypass RLS for every
 * request, so it is refused.
 */
export function isElevatedKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  const parts = key.split(".");
  if (parts.length !== 3 || !parts[1]) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      role?: unknown;
    };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

let warned = false;

function warnOnce(message: string) {
  if (warned) return;
  warned = true;
  console.error(message);
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = firstSet(SUPABASE_ENV.url);
  const publishableKey = firstSet(SUPABASE_ENV.publishableKey);
  if (!url || !publishableKey) {
    warnOnce(
      "[auth] Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
    return null;
  }
  if (isElevatedKey(publishableKey)) {
    // Fail closed: never run the app with a key that bypasses Row Level Security.
    warnOnce(
      "[auth] The configured publishable key is a secret or service-role key. Use the project's publishable key; Supabase stays disabled until then.",
    );
    return null;
  }
  return { url, publishableKey };
}
