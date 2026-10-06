// @vitest-environment node
/**
 * Row Level Security and constraint tests. The real migrations run on a real Postgres engine
 * (see tests/support/supabase/database.mts); each query runs as the `authenticated` or `anon`
 * role with JWT claims, exactly as Supabase executes API requests.
 */
import type { Transaction } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../support/supabase/database.mts";

const userA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const resumeA = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";

const userTables = [
  "profiles",
  "candidate_preferences",
  "education",
  "experience",
  "projects",
  "certifications",
  "skills",
  "resumes",
  "resume_parses",
  "resume_analyses",
] as const;

let database: TestDatabase;

beforeAll(async () => {
  database = await createTestDatabase();
});

afterAll(async () => {
  await database.close();
});

beforeEach(async () => {
  await database.reset();
  await database.createUser(userA, "a@example.test");
  await database.createUser(userB, "b@example.test");
});

function asUser<T>(userId: string, work: (tx: Transaction) => Promise<T>): Promise<T> {
  return database.as({ role: "authenticated", sub: userId }, work);
}

function asAnon<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  return database.as({ role: "anon" }, work);
}

async function rows(userId: string, sql: string, params: unknown[] = []) {
  return asUser(userId, async (tx) => (await tx.query(sql, params)).rows);
}

/** Resolves with the Postgres error code the promise rejected with. */
async function errorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return (error as { code?: string }).code ?? "unknown";
  }
  return "no error";
}

/** Gives user A one row in every table (analysis written by the service role). */
async function seedUserA() {
  await asUser(userA, async (tx) => {
    await tx.query(
      "insert into profiles (user_id, full_name, headline, experience_level) values ($1, 'Ada Example', 'Engineer', 'mid')",
      [userA],
    );
    await tx.query(
      "insert into candidate_preferences (user_id, target_role, areas_to_improve) values ($1, 'Backend engineer', '{System design}')",
      [userA],
    );
    await tx.query(
      "insert into education (user_id, institution, start_date, end_date) values ($1, 'Example University', '2016-09-01', '2020-06-01')",
      [userA],
    );
    await tx.query(
      "insert into experience (user_id, company, title, is_current, technologies) values ($1, 'Example Co', 'Engineer', true, '{TypeScript}')",
      [userA],
    );
    await tx.query("insert into projects (user_id, name) values ($1, 'Example project')", [userA]);
    await tx.query("insert into certifications (user_id, name) values ($1, 'Example cert')", [
      userA,
    ]);
    await tx.query(
      `insert into resumes (id, user_id, file_name, storage_path, file_type, file_size)
       values ($1, $2, 'resume.pdf', $3, 'pdf', 1024)`,
      [resumeA, userA, `user/${userA}/resume/${resumeA}/original.pdf`],
    );
    await tx.query(
      "insert into resume_parses (resume_id, user_id, parser_version, word_count) values ($1, $2, 1, 300)",
      [resumeA, userA],
    );
    await tx.query(
      "insert into skills (user_id, name, category, source, resume_id) values ($1, 'TypeScript', 'programming', 'resume', $2)",
      [userA, resumeA],
    );
  });
  await database.as({ role: "service_role" }, (tx) =>
    tx.query(
      "insert into resume_analyses (resume_id, user_id, analyzer_version) values ($1, $2, 1)",
      [resumeA, userA],
    ),
  );
}

describe("row level security is enabled", () => {
  it.each(userTables)("on public.%s", async (table) => {
    const result = await database.db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where oid = $1::regclass",
      [`public.${table}`],
    );
    expect(result.rows[0]?.relrowsecurity).toBe(true);
  });

  it("on storage.objects", async () => {
    const result = await database.db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where oid = 'storage.objects'::regclass",
    );
    expect(result.rows[0]?.relrowsecurity).toBe(true);
  });

  it("with every resume and avatar bucket private", async () => {
    const result = await database.db.query<{ id: string; public: boolean }>(
      "select id, public from storage.buckets order by id",
    );
    expect(result.rows).toEqual([
      { id: "avatars", public: false },
      { id: "resumes", public: false },
    ]);
  });
});

