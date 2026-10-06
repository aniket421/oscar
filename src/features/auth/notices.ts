import type { AlertTone } from "@/components/ui";

import { authNotices, type AuthNotice } from "./routes";

export const noticeContent: Record<AuthNotice, { tone: AlertTone; title: string; body: string }> = {
  session_expired: {
    tone: "info",
    title: "Your session has expired",
    body: "Log in again to continue where you left off.",
  },
  signed_out: {
    tone: "success",
    title: "You have been logged out",
    body: "Log in again whenever you are ready.",
  },
  confirmation_failed: {
    tone: "error",
    title: "That confirmation link did not work",
    body: "It may have expired or already been used. Log in, or sign up again to receive a new link.",
  },
};

export function parseNotice(value: unknown): AuthNotice | undefined {
  return typeof value === "string" && (authNotices as readonly string[]).includes(value)
    ? (value as AuthNotice)
    : undefined;
}
