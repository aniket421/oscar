import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { loginUrl } from "./routes";
import { createSupabaseServerClient } from "@/server/supabase/server-client";

/** The minimal user shape the UI may see. Tokens and provider metadata stay on the server. */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  /** Account creation time (ISO 8601), shown as "member since". */
  createdAt: string | null;
}

export function toAuthUser(user: User): AuthUser {
  const metadataName = user.user_metadata?.full_name;
  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : null,
    createdAt: typeof user.created_at === "string" ? user.created_at : null,
  };
}

/**
 * Data Access Layer entry point. Verifies the session with Supabase Auth on
 * every request (deduplicated within a single render).
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  // Session validation compares token expiry with the current time, so it must
  // never run during a prerender, even one that has the request's cookies.
  await connection();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return toAuthUser(data.user);
});

/** Returns the signed-in user or redirects to the login page. */
export async function requireUser(nextPath?: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl({ next: nextPath }));
  return user;
}
