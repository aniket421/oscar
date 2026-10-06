import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest, loginUrl } from "@/features/auth";
import { signOutRequest } from "@/server/supabase/sign-out";

/**
 * Logout endpoint for a plain HTML form POST. The browser follows the 303 with
 * a full page load, so no client-side state from the signed-in session (React
 * state, or pages Next.js keeps hidden for back/forward) survives logout.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request.headers, request.url)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const response = NextResponse.redirect(
    new URL(loginUrl({ notice: "signed_out" }), request.url),
    303,
  );
  response.headers.set("Cache-Control", "no-store");
  await signOutRequest(request, response);
  return response;
}
