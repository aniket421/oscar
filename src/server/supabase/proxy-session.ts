import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSupabaseConfig } from "./config";
import { authCookieOptions, expiredAuthCookie, isAuthCookieName } from "./cookies";

export interface ProxySession {
  isAuthenticated: boolean;
  /**
   * The request carried a session that Supabase Auth rejected (expired or
   * revoked). False when there was no session, or it could not be checked.
   */
  sessionRejected: boolean;
  /** Response carrying any refreshed (or cleared) session cookies. */
  response: NextResponse;
  /** Copies session cookies and cache headers onto another response (e.g. a redirect). */
  applyTo: (target: NextResponse) => NextResponse;
}

/**
 * Validates the session with Supabase Auth and refreshes it when needed,
 * writing updated cookies to both the forwarded request and the response.
 */
export async function updateProxySession(request: NextRequest): Promise<ProxySession> {
  const hasSessionCookie = request.cookies.getAll().some(({ name }) => isAuthCookieName(name));
  let response = NextResponse.next({ request });
  const config = getSupabaseConfig();

  const applyTo = (target: NextResponse) => {
    for (const cookie of response.cookies.getAll()) target.cookies.set(cookie);
    const cacheControl = response.headers.get("cache-control");
    if (cacheControl) target.headers.set("cache-control", cacheControl);
    return target;
  };

  let isAuthenticated = false;
  // A network or 5xx failure means "could not verify", not "invalid session".
  let unverifiable = !config;
  if (config && hasSessionCookie) {
    const supabase = createServerClient(config.url, config.publishableKey, {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    });

    // getUser() asks Supabase Auth to validate the token, so revoked sessions are caught.
    const { data, error } = await supabase.auth.getUser();
    isAuthenticated = !error && Boolean(data.user);
    unverifiable = isRetryable(error);
  }

  // Only a definitive rejection clears the session. During an outage the user is
  // denied access to protected pages but stays signed in for when it recovers.
  const sessionRejected = hasSessionCookie && !isAuthenticated && !unverifiable;
  if (sessionRejected) {
    // The session could not be verified: clear it so the browser stops sending it.
    for (const { name } of request.cookies.getAll()) {
      if (isAuthCookieName(name)) {
        response.cookies.set(expiredAuthCookie(name));
      }
    }
  }

  return { isAuthenticated, sessionRejected, response, applyTo };
}

function isRetryable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, status } = error as { name?: unknown; status?: unknown };
  return (
    name === "AuthRetryableFetchError" ||
    status === 0 ||
    (typeof status === "number" && status >= 500)
  );
}
