# supabase

Database schema for Oscar, as Supabase migrations. These files are the single source of truth
for tables, constraints, Row Level Security policies, and storage buckets.

| Migration                                     | Contents                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `20261007081208_candidate_profile.sql`        | Helpers, profiles, preferences, education, experience, projects, certs |
| `20261007081243_resumes_and_skills.sql`       | Resumes, parse results, the analysis foundation, skills                |
| `20261007081316_candidate_storage.sql`        | Private `resumes` and `avatars` buckets and their storage policies     |
| `20261007162349_restrict_rls_auto_enable.sql` | Stops API roles calling Supabase's automatic-RLS event-trigger helper  |

## Applying them

With the Supabase CLI: `supabase link --project-ref <ref>` once, then `supabase db push`.
Without it: run each file in order in the project's SQL editor. Both create the storage
buckets, so nothing needs to be set up by hand in the dashboard.

The file versions match the project's migration history (these were applied on 2026-10-07, which
recorded them under these timestamps), so `supabase db push` treats them as already applied.

## Checking a project

Run [`verify.sql`](verify.sql) in the project's SQL editor. It only reads the system catalogs and
returns one row per check, failures first: every table with RLS enabled, every policy with the
right command, role, and ownership check, no extra policies, no `anon` access, private buckets
with their size and type limits, and the helper functions, triggers, and index. Every row should
show `ok = true`; a failing row names exactly what is missing or different. It changes nothing, so
it is safe to run at any time. `tests/db/verify-sql.test.ts` keeps it in step with the migrations.

[`isolation-delete-check.sql`](isolation-delete-check.sql) covers the checks that need `DELETE`
statements: neither of two users can delete the other's rows or files, an unfiltered delete
reaches only the caller's own rows (so no delete policy is wider than its read policy), deleting a
resume removes its parse and analysis, and deleting an account removes its rows from all 10 tables
while a bystander's data survives. It creates three throwaway users, opts file deletes in the way
the Storage API does (otherwise Supabase's delete guard refuses them before any policy is
checked), and always ends with an error that lists the results, so every change is rolled back
and nothing remains. Every result should start with `PASS` (`INFO` lines are notes).
`tests/db/isolation-delete-check.test.ts` proves each weakened policy or non-cascading foreign
key fails a check. Account deletion does not remove stored files; Oscar has no account deletion
flow yet.

## Rules

- Every user-owned table has RLS enabled with per-command policies for the `authenticated`
  role, and no privileges for `anon`. A new table without them fails code review.
- Constraints mirror the server validators in `src/features/candidate/validation.ts`.
- `src/server/supabase/database.ts` mirrors these tables; change both in the same commit.
- `tests/db/rls.test.ts` applies these files to a real Postgres engine and checks ownership,
  anonymous access, constraints, and storage policies. Add a case for every new table.
- A migration that adds a table, policy, bucket, function, or trigger adds it to `verify.sql` too.

`tests/support/supabase/platform-shim.sql` is a test-only stand-in for the parts of Supabase
these migrations rely on (API roles, `auth.uid()`, the storage schema). It is never applied to a
real project.
