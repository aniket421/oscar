import "server-only";

import { readEnv } from "@/lib/env";

/**
 * Supabase settings. Both values are read on the server only: Oscar never
 * creates a Supabase client in the browser, so nothing is exposed through
 * `NEXT_PUBLIC_*` variables.
 */
export interface SupabaseConfig {
  url: string;
  /** Publishable (or legacy anon) key. Never the secret/service-role key. */
  publishableKey: string;
}

let warned = false;

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = readEnv("SUPABASE_URL");
  const publishableKey = readEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !publishableKey) {
    if (!warned) {
      warned = true;
      console.error(
        "[auth] Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (see .env.example).",
      );
    }
    return null;
  }
  return { url, publishableKey };
}
