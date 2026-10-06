# Candidate Intelligence

Phase 4 gives Oscar a structured picture of each candidate: a profile they edit themselves and a
resume they upload, which Oscar reads on its own servers. This document is the reference for the
data model, resume pipeline, storage, privacy, and access control. Decisions recorded here were
made before the code was written (development rule 2); anything not written here is undecided.

## 1. Principles

1. **The candidate is the author.** Profile data is entered or confirmed by the candidate. Oscar
   never writes to the profile on its own. Resume findings are shown as suggestions that the
   candidate can add; they never overwrite anything the candidate typed.
2. **Only real data.** No placeholder profiles, no invented resume findings, no scores. Empty means
   empty, with a designed state that says what to do next.
3. **The database enforces ownership.** Every table and storage object is protected by Postgres
   Row Level Security (RLS). Application code also scopes every query to the verified user, but the
   policies are what make cross-user access impossible.
4. **Server-side only.** The browser never talks to the database or storage. All reads and writes
   go through Server Components, Server Actions, or Route Handlers that verify the session first.
5. **Resumes stay with Oscar.** Resume files are private, read only on Oscar's own servers, never
   sent to third-party AI services in this phase, never logged, and deleted completely on request.

## 2. Data model

All tables live in the `public` schema of the Supabase Postgres database and reference
`auth.users(id)` with `on delete cascade`, so deleting an account deletes its data. Migrations are
in `supabase/migrations/` and are the single source of truth for the schema.

```
auth.users ─┬─ profiles               (1:1)  identity + current career facts
            ├─ candidate_preferences  (1:1)  target role, industry, work type, goals
            ├─ education              (1:n)
            ├─ experience             (1:n)
            ├─ projects               (1:n)
            ├─ certifications         (1:n)
            ├─ skills                 (1:n)  ── resume_id ─▶ resumes (set null on delete)
            └─ resumes                (1:n, one current)
                 ├─ resume_parses     (1:1)  what the parser found (no raw text)
                 └─ resume_analyses   (1:n)  reserved for the future analysis worker
```

