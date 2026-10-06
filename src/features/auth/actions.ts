"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { readEnv } from "@/lib/env";
import { isAuthCookieName } from "@/server/supabase/cookies";
import { createSupabaseServerClient } from "@/server/supabase/server-client";

import { authMessages, describeAuthError, type AuthFailure } from "./errors";
import { authRoutes, loginUrl, safeRedirectPath } from "./routes";
import {
  validateLogin,
  validateSignup,
  type FieldErrors,
  type LoginField,
  type SignupField,
} from "./validation";

export type LoginState =
  { status: "idle" } | { status: "error"; fieldErrors?: FieldErrors<LoginField>; message?: string };

export type SignupState =
  | { status: "idle" }
  | {
      status: "error";
      fieldErrors?: FieldErrors<SignupField>;
      message?: string;
      kind?: AuthFailure["kind"];
    }
  | { status: "confirm_email"; email: string };

function logAuthError(action: string, error: unknown) {
  // Log only non-sensitive identifiers. Never log credentials or tokens.
  const { name, status, code } = (error ?? {}) as {
    name?: unknown;
    status?: unknown;
    code?: unknown;
  };
  console.error(`[auth] ${action} failed`, { name, status, code });
}

function unavailable(action: string): { status: "error"; message: string } {
  logAuthError(action, { name: "SupabaseNotConfigured" });
  return { status: "error", message: authMessages.unavailable };
}

export async function login(_previous: LoginState, form: FormData): Promise<LoginState> {
  const parsed = validateLogin(form);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.errors };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return unavailable("login");

  let failure: AuthFailure | null = null;
  try {
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      failure = describeAuthError(error);
      if (failure.kind === "unknown" || failure.kind === "network") logAuthError("login", error);
    }
  } catch (error) {
    failure = describeAuthError(error);
    logAuthError("login", error);
  }

  if (failure) {
    return failure.field
      ? { status: "error", fieldErrors: { [failure.field]: failure.message } }
      : { status: "error", message: failure.message };
  }

  redirect(safeRedirectPath(form.get("next")) ?? authRoutes.app);
}

function siteOrigin(): string | undefined {
  return readEnv("NEXT_PUBLIC_APP_URL")?.replace(/\/+$/, "");
}

export async function signup(_previous: SignupState, form: FormData): Promise<SignupState> {
  const parsed = validateSignup(form);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.errors };
  const { name, email, password } = parsed.data;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return unavailable("signup");

  const origin = siteOrigin();
  let result: Awaited<ReturnType<typeof supabase.auth.signUp>>;
  try {
    result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        ...(origin ? { emailRedirectTo: `${origin}${authRoutes.confirm}` } : {}),
      },
    });
  } catch (error) {
    logAuthError("signup", error);
    return { status: "error", message: describeAuthError(error).message };
  }

  const { data, error } = result;
  if (error) {
    const failure = describeAuthError(error);
    if (failure.kind === "unknown" || failure.kind === "network") logAuthError("signup", error);
    return failure.field
      ? { status: "error", fieldErrors: { [failure.field]: failure.message }, kind: failure.kind }
      : { status: "error", message: failure.message, kind: failure.kind };
  }

  // With email confirmation on, Supabase answers an existing address with a
  // placeholder user that has no identities instead of an error.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { status: "error", message: authMessages.duplicate_account, kind: "duplicate_account" };
  }

  // Email confirmation disabled: the user is signed in immediately.
  if (data.session) redirect(authRoutes.app);

  return { status: "confirm_email", email };
}

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) logAuthError("logout", error);
    } catch (error) {
      logAuthError("logout", error);
    }
  }

  // Always clear session cookies locally, even if the provider could not be reached.
  const cookieStore = await cookies();
  for (const { name } of cookieStore.getAll()) {
    if (isAuthCookieName(name)) cookieStore.delete(name);
  }

  redirect(loginUrl({ notice: "signed_out" }));
}
