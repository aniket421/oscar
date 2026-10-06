# Phase 4 QA Checklist: Resume Intelligence and Candidate Profile

Scope: candidate profile (section editing), normalized database schema with Row Level Security,
private storage, resume upload, replace, delete, server-side processing and parsing, profile
completeness, and the analysis foundation. No interview generation, interview engine,
voice/video, AI interviewer, scoring, realtime, code execution, MCQ engine, or learning engine.

## Before building

- [x] Repository inspected; architecture, development rules, design system, and Phase 0 QA read
- [x] Auth architecture, application shell, and Supabase integration inspected and reused
- [x] Design recorded first in `docs/candidate-intelligence.md` (development rule 2)

## Database schema and RLS

- [x] Normalized tables: `profiles`, `candidate_preferences`, `education`, `experience`,
      `projects`, `certifications`, `skills`, `resumes`, `resume_parses`, `resume_analyses`
- [x] Every table owned by `user_id`, cascading from `auth.users`
- [x] RLS enabled on every table and on `storage.objects`; per-command policies for
      `authenticated`; `anon` has no privileges
- [x] Policies also check ownership of referenced resumes (foreign keys bypass RLS)
- [x] `resume_analyses` is read-only for users (no insert, update, or delete)
- [x] Check constraints mirror the validators: lengths, enums, URL schemes, month precision, date
      order, list sizes, file size and type, status and error consistency, owned storage path
- [x] Migrations apply cleanly to PGlite (Postgres 18) and to a native PostgreSQL 16 cluster
- [x] A deliberately broken policy makes the RLS suite fail (mutation check)

## Storage

- [x] Private `resumes` (5 MiB, PDF and DOCX) and `avatars` (2 MiB, PNG, JPEG, WebP) buckets
- [x] Objects under `user/<user id>/resume/<resume id>/original.<ext>` and
      `user/<user id>/avatar/<id>.<ext>`; policies restrict each user to their own folder and the
      exact name layout
- [x] Files reach the browser only through authenticated handlers; no storage URL in any page
- [x] Upload rollback, replace cleanup, idempotent delete, and orphan sweep (integration tests)

## Resume

- [x] Upload with progress (XMLHttpRequest), cancel, success, error, replace, delete, download
- [x] Server validation by extension, declared type, size, and content signature; executables,
      renamed executables, other archives, and empty or oversized files rejected
- [x] Statuses `uploaded`, `processing`, `processed`, `failed` with error codes and plain-language
      messages; retry for failures a retry can fix
- [x] Processing runs after the response (`after()`), server-side only, with no third-party
      service; the page refreshes itself while processing
- [x] Parser extracts email, phone, links, summary, sections, catalog skills, word and page
      counts; work history and other entries are explicitly not extracted yet
- [x] The extracted text is never stored or logged
- [x] Resume skills reach the profile only when the candidate adds them, marked "From resume";
      existing skills are never changed
- [x] Analysis area shows "Analysis will appear after processing" or "in development"; no
      fabricated analysis or scores

## Profile

- [x] `/profile` sections: Personal (with photo), Career, Education, Experience, Projects,
      Skills, Certifications, Goals; one form per section, never a single giant form
- [x] All fields optional except an entry's name field; incomplete profiles allowed
- [x] Skills: add (category suggested from the catalog), rename, recategorize, remove;
      duplicates refused case-insensitively; nine categories
- [x] Completeness computed from stored data on every render, with specific next steps; labelled
      as not a rating

## Automated gates

| Gate                           | Result                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `npm run typecheck`            | Pass                                                                         |
| `npm run lint` (zero warnings) | Pass                                                                         |
| `npm run format:check`         | Pass                                                                         |
| `npm run test`                 | Pass: 28 files, 448 tests                                                    |
| `npm run build`                | Pass                                                                         |
| `npm run test:e2e`             | Pass: 67 passed, 3 skipped by design (layout-specific tests in each project) |

