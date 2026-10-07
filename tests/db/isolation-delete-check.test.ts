// @vitest-environment node
/**
 * supabase/isolation-delete-check.sql is the delete-path isolation check an operator runs against
 * a real Supabase project. It always ends with an error listing its results, so it never leaves
 * data behind. These tests prove every check passes on the migrations, that a weakened policy fails
 * the right check, and that nothing persists.
 */
import { readFileSync } from "node:fs";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../support/supabase/database.mts";

const checkSql = readFileSync(
  new URL("../../supabase/isolation-delete-check.sql", import.meta.url),
  "utf8",
);

let database: TestDatabase;

beforeAll(async () => {
  database = await createTestDatabase();
});

afterAll(async () => {
  await database.close();
});

/** Runs the check, after `change` in the same transaction, and returns its summary and lines. */
async function runCheck(change = ""): Promise<{ summary: string; lines: string[] }> {
  let message = "";
  try {
    await database.db.transaction(async (tx) => {
      if (change) await tx.exec(change);
      await tx.exec(checkSql);
    });
  } catch (error) {
    message = (error as Error).message;
  }
  const [summary = "", ...lines] = message.split("\n");
  return { summary, lines };
}

describe("supabase/isolation-delete-check.sql", () => {
  it("passes every check once all migrations are applied", async () => {
    const { summary, lines } = await runCheck();
    expect(summary).toBe("QA_RESULT delete-checks passed=43 failed=0 (rolled back)");
    expect(lines.filter((line) => !/^(PASS|INFO) /.test(line))).toEqual([]);
  });

  it("leaves no users, rows, or files behind", async () => {
    await runCheck();
    const { rows } = await database.db.query<{ left: number }>(
      `select (select count(*) from auth.users) + (select count(*) from public.profiles)
         + (select count(*) from public.resumes) + (select count(*) from storage.objects) as left`,
    );
    expect(Number(rows[0]?.left)).toBe(0);
  });

  it.each([
    [
      "a delete policy wider than the read policy",
      "create policy anyone_deletes on public.profiles for delete to authenticated using (true);",
      "FAIL B's unfiltered delete on profiles reaches only B's own row (3 rows)",
    ],
    [
      "a resume delete policy that ignores the owner",
      `drop policy resumes_delete_own on public.resumes;
       create policy resumes_delete_own on public.resumes for delete to authenticated using (true);`,
      "FAIL B's unfiltered delete on resumes reaches only B's own row (3 rows)",
    ],
    [
      "a file delete policy that ignores the owner's folder",
      `drop policy resume_objects_delete_own on storage.objects;
       create policy resume_objects_delete_own on storage.objects for delete to authenticated
         using (bucket_id = 'resumes');`,
      "FAIL B's unfiltered file delete reaches only B's own file (3 rows)",
    ],
    [
      "analyses that users can delete",
      `grant delete on public.resume_analyses to authenticated;
       create policy analyses_delete on public.resume_analyses for delete to authenticated
         using (true);`,
      "FAIL A was allowed to delete analyses",
    ],
    [
      "a profile that survives account deletion",
      `alter table public.profiles drop constraint profiles_user_id_fkey,
         add constraint profiles_user_id_fkey foreign key (user_id) references auth.users (id);`,
      'FAIL account deletion: 23503 update or delete on table "users" violates foreign key constraint "profiles_user_id_fkey" on table "profiles"',
    ],
    [
      "resume records that survive account deletion",
      `alter table public.resumes drop constraint resumes_user_id_fkey,
         add constraint resumes_user_id_fkey foreign key (user_id) references auth.users (id);`,
      'FAIL account deletion: 23503 update or delete on table "users" violates foreign key constraint "resumes_user_id_fkey" on table "resumes"',
    ],
  ])("fails on %s", async (_label, change, expected) => {
    const { summary, lines } = await runCheck(change);
    expect(summary).not.toContain("failed=0");
    expect(lines).toContain(expected);
  });

  it("refuses file deletes that skip the Storage API opt-in, as a real project does", async () => {
    const withoutOptIn = checkSql.replace(
      "perform set_config('storage.allow_delete_query', 'true', true);",
      "",
    );
    expect(withoutOptIn).not.toBe(checkSql);
    let message = "";
    try {
      await database.db.transaction(async (tx) => {
        await tx.exec(withoutOptIn);
      });
    } catch (error) {
      message = (error as Error).message;
    }
    // Refused deletes are reported as failures, never as passes.
    expect(message).toContain("FAIL A file delete refused before the policies decided: 42501");
    expect(message).not.toContain("failed=0");
  });
});
