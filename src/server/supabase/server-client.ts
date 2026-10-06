import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseConfig } from "./config";
import { authCookieOptions } from "./cookies";
import type { Database } from "./database";

/** The request-scoped client. Every query runs as the signed-in user, so RLS applies. */
export type ServerSupabaseClient = SupabaseClient<Database>;

/**
 * Request-scoped Supabase client for Server Components, Server Actions, and
 * Route Handlers. Returns `null` when Supabase is not configured. It carries
 * the user's session (never a service-role key), so the database and storage
 * apply Row Level Security to everything it does.
 */
export async function createSupabaseServerClient(): Promise<ServerSupabaseClient | null> {
  // Read cookies first: this marks the caller as request-time, so a page is
  // never prerendered with a "signed out" result baked in at build time.
  const cookieStore = await cookies();
  const config = getSupabaseConfig();
  if (!config) return null;

  return createServerClient<Database>(config.url, config.publishableKey, {
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
