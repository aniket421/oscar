import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { getSupabaseConfig } from "./config";
import { authCookieOptions, expiredAuthCookie, isAuthCookieName } from "./cookies";

/**
 * Ends the request's session: revokes it with Supabase (this device only) and
 * expires every session cookie on `response`, even if the provider is
 * unreachable. Works on the request/response pair directly (no `cookies()`),
 * so nothing else can overwrite the expiry.
 */
export async function signOutRequest(request: NextRequest, response: NextResponse): Promise<void> {
  const sessionCookies = request.cookies.getAll().filter(({ name }) => isAuthCookieName(name));
  const config = getSupabaseConfig();

  if (config && sessionCookies.length > 0) {
    const supabase = createServerClient(config.url, config.publishableKey, {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll: () => request.cookies.getAll(),
        // Cookies are expired explicitly below; nothing to write here.
        setAll: () => {},
      },
    });
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) logSignOutError(error);
    } catch (error) {
      logSignOutError(error);
    }
  }

  for (const { name } of sessionCookies) response.cookies.set(expiredAuthCookie(name));
}

function logSignOutError(error: unknown) {
  // Non-sensitive identifiers only.
  const { name, status, code } = (error ?? {}) as {
    name?: unknown;
    status?: unknown;
    code?: unknown;
  };
  console.error("[auth] logout failed", { name, status, code });
}
