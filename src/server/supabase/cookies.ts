import "server-only";

import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Session cookies are httpOnly: only the server reads them, so scripts in the
 * page (including any injected ones) cannot access the tokens.
 */
export const authCookieOptions: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

/**
 * Supabase stores the session in `sb-<project>-auth-token` cookies, chunked as
 * `.0`, `.1`, ... when large. The PKCE `-code-verifier` cookie is not a session.
 */
export function isAuthCookieName(name: string): boolean {
  return /^sb-.+-auth-token(\.\d+)?$/.test(name);
}

/**
 * A cookie that deletes `name`: empty, already expired, same attributes as the
 * original so the browser matches and removes it.
 */
export function expiredAuthCookie(name: string) {
  return { ...authCookieOptions, name, value: "", maxAge: 0, expires: new Date(0) };
}