| Table                   | Purpose and notable columns                                                                                                                                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`              | Personal and career facts: `full_name`, `headline`, `location`, `avatar_path`, `experience_level` (student, entry, mid, senior, lead), `years_of_experience` (0 to 60). Created lazily on first save.                                                           |
| `candidate_preferences` | Career direction and goals: `target_role`, `target_industry`, `work_arrangements` (remote, hybrid, onsite), `goal_position`, `target_companies`, `areas_to_improve`. Created lazily on first save.                                                              |
| `education`             | `institution` (required), `degree`, `field_of_study`, `start_date`, `end_date`, `grade`.                                                                                                                                                                        |
| `experience`            | `company` and `title` (required), `start_date`, `end_date`, `is_current`, `responsibilities`, `achievements`, `technologies`.                                                                                                                                   |
| `projects`              | `name` (required), `description`, `role`, `technologies`, `outcomes`, `url`.                                                                                                                                                                                    |
| `certifications`        | `name` (required), `issuer`, `issued_on`, `expires_on`, `credential_id`, `credential_url`.                                                                                                                                                                      |
| `skills`                | `name`, `category` (programming, frontend, backend, database, cloud, devops, ai_ml, tools, soft_skills), `source` (`user` or `resume`), `resume_id`. Unique per user, case-insensitively.                                                                       |
| `resumes`               | `file_name`, `storage_path`, `file_type` (pdf, docx), `file_size`, `status` (uploaded, processing, processed, failed), `processing_error` (a code, never a message), `parsed_version`, `uploaded_at`, `processed_at`.                                           |
| `resume_parses`         | One row per processed resume: `parser_version`, `email`, `phone`, `links`, `summary`, `detected_sections`, `skill_names`, `word_count`, `page_count`. The extracted text itself is **not** stored.                                                              |
| `resume_analyses`       | Reserved for the analysis worker: `strengths`, `missing_skills`, `experience_gaps`, `role_alignment`, `quality_signals`, `recommendations`, `analyzer_version`, `target_role`. Owners can read; nobody but a future trusted worker can write. No score columns. |

Design notes:

- **Normalized, not one JSON document.** Repeating entities (education, experience, projects,
  certifications, skills) are rows. Short lists of plain strings that are always read and written
  together (technologies on one job, target companies) are `text[]` columns with database checks
  on count and item length.
- **Dates** are `date` columns at month precision (stored as the first of the month), because
  resumes state months, not days. Checks reject an end before a start, and an end date on a
  current role.
- **Constraints mirror validation.** Lengths, enums, URL schemes, date order, and array sizes are
  checked by the server validators and again by `check` constraints, so a bug in one layer cannot
  store invalid data.
- **`updated_at`** is maintained by a trigger on every table.
- **One current resume.** A candidate has one current resume (the newest). Replacing uploads the
  new file first and removes the previous one only after the new one is stored, so a failed
  replacement never leaves the candidate with nothing.

## 3. Access control (RLS)

Every table has RLS enabled. Policies are written per command and target the `authenticated`
role only:

| Table                                                                                                   | select   | insert                    | update                     | delete   |
| ------------------------------------------------------------------------------------------------------- | -------- | ------------------------- | -------------------------- | -------- |
| `profiles`, `candidate_preferences`, `education`, `experience`, `projects`, `certifications`, `resumes` | own rows | own rows                  | own rows (cannot reassign) | own rows |
| `skills`                                                                                                | own rows | own rows; `resume_id` own | own rows; `resume_id` own  | own rows |
| `resume_parses`                                                                                         | own rows | own rows of own resumes   | own rows of own resumes    | own rows |
| `resume_analyses`                                                                                       | own rows | none                      | none                       | none     |

- "Own" means `user_id = (select auth.uid())`. The sub-select form lets Postgres evaluate
  `auth.uid()` once per statement.
- `with check` clauses stop a user from inserting a row for someone else or moving a row to
  another user.
- The `anon` role has no privileges on these tables at all (`revoke all`), so unauthenticated
  requests fail before RLS is even consulted.
- Foreign keys to other user-owned rows (`skills.resume_id`, `resume_parses.resume_id`) are also
  checked for ownership in the policy, because foreign key checks bypass RLS.
- `resumes.storage_path` must start with `user/<user_id>/resume/<id>/` (a check constraint), so a
  metadata row can never point at another user's file.
- The service-role key is not used by the application (development rule 22). A future background
  worker that writes analyses will need it, behind a separate design review.

**Accepted trade-off in this phase.** Resume processing runs in the candidate's own security
context (their session), so the `authenticated` role can update `resumes.status` and write
`resume_parses` for its own resumes. A candidate who called the database API directly with their
own token could therefore alter their own processing results. This affects only their own data.
When processing moves to a background worker, those columns become writable by the worker only.

## 4. Storage

| Bucket    | Visibility | Size limit | Allowed types                                                                                | Object name                                            |
| --------- | ---------- | ---------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `resumes` | Private    | 5 MiB      | `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `user/<userId>/resume/<resumeId>/original.<pdf\|docx>` |
| `avatars` | Private    | 2 MiB      | `image/png`, `image/jpeg`, `image/webp`                                                      | `user/<userId>/avatar/<avatarId>.<png\|jpg\|webp>`     |

- Buckets are private: there are no public URLs. Storage RLS policies on `storage.objects` allow a
  user to read, create, update, and delete objects only under `user/<their id>/resume/` (or
  `/avatar/`).
- The original file name is never part of the object name; it is stored in `resumes.file_name` and
  shown only to its owner.
- Files reach the browser only through authenticated Route Handlers (`GET /resume/file`,
  `GET /profile/avatar`) that verify the session, read through RLS, and respond with
  `Cache-Control: private, no-store` (avatars: `private, no-cache` with an ETag) and
  `X-Content-Type-Options: nosniff`. No signed or public storage URL is ever sent to the browser.

### Deletion and orphan prevention

| Operation      | Order                                                                                                                       | On failure                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Upload         | validate, upload object, insert `resumes` row                                                                               | Row insert fails: the uploaded object is removed before responding                                                                           |
| Replace        | upload the new resume as above, then remove every older resume (object first, then row)                                     | Cleanup failure leaves the older resume in place; it is retried on the next upload or delete                                                 |
| Delete         | remove the object, then delete the row (`resume_parses` cascades; skills keep their data, `resume_id` becomes null)         | Object removal fails: nothing is deleted and the user is told to retry. Row delete fails: retry is safe (removing a missing object succeeds) |
| Sweep          | on every upload and delete, objects under `user/<id>/resume/` that have no row are removed                                  | Logged by code; retried next time                                                                                                            |
| Account delete | rows cascade from `auth.users`; storage objects must be removed by the account deletion flow (not built yet, see section 9) |                                                                                                                                              |

## 5. Upload pipeline

