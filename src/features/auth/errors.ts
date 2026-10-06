/**
 * Translates authentication provider errors into messages people can act on.
 * Raw provider messages, codes, and stack traces never reach the UI.
 */

export type AuthFailureKind =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "duplicate_account"
  | "weak_password"
  | "invalid_email"
  | "rate_limited"
  | "signup_disabled"
  | "session_expired"
  | "network"
  | "unavailable"
  | "unknown";

export interface AuthFailure {
  kind: AuthFailureKind;
  message: string;
  /** The form field the message belongs to, when it is about one field. */
  field?: "email" | "password";
}

export const authMessages: Record<AuthFailureKind, string> = {
  invalid_credentials: "The email or password is incorrect.",
  email_not_confirmed:
    "Confirm your email address before logging in. Check your inbox for the confirmation link.",
  duplicate_account: "An account with this email already exists. Log in instead.",
  weak_password: "Choose a stronger password. Avoid common words and reused passwords.",
  invalid_email: "Enter a valid email address, like name@example.com.",
  rate_limited: "Too many attempts. Wait a few minutes, then try again.",
  signup_disabled: "New accounts cannot be created right now. Please try again later.",
  session_expired: "Your session has expired. Log in again to continue.",
  network: "We could not reach the sign-in service. Check your connection and try again.",
  unavailable: "Sign-in is temporarily unavailable. Please try again later.",
  unknown: "Something went wrong. Please try again.",
};

interface ErrorLike {
  name?: unknown;
  status?: unknown;
  code?: unknown;
  reasons?: unknown;
}

const codeKinds: Record<string, AuthFailureKind> = {
  invalid_credentials: "invalid_credentials",
  email_not_confirmed: "email_not_confirmed",
  user_already_exists: "duplicate_account",
  email_exists: "duplicate_account",
  identity_already_exists: "duplicate_account",
  weak_password: "weak_password",
  email_address_invalid: "invalid_email",
  email_address_not_authorized: "invalid_email",
  over_request_rate_limit: "rate_limited",
  over_email_send_rate_limit: "rate_limited",
  signup_disabled: "signup_disabled",
  email_provider_disabled: "signup_disabled",
  session_expired: "session_expired",
  session_not_found: "session_expired",
  refresh_token_not_found: "session_expired",
  refresh_token_already_used: "session_expired",
  request_timeout: "network",
  hook_timeout: "network",
};

function fail(kind: AuthFailureKind, field?: AuthFailure["field"]): AuthFailure {
  return field
    ? { kind, message: authMessages[kind], field }
    : { kind, message: authMessages[kind] };
}

export function describeAuthError(error: unknown): AuthFailure {
  if (!error || typeof error !== "object") return fail("unknown");
  const { name, status, code, reasons } = error as ErrorLike;

  if (name === "AuthRetryableFetchError" || status === 0) return fail("network");
  if (typeof status === "number" && status >= 500) return fail("network");

  const kind = typeof code === "string" ? codeKinds[code] : undefined;
  if (kind === "weak_password" || name === "AuthWeakPasswordError") {
    const breached = Array.isArray(reasons) && reasons.includes("pwned");
    return breached
      ? {
          kind: "weak_password",
          message: "This password appears in a known data breach. Choose a different one.",
          field: "password",
        }
      : fail("weak_password", "password");
  }
  if (kind === "invalid_email") return fail(kind, "email");
  if (kind) return fail(kind);
  if (status === 429) return fail("rate_limited");

  return fail("unknown");
}