describe("unauthenticated requests", () => {
  beforeEach(seedUserA);

  it.each(userTables)("cannot read public.%s", async (table) => {
    expect(await errorCode(asAnon((tx) => tx.query(`select * from ${table}`)))).toBe("42501");
  });

  it.each(userTables)("cannot write public.%s", async (table) => {
    expect(await errorCode(asAnon((tx) => tx.query(`delete from ${table}`)))).toBe("42501");
  });

  it("cannot create a profile even with a forged user id", async () => {
    const code = await errorCode(
      asAnon((tx) => tx.query("insert into profiles (user_id) values ($1)", [userA])),
    );
    expect(code).toBe("42501");
  });

  it("cannot see or create storage objects", async () => {
    await asUser(userA, (tx) =>
      tx.query("insert into storage.objects (bucket_id, name) values ('resumes', $1)", [
        `user/${userA}/resume/${resumeA}/original.pdf`,
      ]),
    );
    const visible = await asAnon(
      async (tx) => (await tx.query("select name from storage.objects")).rows,
    );
    expect(visible).toEqual([]);
    const code = await errorCode(
      asAnon((tx) =>
        tx.query("insert into storage.objects (bucket_id, name) values ('resumes', $1)", [
          `user/${userA}/resume/${resumeA}/original.pdf`,
        ]),
      ),
    );
    expect(code).toBe("42501");
  });
});

describe("ownership isolation between users", () => {
  beforeEach(seedUserA);

  it.each(userTables)("user A can read their own public.%s rows", async (table) => {
    expect(await rows(userA, `select * from ${table}`)).toHaveLength(1);
  });

  it.each(userTables)("user B cannot read user A's public.%s rows", async (table) => {
    expect(await rows(userB, `select * from ${table}`)).toEqual([]);
    expect(await rows(userB, `select * from ${table} where user_id = $1`, [userA])).toEqual([]);
  });

  it.each(userTables.filter((table) => table !== "resume_analyses"))(
    "user B cannot update or delete user A's public.%s rows",
    async (table) => {
      const updated = await asUser(userB, async (tx) => {
        const result = await tx.query(`update ${table} set user_id = user_id where user_id = $1`, [
          userA,
        ]);
        return result.affectedRows;
      });
      expect(updated).toBe(0);

      const deleted = await asUser(userB, async (tx) => {
        const result = await tx.query(`delete from ${table} where user_id = $1`, [userA]);
        return result.affectedRows;
      });
      expect(deleted).toBe(0);
      expect(await rows(userA, `select * from ${table}`)).toHaveLength(1);
    },
  );

  it("user B cannot create rows owned by user A", async () => {
    const statements: Array<[string, unknown[]]> = [
      ["insert into profiles (user_id) values ($1)", [userA]],
      ["insert into education (user_id, institution) values ($1, 'X')", [userA]],
      ["insert into experience (user_id, company, title) values ($1, 'X', 'Y')", [userA]],
      ["insert into projects (user_id, name) values ($1, 'X')", [userA]],
      ["insert into certifications (user_id, name) values ($1, 'X')", [userA]],
      ["insert into skills (user_id, name, category) values ($1, 'Go', 'programming')", [userA]],
    ];
    for (const [sql, params] of statements) {
      expect(await errorCode(asUser(userB, (tx) => tx.query(sql, params)))).toBe("42501");
    }
  });

  it("user A cannot hand a row over to user B", async () => {
    const code = await errorCode(
      asUser(userA, (tx) => tx.query("update projects set user_id = $1", [userB])),
    );
    expect(code).toBe("42501");
  });

  it("user B cannot attach a skill or parse result to user A's resume", async () => {
    expect(
      await errorCode(
        asUser(userB, (tx) =>
          tx.query(
            "insert into skills (user_id, name, category, source, resume_id) values ($1, 'Rust', 'programming', 'resume', $2)",
            [userB, resumeA],
          ),
        ),
      ),
    ).toBe("42501");
    expect(
      await errorCode(
        asUser(userB, (tx) =>
          tx.query(
            "insert into resume_parses (resume_id, user_id, parser_version, word_count) values ($1, $2, 1, 1)",
            [resumeA, userB],
          ),
        ),
      ),
    ).toBe("42501");
  });

  it("users can read but never write resume analyses", async () => {
    expect(await rows(userA, "select analyzer_version from resume_analyses")).toEqual([
      { analyzer_version: 1 },
    ]);
    const attempts = [
      "insert into resume_analyses (resume_id, user_id, analyzer_version) values ($1, $2, 2)",
      "update resume_analyses set analyzer_version = 9 where resume_id = $1 and user_id = $2",
      "delete from resume_analyses where resume_id = $1 and user_id = $2",
    ];
    for (const sql of attempts) {
      expect(await errorCode(asUser(userA, (tx) => tx.query(sql, [resumeA, userA])))).toBe("42501");
    }
  });
});