```
Browser (ResumeUploader)                    Route Handler POST /resume/upload
  pick or drop a file                         1. same-origin check (CSRF)
  instant checks: extension, size             2. getCurrentUser(): 401 if signed out
  XMLHttpRequest with upload progress  ──▶    3. parse multipart form (one file field)
                                              4. validateResumeFile(): extension, declared type,
                                                 size, and file signature (magic bytes)
                                              5. upload to storage under the user's folder (RLS)
                                              6. insert resumes row, status "uploaded" (RLS)
                                              7. remove older resumes and orphaned objects
  ◀── 201 { resume } or { error: code }       8. after(): run processing (see section 6)
  router.refresh(); status polling while uploaded/processing
```

File validation (`features/candidate/resume-file.ts`, used by the browser for instant feedback and
by the server authoritatively):

- Extension `.pdf` or `.docx` only. Anything else, including executables and archives, is
  rejected before upload.
- Size between 1 byte and 5 MiB.
- Signature: PDF files must start with `%PDF-`. DOCX files must be ZIP archives whose central
  directory contains `word/document.xml` and `[Content_Types].xml`. A renamed executable, script,
  or other archive fails this check whatever its name or declared type.
- The declared MIME type must match the extension, unless it is empty or
  `application/octet-stream` (what browsers send when they do not recognize a file), which is
  allowed because the signature check is authoritative.
- File names are reduced to a safe display name (no paths or control characters, at most 255
  characters).

## 6. Processing and parsing

Processing is a server-side pipeline with replaceable stages. In Phase 4 it runs in the same
server process right after the upload response is sent (Next.js `after()`); the stage boundaries
are where a queue and a background worker will be introduced later.

```
runResumeProcessing(resume, bytes)
  status: uploaded ─▶ processing
  1. extractText      PDF: unpdf (pdf.js), at most 30 pages
                      DOCX: built-in ZIP reader + WordprocessingML text runs, size and ratio limits
  2. parseResumeText  deterministic extractors over plain text (pure functions)
       ├─ contact     first email, first phone number, profile and portfolio links
       ├─ sections    known headings (summary, experience, education, skills, projects,
       │              certifications, achievements)
       ├─ summary     the text under a summary heading, at most 600 characters
       └─ skills      matches against Oscar's skills catalog (word-boundary, alias-aware)
  3. save             resume_parses row (parser_version 1), status ─▶ processed
  any failure         status ─▶ failed, processing_error = code
                      (unreadable, no_text, encrypted, too_many_pages, storage, internal)
```

What the parser deliberately does **not** extract yet: names, locations, work history entries,
education entries, projects, and certifications. Turning free-form resume layouts into reliable
structured entries needs a model-assisted stage, and an unreliable guess would put wrong
information in front of the candidate. The resume page says plainly which parts are extracted and
which are not.

Rules for the pipeline:

- No client-side parsing. The browser only performs the instant file checks.
- No third-party services. Parsing uses only code that runs inside Oscar's server.
- The extracted text exists only in memory during processing and is discarded.
- Logs carry the resume id, stage, and error code. Never text, field values, or file names.
- Parse output is versioned (`parser_version`, mirrored to `resumes.parsed_version`) so results
  can be recomputed when the parser improves.

## 7. Resume and profile: two sources, one owner

| Data                            | Source                 | Where it is shown                      | How it reaches the profile                                                                                   |
| ------------------------------- | ---------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Profile sections                | Typed by the candidate | `/profile`                             | Directly                                                                                                     |
| Contact details, links, summary | Extracted from resume  | `/resume`, labelled "From your resume" | Not copied. Shown for review only                                                                            |
| Skills found in the resume      | Extracted from resume  | `/resume`, labelled "From your resume" | Only when the candidate chooses "Add to profile"; stored with `source = 'resume'` and shown as "From resume" |

Adding resume skills never changes an existing skill: if the candidate already has a skill with the
same name (case-insensitive), it is skipped.

## 8. Profile completeness

`computeProfileCompleteness()` derives a checklist from stored data only. Each item is either done
or not, with a specific next step:

| Item             | Done when                               | Next step shown           |
| ---------------- | --------------------------------------- | ------------------------- |
| Name             | `profiles.full_name` set                | Add your name             |
| Headline         | `profiles.headline` set                 | Add a headline            |
| Target role      | `candidate_preferences.target_role` set | Add your target role      |
| Experience level | `profiles.experience_level` set         | Add your experience level |
| Education        | at least one education entry            | Add your education        |
| Experience       | at least one experience entry           | Add your work experience  |
| Projects         | at least one project                    | Add your latest project   |
| Skills           | at least three skills                   | Add at least three skills |
| Goals            | at least one area to improve            | Add an area to improve    |
| Resume           | a current resume exists                 | Upload a resume           |

