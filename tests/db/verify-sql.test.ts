// @vitest-environment node
/**
 * supabase/verify.sql is the read-only check an operator runs against a real Supabase project.
 * These tests prove it passes on a correctly migrated database and that each way a project can
 * drift from the migrations fails on the right row.
 */
import { readFileSync } from "node:fs";

import { PGlite, type Transaction } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createTestDatabase,
  migrationFiles,
  type TestDatabase,
} from "../support/supabase/database.mts";

const verifySql = readFileSync(new URL("../../supabase/verify.sql", import.meta.url), "utf8");
const shimSql = readFileSync(
  new URL("../support/supabase/platform-shim.sql", import.meta.url),
  "utf8",
);
const migrationsDir = new URL("../../supabase/migrations/", import.meta.url);

interface Check {
  area: string;
  item: string;
  ok: boolean;
  detail: string;
}

async function runChecks(db: PGlite | Transaction): Promise<Check[]> {
  return (await db.query<Check>(verifySql)).rows;
}

function label(check: Check): string {
  return `${check.area}: ${check.item}`;
}

function failures(checks: Check[]): string[] {
  return checks.filter((check) => !check.ok).map(label);
}

// Starting a fresh Postgres (WebAssembly) engine takes a few seconds, more on a busy machine, so the
// tests that build their own database get more than the default five.
const FRESH_DATABASE_TIMEOUT = 30_000;

/** A database with the platform shim and only the given migrations applied. */
async function databaseWith(files: string[]): Promise<PGlite> {
  const db = await PGlite.create();
  await db.exec(shimSql);
  for (const file of files) await db.exec(readFileSync(new URL(file, migrationsDir), "utf8"));
  return db;
}

let database: TestDatabase;

beforeAll(async () => {
  database = await createTestDatabase();
});

afterAll(async () => {
  await database.close();
});

/** Applies `change`, runs the checks, and rolls the change back. */
async function failuresAfter(change: string): Promise<string[]> {
  const rollback = new Error("rollback");
  let result: string[] = [];
  try {
    await database.db.transaction(async (tx) => {
      await tx.exec(change);
      result = failures(await runChecks(tx));
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  return result;
}

describe("supabase/verify.sql", () => {
  it("passes every check once all migrations are applied", async () => {
    const checks = await runChecks(database.db);
    expect(failures(checks)).toEqual([]);
    // 11 RLS, 45 policies, 2 policy sweeps, 11 privileges, 2 buckets, 5 functions, 9 triggers,
    // 1 index. Update this count with the script when a migration adds objects.
    expect(checks).toHaveLength(86);
  });

  it("only reads", async () => {
    // Postgres refuses every write in a read-only transaction.
    await database.db.transaction(async (tx) => {
      await tx.exec("set transaction read only");
      expect(await runChecks(tx)).toHaveLength(86);
    });
  });

  it.each([
    [
      "Row Level Security turned off",
      "alter table public.skills disable row level security;",
      ["rls: public.skills"],
    ],
    [
      "a dropped policy",
      "drop policy skills_update_own on public.skills;",
      ["policy: public.skills: skills_update_own"],
    ],
    [
      "an update policy that lets a row change owner",
      `drop policy resumes_update_own on public.resumes;
       create policy resumes_update_own on public.resumes for update to authenticated
         using ((select auth.uid()) = user_id) with check (true);`,
      ["policy: public.resumes: resumes_update_own"],
    ],
    [
      "a policy that also applies to anonymous requests",
      `drop policy education_select_own on public.education;
       create policy education_select_own on public.education for select to anon, authenticated
         using ((select auth.uid()) = user_id);`,
      ["policy: public.education: education_select_own"],
    ],
    [
      "an extra permissive policy",
      "create policy everyone on public.profiles for select using (true);",
      ["policy: no other policies on Oscar tables"],
    ],
    [
      "a storage policy that ignores the bucket",
      `drop policy avatar_objects_select_own on storage.objects;
       create policy avatar_objects_select_own on storage.objects for select to authenticated
         using ((storage.foldername(name))[2] = (select auth.uid()::text));`,
      ["policy: storage.objects: avatar_objects_select_own"],
    ],
    [
      "an extra storage policy",
      "create policy everyone on storage.objects for select using (true);",
      ["policy: no other policies on storage.objects"],
    ],
    ["anonymous access", "grant select on public.resumes to anon;", ["privilege: public.resumes"]],
    [
      "users able to write analyses",
      "grant insert on public.resume_analyses to authenticated;",
      ["privilege: public.resume_analyses"],
    ],
    [
      "a privilege the app needs revoked",
      "revoke update on public.skills from authenticated;",
      ["privilege: public.skills"],
    ],
    [
      "a public bucket",
      "update storage.buckets set public = true where id = 'resumes';",
      ["storage: bucket resumes"],
    ],
    [
      "a widened file type list",
      "update storage.buckets set allowed_mime_types = array['image/png', 'text/html'] where id = 'avatars';",
      ["storage: bucket avatars"],
    ],
    [
      "a missing trigger",
      "drop trigger skills_set_updated_at on public.skills;",
      ["schema: trigger skills_set_updated_at"],
    ],
  ])("fails on %s", async (_label, change, expected) => {
    expect(await failuresAfter(change)).toEqual(expected);
  });

  it(
    "names what is missing when the storage migration was not applied",
    async () => {
      const db = await databaseWith(migrationFiles().slice(0, 2));
      try {
        expect(failures(await runChecks(db))).toEqual([
          "policy: storage.objects: avatar_objects_delete_own",
          "policy: storage.objects: avatar_objects_insert_own",
          "policy: storage.objects: avatar_objects_select_own",
          "policy: storage.objects: avatar_objects_update_own",
          "policy: storage.objects: resume_objects_delete_own",
          "policy: storage.objects: resume_objects_insert_own",
          "policy: storage.objects: resume_objects_select_own",
          "policy: storage.objects: resume_objects_update_own",
          "storage: bucket avatars",
          "storage: bucket resumes",
        ]);
      } finally {
        await db.close();
      }
    },
    FRESH_DATABASE_TIMEOUT,
  );

  it(
    "reports, rather than errors, on a project with no migrations",
    async () => {
      const db = await databaseWith([]);
      try {
        const checks = await runChecks(db);
        expect(checks).toHaveLength(86);
        expect(checks.filter((check) => check.ok).map(label)).toEqual([
          "policy: no other policies on Oscar tables",
          "policy: no other policies on storage.objects",
          "rls: storage.objects",
        ]);
      } finally {
        await db.close();
      }
    },
    FRESH_DATABASE_TIMEOUT,
  );
});