describe("storage policies", () => {
  const ownResumePath = `user/${userA}/resume/${resumeA}/original.pdf`;
  const otherResumePath = `user/${userB}/resume/${resumeA}/original.pdf`;

  async function insertObject(userId: string, bucket: string, name: string) {
    return asUser(userId, (tx) =>
      tx.query("insert into storage.objects (bucket_id, name) values ($1, $2)", [bucket, name]),
    );
  }

  it("lets a user store a resume only in their own folder", async () => {
    await insertObject(userA, "resumes", ownResumePath);
    expect(await errorCode(insertObject(userA, "resumes", otherResumePath))).toBe("42501");
  });

  it("rejects object names outside the agreed layout", async () => {
    const invalid = [
      `user/${userA}/resume/${resumeA}/payload.exe`,
      `user/${userA}/resume/${resumeA}/original.pdf/extra`,
      `user/${userA}/avatar/${resumeA}.png`,
      `${userA}/resume/${resumeA}/original.pdf`,
      `user/${userA}/resume/not-a-uuid/original.pdf`,
    ];
    for (const name of invalid) {
      expect(await errorCode(insertObject(userA, "resumes", name))).toBe("42501");
    }
  });

  it("keeps other users' files invisible and undeletable", async () => {
    await insertObject(userA, "resumes", ownResumePath);
    await insertObject(userA, "avatars", `user/${userA}/avatar/${resumeA}.png`);

    expect(await rows(userB, "select name from storage.objects")).toEqual([]);
    const deleted = await asUser(
      userB,
      async (tx) => (await tx.query("delete from storage.objects")).affectedRows,
    );
    expect(deleted).toBe(0);
    const moved = await asUser(
      userB,
      async (tx) =>
        (await tx.query("update storage.objects set name = $1", [otherResumePath])).affectedRows,
    );
    expect(moved).toBe(0);
    expect(await rows(userA, "select name from storage.objects order by name")).toHaveLength(2);
  });

  it("lets the owner remove their own files", async () => {
    await insertObject(userA, "resumes", ownResumePath);
    const deleted = await asUser(
      userA,
      async (tx) => (await tx.query("delete from storage.objects")).affectedRows,
    );
    expect(deleted).toBe(1);
  });

  it("limits avatars to image names in the user's avatar folder", async () => {
    await insertObject(userA, "avatars", `user/${userA}/avatar/${resumeA}.webp`);
    expect(
      await errorCode(insertObject(userA, "avatars", `user/${userA}/avatar/${resumeA}.svg`)),
    ).toBe("42501");
    expect(
      await errorCode(insertObject(userB, "avatars", `user/${userA}/avatar/${resumeA}.png`)),
    ).toBe("42501");
  });
});

