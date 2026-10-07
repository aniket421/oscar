/**
 * TEST SUPPORT. A real Postgres engine (PGlite, Postgres compiled to WebAssembly, in-process)
 * with the Supabase platform shim and Oscar's actual migrations applied.
 *
 * `as()` runs work the way Supabase does for an API request: inside a transaction, switched to
 * the request's database role, with the JWT claims set, so Row Level Security applies.
 *
 * Written as erasable TypeScript with explicit extensions so Node can run it directly
 * (the end-to-end mock server) and Vitest can import it.
 */
import { readdirSync, readFileSync } from "node:fs";

import { PGlite, type Transaction } from "@electric-sql/pglite";

const shimUrl = new URL("./platform-shim.sql", import.meta.url);
const migrationsUrl = new URL("../../../supabase/migrations/", import.meta.url);

export type DatabaseRole = "anon" | "authenticated" | "service_role";

export interface RequestClaims {
  role: DatabaseRole;
  sub?: string;
  email?: string;
}

export interface TestDatabase {
  readonly db: PGlite;
  /** Runs `work` as an API request with the given claims (RLS applies). */
  as<T>(claims: RequestClaims, work: (tx: Transaction) => Promise<T>): Promise<T>;
  createUser(id: string, email: string): Promise<void>;
  /** Removes every user, their rows (by cascade), and all storage objects. */
  reset(): Promise<void>;
  close(): Promise<void>;
}

const roles: ReadonlySet<DatabaseRole> = new Set(["anon", "authenticated", "service_role"]);

export function migrationFiles(): string[] {
  return readdirSync(migrationsUrl)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const db = await PGlite.create();
  await db.exec(readFileSync(shimUrl, "utf8"));
  for (const file of migrationFiles()) {
    await db.exec(readFileSync(new URL(file, migrationsUrl), "utf8"));
  }

  return {
    db,
    async as(claims, work) {
      if (!roles.has(claims.role)) throw new Error("Unknown database role");
      return db.transaction(async (tx) => {
        await tx.query(`set local role ${claims.role}`);
        await tx.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify(claims),
        ]);
        return work(tx);
      });
    },
    async createUser(id, email) {
      await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
    },
    async reset() {
      await db.exec("truncate storage.objects; truncate auth.users cascade;");
    },
    async close() {
      await db.close();
    },
  };
}
