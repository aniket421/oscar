import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { decideRouteAccess } from "@/features/auth/routes";
import { updateProxySession } from "@/server/supabase/proxy-session";

/**
 * Optimistic route guard and session refresher. Pages in the signed-in area
 * still verify the user themselves (see `src/features/auth/session.ts`); the
 * proxy is a first line of defense, not the only one.
 */
export async function proxy(request: NextRequest) {
  const session = await updateProxySession(request);
  const decision = decideRouteAccess({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    method: request.method,
    isAuthenticated: session.isAuthenticated,
    sessionRejected: session.sessionRejected,
    next: request.nextUrl.searchParams.get("next"),
  });

  if (decision.type === "redirect") {
    return session.applyTo(NextResponse.redirect(new URL(decision.location, request.url)));
  }
  return session.response;
}

export const config = {
  // Only routes whose access depends on the session; marketing pages stay static.
  // Must list every entry in `protectedPrefixes` (a unit test enforces this).
  matcher: [
    "/dashboard/:path*",
    "/interviews/:path*",
    "/resume/:path*",
    "/roadmap/:path*",
    "/practice/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
};
