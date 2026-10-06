import "server-only";

/**
 * What went wrong with a database or storage call, reduced to what callers act on. The original
 * provider error is never passed on: it can contain query details or values.
 */
export type DataErrorKind =
  "not_found" | "conflict" | "invalid" | "unauthorized" | "unavailable" | "unknown";

export class DataAccessError extends Error {
  readonly kind: DataErrorKind;
  /** Provider error code (for example a Postgres SQLSTATE), safe to log. */
  readonly code: string | null;
  readonly status: number | null;

  constructor(kind: DataErrorKind, details: { code?: string | null; status?: number | null } = {}) {
    super(`Data access failed: ${kind}`);
    this.name = "DataAccessError";
    this.kind = kind;
    this.code = details.code ?? null;
    this.status = details.status ?? null;
  }
}

interface ProviderError {
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
  name?: unknown;
}

function kindFor(code: string, status: number | null): DataErrorKind {
  if (code === "23505" || status === 409) return "conflict";
  if (code === "PGRST116" || status === 404) return "not_found";
  if (["23514", "23502", "22001", "22007", "22008", "22P02", "23503"].includes(code)) {
    return "invalid";
  }
  if (code === "42501" || code.startsWith("PGRST3") || status === 401 || status === 403) {
    return "unauthorized";
  }
  if (status === 0 || status === null || status >= 500) return "unavailable";
  if (status === 400 || status === 413 || status === 415 || status === 422) return "invalid";
  return "unknown";
}

/** Converts a Supabase (PostgREST or Storage) error into a `DataAccessError`. */
export function toDataError(error: unknown, status?: number | null): DataAccessError {
  if (error instanceof DataAccessError) return error;
  const provider = (typeof error === "object" && error !== null ? error : {}) as ProviderError;
  const code = typeof provider.code === "string" ? provider.code : "";
  // Storage answers some failures with HTTP 400 and the real status in `statusCode`
  // (for example "404" for a missing object), so that field wins when present.
  const storageStatus =
    typeof provider.statusCode === "string" && /^\d+$/.test(provider.statusCode)
      ? Number(provider.statusCode)
      : null;
  const numericStatus =
    storageStatus ??
    (typeof status === "number"
      ? status
      : typeof provider.status === "number"
        ? provider.status
        : null);
  return new DataAccessError(kindFor(code, numericStatus), {
    code: code || null,
    status: numericStatus,
  });
}

/**
 * Logs a data failure with only its operation, kind, code, and status. Never values, file names,
 * or messages, which can contain the candidate's data.
 */
export function logDataError(operation: string, error: unknown): void {
  const data = toDataError(error);
  console.error("[candidate]", operation, {
    kind: data.kind,
    code: data.code,
    status: data.status,
  });
}
