/**
 * Route access policy. Pure so it can run in the proxy, in server code, and
 * in unit tests with identical behavior.
 */

export const authRoutes = {
  login: "/login",
  signup: "/signup",
  confirm: "/auth/confirm",
  /** Default destination after signing in. */
  app: "/app",
} as const;

/** URL prefixes that require a signed-in user. */
export const protectedPrefixes = ["/app"] as const;
/** Pages that signed-in users do not need to see. */
export const guestOnlyPaths = [authRoutes.login, authRoutes.signup] as const;

export type AuthNotice = "session_expired" | "signed_out" | "confirmation_failed";
export const authNotices: readonly AuthNotice[] = [
  "session_expired",
  "signed_out",
  "confirmation_failed",
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isGuestOnlyPath(pathname: string): boolean {
  return (guestOnlyPaths as readonly string[]).includes(pathname);
}

/**
 * Returns `value` only if it is a same-origin path inside the signed-in area.
 * Anything else (absolute URLs, protocol-relative `//host`, backslashes,
 * encoded tricks) is rejected to prevent open redirects.
 */
export function safeRedirectPath(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 512) return undefined;
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\s]/.test(value)) return undefined;
  try {
    const url = new URL(value, "http://oscar.invalid");
    if (url.origin !== "http://oscar.invalid") return undefined;
    if (!isProtectedPath(url.pathname)) return undefined;
    return `${url.pathname}${url.search}`;
  } catch {
    return undefined;
  }
}

export function loginUrl(options: { next?: string; notice?: AuthNotice } = {}): string {
  const params = new URLSearchParams();
  const next = safeRedirectPath(options.next);
  if (next && next !== authRoutes.app) params.set("next", next);
  if (options.notice) params.set("notice", options.notice);
  const query = params.toString();
  return query ? `${authRoutes.login}?${query}` : authRoutes.login;
}

export type RouteDecision = { type: "allow" } | { type: "redirect"; location: string };

interface RouteContext {
  pathname: string;
  search: string;
  isAuthenticated: boolean;
  /** True when the request carried a session that the provider rejected (expired or revoked). */
  sessionRejected: boolean;
  /** Value of the `next` query parameter, if any. */
  next?: string | null;
}

export function decideRouteAccess(context: RouteContext): RouteDecision {
  const { pathname, search, isAuthenticated, sessionRejected } = context;

  if (isProtectedPath(pathname) && !isAuthenticated) {
    return {
      type: "redirect",
      location: loginUrl({
        next: `${pathname}${search}`,
        notice: sessionRejected ? "session_expired" : undefined,
      }),
    };
  }

  if (isGuestOnlyPath(pathname) && isAuthenticated) {
    return { type: "redirect", location: safeRedirectPath(context.next) ?? authRoutes.app };
  }

  return { type: "allow" };
}