The percentage shown is `done / total`, rounded down, computed on every render. It is labelled as
profile completeness, never as a rating or an assessment of the candidate. Certifications are
optional and do not count.

## 9. Analysis foundation

Resume analysis (strengths, missing skills for the target role, role alignment, experience gaps,
quality signals, recommendations) is **not** built in Phase 4. What exists:

- The `resume_analyses` table and the `ResumeAnalysis` type, with owner-only read access and no
  write access for users. It has no numeric score columns.
- The data layer reads the latest analysis for the current resume; today that is always nothing.
- The resume page shows "Analysis will appear after processing" while a resume is being processed,
  and "Resume analysis is in development" afterwards. Nothing is fabricated in its place.

Before analysis ships, the following must be decided and documented here: the provider and where it
runs, what leaves Oscar's servers (and the Privacy Policy update that says so), retention of
prompts and outputs, how a trusted worker writes results (service role behind review), and how
results are explained to the candidate.

## 10. Privacy

- Collected: profile fields the candidate enters, the resume file, and the extracted fields in
  section 2. The Privacy Policy describes each of these.
- Not collected: the full extracted resume text (discarded after parsing), analytics events.
- Not shared: resume files and profile data are not sent to third parties; the only processors are
  the hosting and Supabase infrastructure already listed in the Privacy Policy.
- Not logged: resume contents, extracted values, file names, or profile field values. Server logs
  carry ids, stages, and error codes only.
- Not exposed: no public or signed storage URLs reach the browser; file downloads go through
  authenticated handlers with `no-store` caching.
- Deletion: deleting a resume removes the file and its metadata and parse results. Profile entries
  can be deleted individually. Account deletion (all rows cascade, storage objects removed by the
  deletion flow) is a deferred decision and not built yet.

## 11. Code map

```
supabase/migrations/            Schema, RLS, storage buckets and policies (source of truth)
src/types/candidate.ts          Candidate domain types and constants (shared)
src/server/supabase/database.ts Typed database schema for the Supabase client
src/server/candidate/           Repositories (profile, resume, storage) and data errors
src/features/candidate/
├── validation.ts               Field and section validators (browser + server)
├── resume-file.ts              Resume and avatar file checks (browser + server)
├── skills-catalog.ts           Skill categories and the catalog used for extraction
├── completeness.ts             Profile completeness from stored data
├── format.ts                   Labels and date formatting (browser + server)
├── processing/                 Pipeline: parse-text.ts (pure), extract-pdf.ts and
│                               extract-docx.ts (server-only), run.ts (status changes)
├── actions.ts                  Server Actions (profile sections, entries, skills, resume)
├── data/                       Server-only: page loaders, resume lifecycle, file handlers
├── components/                 Profile editor, resume page, uploader, completeness
├── index.ts                    Client-safe public API
└── server.ts                   Server-only API (loaders, file handlers, pipeline)
src/lib/zip.ts                  Defensive ZIP directory reader (DOCX detection and reading)
src/app/(app)/profile/          /profile page, GET/POST /profile/avatar
src/app/(app)/resume/           /resume page, POST /resume/upload, GET /resume/file
tests/db/                       RLS and constraint tests on Postgres (PGlite)
tests/support/supabase/         Test database (PGlite + platform shim) and the REST and
                                Storage emulator used by integration and end-to-end tests
```

## 12. Testing strategy

- **Database**: migrations are applied to a real Postgres engine (PGlite, Postgres compiled to
  WebAssembly, run in-process) with a minimal shim of Supabase's `auth` and `storage` schemas.
  Tests switch to the `authenticated` or `anon` role with JWT claims, exactly as Supabase does, and
  verify ownership isolation, anonymous denial, constraints, and storage policies.
- **Integration**: repositories and actions run through the real `@supabase/supabase-js` client
  against an emulator of the REST and Storage APIs backed by the same Postgres, so RLS applies.
- **End-to-end**: Playwright runs the production build against the same emulator plus the mock
  Auth server, covering the profile and resume flows and two-user isolation.
- **Parsing**: text extraction and parsing are tested with generated PDF and DOCX fixtures of a
  fictional candidate (labelled test fixtures).
