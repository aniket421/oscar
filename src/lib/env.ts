/**
 * Minimal, dependency-free environment variable access.
 *
 * Server-only secrets must never be read from client components. Only
 * variables prefixed with `NEXT_PUBLIC_` are exposed to the browser by Next.js.
 */

type EnvSource = Record<string, string | undefined>;

export class MissingEnvError extends Error {
  constructor(name: string) {
    super(`Missing required environment variable: ${name}`);
    this.name = "MissingEnvError";
  }
}

/** Returns the trimmed value, or `undefined` when unset or blank. */
export function readEnv(name: string, source: EnvSource = process.env): string | undefined {
  const value = source[name]?.trim();
  return value ? value : undefined;
}

/** Returns the trimmed value, throwing `MissingEnvError` when unset or blank. */
export function requireEnv(name: string, source: EnvSource = process.env): string {
  const value = readEnv(name, source);
  if (value === undefined) {
    throw new MissingEnvError(name);
  }
  return value;
}
