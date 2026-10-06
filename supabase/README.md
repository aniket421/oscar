# supabase

Database schema for Oscar, as Supabase migrations. These files are the single source of truth
for tables, constraints, Row Level Security policies, and storage buckets.

| Migration                               | Contents                                                               |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `20261006000100_candidate_profile.sql`  | Helpers, profiles, preferences, education, experience, projects, certs |
| `20261006000200_resumes_and_skills.sql` | Resumes, parse results, the analysis foundation, skills                |
| `20261006000300_candidate_storage.sql`  | Private `resumes` and `avatars` buckets and their storage policies     |

## Applying them

With the Supabase CLI: `supabase link --project-ref <ref>` once, then `supabase db push`.
Without it: run each file in order in the project's SQL editor. Both create the storage
buckets, so nothing needs to be set up by hand in the dashboard.

## Rules

- Every user-owned table has RLS enabled with per-command policies for the `authenticated`
  role, and no privileges for `anon`. A new table without them fails code review.
- Constraints mirror the server validators in `src/features/candidate/validation.ts`.
- `src/server/supabase/database.ts` mirrors these tables; change both in the same commit.
- `tests/db/rls.test.ts` applies these files to a real Postgres engine and checks ownership,
  anonymous access, constraints, and storage policies. Add a case for every new table.

`tests/support/supabase/platform-shim.sql` is a test-only stand-in for the parts of Supabase
these migrations rely on (API roles, `auth.uid()`, the storage schema). It is never applied to a
real project.