Phase 4 test files: `tests/db/rls.test.ts` (80, RLS and constraints on Postgres),
`tests/server/candidate-repositories.test.ts` (14, integration through the Supabase client),
`tests/server/candidate-routes.test.ts` (17, Server Actions and file handlers),
`tests/features/candidate-logic.test.ts` (26), `tests/features/resume-parsing.test.ts` (15),
`tests/components/candidate.test.tsx` (18), and `tests/e2e/candidate.spec.ts` (6).

Required coverage:

- [x] Profile: create, update, retrieve, ownership, validation
- [x] Resume: upload validation, metadata creation, unauthorized access, replace, delete,
      processing states
- [x] Skills: add, edit, delete, ownership
- [x] RLS: user A cannot read or modify user B's rows or files; unauthenticated access denied
- [x] Completeness: computed from real data, changes with the data, never hardcoded

## Browser QA (Playwright, Chromium, production build)

1. [x] Login
2. [x] Open profile
3. [x] Add profile information (personal, career, education, experience, skills)
4. [x] Save (status announced, focus returned to Edit)
5. [x] Refresh
6. [x] Persistence verified after reload
7. [x] Open resume page (designed empty state)
8. [x] Upload a valid resume (an executable is refused first)
9. [x] Processing state verified (uploaded or processing, then processed; failed path too)
10. [x] Private access: owner download works with `private, no-store`; signed-out requests are
        redirected or refused; no storage address in the page
11. [x] Replace resume (PDF with DOCX); previous file removed
12. [x] Delete resume after confirmation; download then returns 404
13. [x] Logout
14. [x] Protected access refused after logout (`/profile`, `/resume`, `/resume/file`)

Two accounts: account B, in a separate browser session, sees none of account A's profile,
resume, file, or photo, and A's data is intact afterwards (E2E).

## Responsive and accessibility

- [x] `/profile`, `/resume`, `/dashboard` with real data at 1440, 1280, 1024, 768, 430, 390, and
      375px: no horizontal overflow, no console errors, 0 axe-core violations
- [x] 0 axe violations with forms open, with field errors shown, in the skill editor, in both
      confirmation dialogs, and with the replace uploader open
- [x] Labels on every control; errors linked with `aria-describedby` and `aria-invalid`; focus
      moves to the first invalid field
- [x] Opening a section focuses its first field; closing returns focus to the trigger; dialogs
      return focus on Escape
- [x] Saves, removals, uploads, and processing status announced through live regions
- [x] File input reachable through a labelled "Choose file" button; drag and drop is an extra
- [x] One `h1` per page; section headings in order; regions labelled by their headings

## Security

- [x] RLS on every table and on storage; ownership tested for every table
- [x] Service-role key not used anywhere; no Supabase URL, key, `service_role`, storage or REST
      path, or PDF library in client bundles
- [x] Resume and profile contents absent from server logs (logs carry operation, id, kind, code)
- [x] Authenticated pages `private, no-store`; resume download `attachment`, `nosniff`, and
      `default-src 'none'; sandbox`
- [x] Cross-site upload refused (403); signed-out upload refused (401); signed-out download
      redirected to login
- [x] Server-side file validation by content; ZIP reader bounded (entries, part size, ratio)
- [x] Ids validated as UUIDs before reaching the database; section names allow-listed

## Privacy

- [x] Privacy Policy updated before release: profile and resume collection, automated
      server-side reading, no third-party analysis, private storage, deletion
- [x] No analytics; no resume text in client logs or server logs
- [x] Only owner-scoped, authenticated file access; no public or signed URLs
- [x] The page makes no network requests outside Oscar's own origin (E2E)

## Design QA

- [x] No giant form; no admin-panel tables; no card stacks (hairline sections and rows)
- [x] No fabricated insights, scores, extracted data, or sample profiles
- [x] Rectangular skill tags, never pills; one accent color; no gradients
- [x] Motion limited to the progress indicators
- [x] No em dashes in product copy (guard test)

## Out of scope (confirmed not built)

- [x] Interview question generation, interview state machine, voice/video interview, AI
      interviewer, AI scoring, realtime, coding execution, MCQ engine, personalized learning
