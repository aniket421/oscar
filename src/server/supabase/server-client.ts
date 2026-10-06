import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseConfig } from "./config";
import { authCookieOptions } from "./cookies";

/**
 * Request-scoped Supabase client for Server Components, Server Actions, and
 * Route Handlers. Returns `null` when Supabase is not configured.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  // Read cookies first: this marks the caller as request-time, so a page is
  // never prerendered with a "signed out" result baked in at build time.
  const cookieStore = await cookies();
  const config = getSupabaseConfig();
  if (!config) return null;

  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. The proxy refreshes sessions
          // before rendering, so a failed write here is safe to ignore.
        }
      },
    },
  });
}