describe("constraints mirror server-side validation", () => {
  async function insertAsA(sql: string, params: unknown[] = []) {
    return errorCode(asUser(userA, (tx) => tx.query(sql, [userA, ...params])));
  }

  it("rejects a resume row that points at another user's folder", async () => {
    const code = await insertAsA(
      `insert into resumes (id, user_id, file_name, storage_path, file_type, file_size)
       values ($2, $1, 'resume.pdf', $3, 'pdf', 1024)`,
      [resumeA, `user/${userB}/resume/${resumeA}/original.pdf`],
    );
    expect(code).toBe("23514");
  });

  it("rejects oversized files, unknown types, and inconsistent processing states", async () => {
    const path = `user/${userA}/resume/${resumeA}/original.pdf`;
    const insertWithState = (status: string, processingError: string | null) =>
      insertAsA(
        `insert into resumes (id, user_id, file_name, storage_path, file_type, file_size, status, processing_error)
         values ($2, $1, 'resume.pdf', $3, 'pdf', 1024, $4, $5)`,
        [resumeA, path, status, processingError],
      );
    expect(
      await insertAsA(
        `insert into resumes (id, user_id, file_name, storage_path, file_type, file_size)
         values ($2, $1, 'resume.pdf', $3, 'pdf', 5242881)`,
        [resumeA, path],
      ),
    ).toBe("23514");
    expect(
      await insertAsA(
        `insert into resumes (id, user_id, file_name, storage_path, file_type, file_size)
         values ($2, $1, 'resume.exe', $3, 'exe', 10)`,
        [resumeA, `user/${userA}/resume/${resumeA}/original.exe`],
      ),
    ).toBe("23514");
    expect(await insertWithState("failed", null)).toBe("23514");
    expect(await insertWithState("uploaded", "internal")).toBe("23514");
    expect(await insertWithState("processed", null)).toBe("23514");
    expect(await insertWithState("done", null)).toBe("23514");
    expect(await insertWithState("failed", "internal")).toBe("no error");
  });

  it("rejects dates out of order or below month precision", async () => {
    expect(
      await insertAsA(
        "insert into education (user_id, institution, start_date, end_date) values ($1, 'U', '2020-09-01', '2019-06-01')",
      ),
    ).toBe("23514");
    expect(
      await insertAsA(
        "insert into education (user_id, institution, start_date) values ($1, 'U', '2020-09-15')",
      ),
    ).toBe("23514");
    expect(
      await insertAsA(
        "insert into experience (user_id, company, title, is_current, end_date) values ($1, 'C', 'T', true, '2024-01-01')",
      ),
    ).toBe("23514");
    expect(
      await insertAsA(
        "insert into certifications (user_id, name, issued_on, expires_on) values ($1, 'C', '2024-01-01', '2023-01-01')",
      ),
    ).toBe("23514");
  });

  it("rejects invalid enums, lengths, URLs, and lists", async () => {
    expect(
      await insertAsA("insert into profiles (user_id, experience_level) values ($1, 'wizard')"),
    ).toBe("23514");
    expect(
      await insertAsA("insert into profiles (user_id, years_of_experience) values ($1, 61)"),
    ).toBe("23514");
    expect(await insertAsA("insert into profiles (user_id, full_name) values ($1, '   ')")).toBe(
      "23514",
    );
    expect(
      await insertAsA("insert into profiles (user_id, full_name) values ($1, $2)", [
        "x".repeat(121),
      ]),
    ).toBe("23514");
    expect(
      await insertAsA(
        "insert into projects (user_id, name, url) values ($1, 'P', 'javascript:alert(1)')",
      ),
    ).toBe("23514");
    expect(
      await insertAsA(
        "insert into candidate_preferences (user_id, work_arrangements) values ($1, '{remote,moon}')",
      ),
    ).toBe("23514");
    expect(
      await insertAsA(
        "insert into candidate_preferences (user_id, target_companies) values ($1, $2)",
        [Array.from({ length: 21 }, (_, index) => `Company ${index}`)],
      ),
    ).toBe("23514");
    expect(
      await insertAsA(
        "insert into experience (user_id, company, title, technologies) values ($1, 'C', 'T', '{\"\"}')",
      ),
    ).toBe("23514");
    expect(
      await insertAsA(
        "insert into skills (user_id, name, category) values ($1, 'Go', 'astrology')",
      ),
    ).toBe("23514");
  });

  it("keeps skill names unique per user, ignoring case", async () => {
    await asUser(userA, (tx) =>
      tx.query("insert into skills (user_id, name, category) values ($1, 'React', 'frontend')", [
        userA,
      ]),
    );
    expect(
      await insertAsA(
        "insert into skills (user_id, name, category) values ($1, 'react', 'frontend')",
      ),
    ).toBe("23505");
    await asUser(userB, (tx) =>
      tx.query("insert into skills (user_id, name, category) values ($1, 'React', 'frontend')", [
        userB,
      ]),
    );
  });
});

describe("lifecycle", () => {
  beforeEach(seedUserA);

  it("deleting a resume removes its parse and analysis but keeps added skills", async () => {
    await asUser(userA, (tx) => tx.query("delete from resumes where id = $1", [resumeA]));
    expect(await rows(userA, "select * from resume_parses")).toEqual([]);
    expect(await rows(userA, "select * from resume_analyses")).toEqual([]);
    expect(await rows(userA, "select name, source, resume_id from skills")).toEqual([
      { name: "TypeScript", source: "resume", resume_id: null },
    ]);
  });

  it("deleting an account removes every row it owns", async () => {
    await database.db.query("delete from auth.users where id = $1", [userA]);
    for (const table of userTables) {
      const result = await database.db.query(`select 1 from public.${table} where user_id = $1`, [
        userA,
      ]);
      expect(result.rows, table).toEqual([]);
    }
  });

  it("maintains updated_at on every update", async () => {
    const [before] = await rows(userA, "select updated_at from profiles");
    await new Promise((resolve) => setTimeout(resolve, 5));
    await asUser(userA, (tx) => tx.query("update profiles set headline = 'Staff engineer'"));
    const [after] = await rows(userA, "select updated_at from profiles");
    expect((after as { updated_at: Date }).updated_at.getTime()).toBeGreaterThan(
      (before as { updated_at: Date }).updated_at.getTime(),
    );
  });
});
