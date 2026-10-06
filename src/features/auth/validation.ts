/**
 * Form validation shared by the browser (instant feedback) and server actions
 * (authoritative). Pure functions: no I/O, no framework imports.
 */

export const PASSWORD_MIN_LENGTH = 8;
/** Supabase Auth hashes passwords with bcrypt, which ignores bytes past 72. */
export const PASSWORD_MAX_LENGTH = 72;
export const NAME_MAX_LENGTH = 80;
export const EMAIL_MAX_LENGTH = 254;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginField = "email" | "password";
export type SignupField = "name" | "email" | "password" | "confirmPassword";
export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type ValidationResult<Input, Field extends string> =
  { ok: true; data: Input } | { ok: false; errors: FieldErrors<Field> };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export function validateEmail(raw: string): string | undefined {
  const email = raw.trim();
  if (!email) return "Enter your email address.";
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address, like name@example.com.";
  }
  return undefined;
}

export function validateNewPassword(password: string): string | undefined {
  if (!password) return "Create a password.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Include at least one letter and one number.";
  }
  return undefined;
}

export function validateLogin(form: FormData): ValidationResult<LoginInput, LoginField> {
  const email = text(form, "email").trim();
  const password = text(form, "password");
  const errors: FieldErrors<LoginField> = {};

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = "Enter your password.";

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, data: { email: email.toLowerCase(), password } };
}

export function validateSignup(form: FormData): ValidationResult<SignupInput, SignupField> {
  const name = text(form, "name").trim().replace(/\s+/g, " ");
  const email = text(form, "email").trim();
  const password = text(form, "password");
  const confirmPassword = text(form, "confirmPassword");
  const errors: FieldErrors<SignupField> = {};

  if (!name) errors.name = "Enter your name.";
  else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Use ${NAME_MAX_LENGTH} characters or fewer.`;
  }

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  const passwordError = validateNewPassword(password);
  if (passwordError) errors.password = passwordError;

  if (!confirmPassword) errors.confirmPassword = "Confirm your password.";
  else if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match.";

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, data: { name, email: email.toLowerCase(), password, confirmPassword } };
}
