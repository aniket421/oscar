/**
 * TEST SUPPORT. An emulator of the parts of the Supabase Data API (PostgREST) and Storage API
 * that Oscar uses, backed by a real Postgres engine (see database.mts). Requests run as the
 * caller's role with their JWT claims, so the real Row Level Security policies from
 * supabase/migrations decide every result, exactly as on a Supabase project.
 *
 * Supported: flat selects with eq/neq/is/lt/lte/gt/gte filters, order, limit, offset; insert,
 * upsert (on_conflict), update, and delete with `return=representation`; single-object
 * responses. Storage: upload, download, remove, and list. Anything else returns an error so a
 * test cannot pass by accident.
 *
 * Erasable TypeScript only, so Node can run it directly for the end-to-end mock server.
 */
import type { Transaction } from "@electric-sql/pglite";

import type { RequestClaims, TestDatabase } from "./database.mts";

/** Resolves a bearer token to request claims; "invalid" for a token that must be rejected. */
export type ClaimsResolver = (token: string | null) => RequestClaims | "invalid";

export interface SupabaseEmulator {
  /** Handles /rest/v1 and /storage/v1 requests; returns null for any other path. */
  handle(request: Request): Promise<Response | null>;
  /** Bytes of stored objects, keyed by "bucket/name" (for assertions). */
  readonly objects: Map<string, { bytes: Uint8Array; contentType: string }>;
}

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;
const RESERVED_PARAMS = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

interface PostgresError {
  code?: string;
  message?: string;
  detail?: string;
  hint?: string;
}

function quote(identifier: string): string {
  if (!IDENTIFIER.test(identifier)) throw new EmulatorError(400, "PGRST100", "Invalid identifier");
  return `"${identifier}"`;
}

class EmulatorError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

// PostgREST -----------------------------------------------------------------------------------

interface Query {
  table: string;
  columns: string;
  where: string;
  orderBy: string;
  limit: string;
  params: unknown[];
}

/** `qualifier` prefixes filter columns (needed when the statement joins another relation). */
function parseQuery(table: string, url: URL, qualifier = ""): Query {
  const params: unknown[] = [];
  const conditions: string[] = [];
  const operators: Record<string, string> = {
    eq: "=",
    neq: "<>",
    lt: "<",
    lte: "<=",
    gt: ">",
    gte: ">=",
  };

  for (const [key, raw] of url.searchParams) {
    if (RESERVED_PARAMS.has(key)) continue;
    const column = `${qualifier}${quote(key)}`;
    const dot = raw.indexOf(".");
    const operator = raw.slice(0, dot);
    const value = raw.slice(dot + 1);
    if (operator === "is") {
      const literal = { null: "null", true: "true", false: "false" }[value];
      if (!literal) throw new EmulatorError(400, "PGRST100", `Unsupported is value ${value}`);
      conditions.push(`${column} is ${literal}`);
    } else if (operators[operator]) {
      params.push(value);
      conditions.push(`${column} ${operators[operator]} $${params.length}`);
    } else {
      throw new EmulatorError(400, "PGRST100", `Unsupported operator ${operator}`);
    }
  }

  const select = url.searchParams.get("select") ?? "*";
  const columns =
    select === "*"
      ? "*"
      : select
          .split(",")
          .map((column) => quote(column.trim()))
          .join(", ");

  const order = url.searchParams.get("order");
  const orderBy = order
    ? ` order by ${order
        .split(",")
        .map((part) => {
          const [column = "", ...modifiers] = part.split(".");
          const direction = modifiers.includes("desc") ? "desc" : "asc";
          const nulls = modifiers.includes("nullsfirst")
            ? " nulls first"
            : modifiers.includes("nullslast")
              ? " nulls last"
              : "";
          return `${quote(column)} ${direction}${nulls}`;
        })
        .join(", ")}`
    : "";

  const limitValue = url.searchParams.get("limit");
  const offsetValue = url.searchParams.get("offset");
  const limit = `${limitValue ? ` limit ${Number.parseInt(limitValue, 10)}` : ""}${
    offsetValue ? ` offset ${Number.parseInt(offsetValue, 10)}` : ""
  }`;

  return {
    table: `public.${quote(table)}`,
    columns,
    where: conditions.length > 0 ? ` where ${conditions.join(" and ")}` : "",
    orderBy,
    limit,
    params,
  };
}

