import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { authRoutes, loginUrl } from "@/features/auth/routes";
import { createSupabaseServerClient } from "@/server/supabase/server-client";

const otpTypes: readonly EmailOtpType[] = [
  "signup",
  "email",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
];

/**
 * Email confirmation landing. Supports both Supabase link formats:
 * PKCE (`?code=`) and token hash (`?token_hash=&type=`).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const failure = NextResponse.redirect(
    new URL(loginUrl({ notice: "confirmation_failed" }), request.url),
  );

  const supabase = await createSupabaseServerClient();
  if (!supabase) return failure;

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return failure;
    } else if (tokenHash && type && (otpTypes as readonly string[]).includes(type)) {
      const { error } = await supabase.auth.verifyOtp({
        type: type as EmailOtpType,
        token_hash: tokenHash,
      });
      if (error) return failure;
    } else {
      return failure;
    }
  } catch {
    return failure;
  }

  return NextResponse.redirect(new URL(authRoutes.app, request.url));
}