/** Wraps a statement so Postgres serializes the rows (timestamps and dates as PostgREST does). */
function asJsonRows(statement: string): string {
  return `with result as (${statement}) select coalesce(json_agg(result), '[]'::json) as rows from result`;
}

async function runRows(tx: Transaction, statement: string, params: unknown[]): Promise<unknown[]> {
  const result = await tx.query<{ rows: unknown[] }>(asJsonRows(statement), params);
  return result.rows[0]?.rows ?? [];
}

function preferences(request: Request): Set<string> {
  return new Set(
    (request.headers.get("prefer") ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

function postgresStatus(error: PostgresError, claims: RequestClaims): number {
  switch (error.code) {
    case "42501":
      return claims.role === "anon" ? 401 : 403;
    case "23505":
    case "23503":
      return 409;
    case "23514":
    case "23502":
    case "22P02":
    case "22001":
    case "22007":
    case "22008":
      return 400;
    default:
      return 400;
  }
}

async function handleRest(
  database: TestDatabase,
  request: Request,
  url: URL,
  claims: RequestClaims,
): Promise<Response> {
  const table = url.pathname.slice("/rest/v1/".length);
  if (!IDENTIFIER.test(table)) return json({ code: "PGRST100", message: "Bad table" }, 400);
  const query = parseQuery(table, url, request.method === "PATCH" ? "target." : "");
  const prefer = preferences(request);
  const wantsObject = (request.headers.get("accept") ?? "").includes("vnd.pgrst.object+json");
  const returning = query.columns;

  let rows: unknown[];
  try {
    rows = await database.as(claims, async (tx) => {
      switch (request.method) {
        case "GET":
        case "HEAD":
          return runRows(
            tx,
            `select ${query.columns} from ${query.table}${query.where}${query.orderBy}${query.limit}`,
            query.params,
          );
        case "POST": {
          const body = (await request.json()) as
            Record<string, unknown> | Record<string, unknown>[];
          const records = Array.isArray(body) ? body : [body];
          const keys = [...new Set(records.flatMap((record) => Object.keys(record)))];
          if (keys.length === 0) throw new EmulatorError(400, "PGRST102", "Empty body");
          const columns = keys.map(quote).join(", ");
          const conflict = url.searchParams.get("on_conflict");
          let onConflict = "";
          if (conflict && prefer.has("resolution=merge-duplicates")) {
            const conflictColumns = conflict.split(",").map((column) => column.trim());
            const updates = keys
              .filter((key) => !conflictColumns.includes(key))
              .map((key) => `${quote(key)} = excluded.${quote(key)}`);
            onConflict = ` on conflict (${conflictColumns.map(quote).join(", ")}) ${
              updates.length > 0 ? `do update set ${updates.join(", ")}` : "do nothing"
            }`;
          }
          const params = [...query.params, JSON.stringify(records)];
          return runRows(
            tx,
            `insert into ${query.table} (${columns}) select ${columns} from json_populate_recordset(null::${query.table}, $${params.length}::json)${onConflict} returning ${returning}`,
            params,
          );
        }
        case "PATCH": {
          const body = (await request.json()) as Record<string, unknown>;
          const keys = Object.keys(body);
          if (keys.length === 0) throw new EmulatorError(400, "PGRST102", "Empty body");
          const params = [...query.params, JSON.stringify(body)];
          const assignments = keys.map((key) => `${quote(key)} = patch.${quote(key)}`).join(", ");
          const where = query.where ? query.where.replace(" where ", " and ") : "";
          const qualified =
            returning === "*"
              ? "target.*"
              : returning
                  .split(", ")
                  .map((column) => `target.${column}`)
                  .join(", ");
          return runRows(
            tx,
            `update ${query.table} as target set ${assignments} from json_populate_record(null::${query.table}, $${params.length}::json) as patch where true${where} returning ${qualified}`,
            params,
          );
        }
        case "DELETE":
          return runRows(
            tx,
            `delete from ${query.table}${query.where} returning ${returning}`,
            query.params,
          );
        default:
          throw new EmulatorError(405, "PGRST117", "Unsupported method");
      }
    });
  } catch (error) {
    if (error instanceof EmulatorError) {
      return json(
        { code: error.code, message: error.message, details: null, hint: null },
        error.status,
      );
    }
    const pgError = error as PostgresError;
    return json(
      {
        code: pgError.code ?? "XX000",
        message: pgError.message ?? "Database error",
        details: pgError.detail ?? null,
        hint: pgError.hint ?? null,
      },
      postgresStatus(pgError, claims),
    );
  }

  if (wantsObject) {
    if (rows.length !== 1) {
      return json(
        {
          code: "PGRST116",
          message: "JSON object requested, multiple (or no) rows returned",
          details: `The result contains ${rows.length} rows`,
          hint: null,
        },
        406,
      );
    }
    return json(rows[0], request.method === "POST" ? 201 : 200);
  }

  const representation = request.method === "GET" || prefer.has("return=representation");
  if (!representation) return new Response(null, { status: request.method === "POST" ? 201 : 204 });
  return json(rows, request.method === "POST" ? 201 : 200);
}

// Storage -------------------------------------------------------------------------------------

function storageError(status: number, statusCode: string, error: string, message: string) {
  return json({ statusCode, error, message }, status);
}

interface BucketRow {
  id: string;
  file_size_limit: number | null;
  allowed_mime_types: string[] | null;
}

async function handleStorage(
  database: TestDatabase,
  objects: SupabaseEmulator["objects"],
  request: Request,
  url: URL,
  claims: RequestClaims,
): Promise<Response> {
  const path = decodeURIComponent(url.pathname.slice("/storage/v1/".length));

  // List: POST object/list/{bucket}
  if (request.method === "POST" && path.startsWith("object/list/")) {
    const bucket = path.slice("object/list/".length);
    const body = (await request.json()) as { prefix?: string; limit?: number; offset?: number };
    const prefix = (body.prefix ?? "").replace(/\/+$/, "");
    const rows = await database.as(claims, async (tx) => {
      const result = await tx.query<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
      }>(
        "select name, id, created_at, updated_at from storage.objects where bucket_id = $1 and name like $2 order by name",
        [bucket, prefix ? `${prefix}/%` : "%"],
      );
      return result.rows;
    });
    const seen = new Set<string>();
    const entries: unknown[] = [];
    for (const row of rows) {
      const rest = prefix ? row.name.slice(prefix.length + 1) : row.name;
      const [first = "", ...more] = rest.split("/");
      if (seen.has(first)) continue;
      seen.add(first);
      entries.push(
        more.length > 0
          ? {
              name: first,
              id: null,
              updated_at: null,
              created_at: null,
              last_accessed_at: null,
              metadata: null,
            }
          : {
              name: first,
              id: row.id,
              updated_at: row.updated_at,
              created_at: row.created_at,
              last_accessed_at: null,
              metadata: {},
            },
      );
    }
    const offset = body.offset ?? 0;
    return json(entries.slice(offset, offset + (body.limit ?? 100)));
  }

  // Remove: DELETE object/{bucket} with { prefixes }
  if (request.method === "DELETE" && /^object\/[^/]+$/.test(path)) {
    const bucket = path.slice("object/".length);
    const body = (await request.json()) as { prefixes?: string[] };
    const names = body.prefixes ?? [];
    if (names.length === 0) return json([]);
    const deleted = await database.as(claims, async (tx) => {
      const placeholders = names.map((_, index) => `$${index + 2}`).join(", ");
      const result = await tx.query<{ name: string; id: string }>(
        `delete from storage.objects where bucket_id = $1 and name in (${placeholders}) returning name, id`,
        [bucket, ...names],
      );
      return result.rows;
    });
    for (const row of deleted) objects.delete(`${bucket}/${row.name}`);
    return json(deleted.map((row) => ({ name: row.name, id: row.id, bucket_id: bucket })));
  }

  const match = /^object\/(?:authenticated\/)?([^/]+)\/(.+)$/.exec(path);
  if (!match) return storageError(400, "400", "invalid_request", "Unsupported storage request");
  const [, bucket = "", name = ""] = match;

  // Upload: POST object/{bucket}/{name}
  if (request.method === "POST") {
    const bytes = new Uint8Array(await request.arrayBuffer());
    const contentType = request.headers.get("content-type") ?? "application/octet-stream";
    const bucketRow = (
      await database.db.query<BucketRow>(
        "select id, file_size_limit, allowed_mime_types from storage.buckets where id = $1",
        [bucket],
      )
    ).rows[0];
    if (!bucketRow) return storageError(400, "404", "Bucket not found", "Bucket not found");
    if (bucketRow.file_size_limit !== null && bytes.length > Number(bucketRow.file_size_limit)) {
      return storageError(
        413,
        "413",
        "Payload too large",
        "The object exceeded the maximum allowed size",
      );
    }
    if (bucketRow.allowed_mime_types && !bucketRow.allowed_mime_types.includes(contentType)) {
      return storageError(
        415,
        "415",
        "invalid_mime_type",
        `mime type ${contentType} is not supported`,
      );
    }
    try {
      const id = await database.as(claims, async (tx) => {
        const result = await tx.query<{ id: string }>(
          "insert into storage.objects (bucket_id, name, owner, owner_id, metadata) values ($1, $2, $3, $4, $5) returning id",
          [
            bucket,
            name,
            claims.sub ?? null,
            claims.sub ?? null,
            JSON.stringify({ mimetype: contentType, size: bytes.length }),
          ],
        );
        return result.rows[0]?.id ?? "";
      });
      objects.set(`${bucket}/${name}`, { bytes, contentType });
      return json({ Key: `${bucket}/${name}`, Id: id });
    } catch (error) {
      const pgError = error as PostgresError;
      if (pgError.code === "23505")
        return storageError(409, "409", "Duplicate", "The resource already exists");
      if (pgError.code === "42501") {
        return storageError(
          403,
          "403",
          "Unauthorized",
          "new row violates row-level security policy",
        );
      }
      throw error;
    }
  }

  // Download: GET object/{bucket}/{name}
  if (request.method === "GET") {
    const visible = await database.as(claims, async (tx) => {
      const result = await tx.query(
        "select id from storage.objects where bucket_id = $1 and name = $2",
        [bucket, name],
      );
      return result.rows.length > 0;
    });
    const stored = objects.get(`${bucket}/${name}`);
    if (!visible || !stored) return storageError(400, "404", "not_found", "Object not found");
    return new Response(Uint8Array.from(stored.bytes), {
      headers: { "Content-Type": stored.contentType },
    });
  }

  return storageError(400, "400", "invalid_request", "Unsupported storage request");
}

// Entry point ---------------------------------------------------------------------------------

export function createSupabaseEmulator(
  database: TestDatabase,
  resolveClaims: ClaimsResolver,
): SupabaseEmulator {
  const objects: SupabaseEmulator["objects"] = new Map();
  return {
    objects,
    async handle(request) {
      const url = new URL(request.url);
      const isRest = url.pathname.startsWith("/rest/v1/");
      const isStorage = url.pathname.startsWith("/storage/v1/");
      if (!isRest && !isStorage) return null;

      const claims = resolveClaims(bearer(request));
      if (claims === "invalid") {
        return isRest
          ? json({ code: "PGRST301", message: "JWT expired", details: null, hint: null }, 401)
          : storageError(400, "403", "Unauthorized", "invalid signature");
      }
      return isRest
        ? handleRest(database, request, url, claims)
        : handleStorage(database, objects, request, url, claims);
    },
  };
}
