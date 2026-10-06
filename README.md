# Oscar 2.0

Oscar is an AI interview coach in development. This repository is its web application, built on
Next.js (App Router) and TypeScript.

> **Status: Phase 4 complete.** Foundation (Phase 0), design system (Phase 1), landing page and
> authentication (Phase 2), the application shell (Phase 3), and now resume intelligence and the
> candidate profile: a section-by-section profile editor, private resume upload with server-side
> processing, profile completeness, and the database schema with Row Level Security. Interviews,
> roadmaps, practice, and resume analysis are not built yet, and the UI says so.

## Tech stack

| Concern         | Choice                                               |
| --------------- | ---------------------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack, Cache Components) |
| Language        | TypeScript 5 (strict mode + extra checks)            |
| UI runtime      | React 19                                             |
| Styling         | CSS custom properties (tokens) + CSS Modules         |
| Fonts           | Geist Sans / Geist Mono, self-hosted                 |
| Authentication  | Supabase Auth via `@supabase/ssr` (server-side only) |
| Database, files | Supabase Postgres (RLS) and private Supabase Storage |
| Resume reading  | `unpdf` (pdf.js) for PDF; built-in reader for DOCX   |
| Linting         | ESLint 9 (flat config) + `eslint-config-next`        |
| Formatting      | Prettier 3                                           |
| Testing         | Vitest + Testing Library; Playwright for end-to-end  |
| Test database   | PGlite (Postgres in WebAssembly) for RLS tests       |
| Package manager | npm (lockfile committed)                             |

## Requirements

- Node.js **22** (see `.nvmrc`; Next.js 16 needs ≥ 20.9)
- npm 10+
- A Supabase project for authentication, the database, and file storage (free tier is fine)

## Getting started

```bash
npm ci                        # install exact locked dependencies
cp .env.example .env.local    # then fill in values locally (never commit .env.local)
npm run dev                   # http://localhost:3000
```

### Configure authentication

1. Create a Supabase project.
2. In **Project Settings > API**, copy the project URL and the **publishable** key (or the legacy
   anon key) into `.env.local` as `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Never use the
   secret or service-role key.
3. In **Authentication > URL Configuration**, set the Site URL to your `NEXT_PUBLIC_APP_URL` and
   add `<NEXT_PUBLIC_APP_URL>/auth/confirm` to the Redirect URLs.
4. Apply the database migrations in `supabase/migrations/` (see
   [`supabase/README.md`](supabase/README.md)): `supabase link` then `supabase db push`, or run
   each file in order in the SQL editor. They create the tables, Row Level Security policies, and
   the private `resumes` and `avatars` storage buckets.
5. Restart the dev server.

Without these values the site still runs: marketing pages work, the auth pages show a setup notice
in development, and sign-in reports "temporarily unavailable" in production.

Useful URLs: `/` (landing), `/login`, `/signup`, `/dashboard` (signed-in workspace; also
`/profile` and `/resume`, plus `/interviews`, `/roadmap`, `/practice/*`, `/settings`),
`/design-system` (development only), `/api/health` (returns `{"status":"ok"}`).

## Scripts

| Script                 | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | Start the development server                                     |
| `npm run build`        | Production build                                                 |
| `npm run start`        | Serve the production build                                       |
| `npm run clean`        | Delete `.next` (build output and dev caches)                     |
| `npm run typecheck`    | Generate Next.js route types, then run `tsc --noEmit`            |
| `npm run lint`         | ESLint, failing on any warning                                   |
| `npm run lint:fix`     | ESLint with auto-fix                                             |
| `npm run format`       | Format all files with Prettier                                   |
| `npm run format:check` | Verify formatting without writing                                |
| `npm run test`         | Run unit, component, integration, and RLS tests once             |
| `npm run test:watch`   | Run unit and component tests in watch mode                       |
| `npm run test:e2e`     | Build, start, and run Playwright end-to-end tests against a mock |
| `npm run check`        | Typecheck, lint, format check, unit tests, and build, in order   |

### Database and RLS tests

`npm run test` includes `tests/db/rls.test.ts`, which applies `supabase/migrations/` to PGlite
(Postgres compiled to WebAssembly, in-process) and checks that each user can only reach their
own rows and files, that anonymous requests are refused, and that constraints hold. Integration
tests (`tests/server/candidate-*.test.ts`) run the repositories, Server Actions, and upload
handlers through the real Supabase client against the same database. Nothing to install.

### End-to-end tests

`npm run test:e2e` builds the app, starts it on port 3100, and starts a local stand-in for a
Supabase project on port 54329 (`tests/e2e/mock-supabase/server.mts`): an in-memory Auth API,
plus the Data and Storage APIs running on PGlite with the real migrations, so Row Level Security
is enforced exactly as in production. No real credentials or network access are needed. If
Playwright's bundled Chromium is not installed, point it at an existing build:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium npm run test:e2e
```

## Project structure

```
.
├── docs/                    Architecture, design system, candidate intelligence, rules, QA
├── supabase/migrations/     Database schema, RLS policies, storage buckets (source of truth)
├── src/
│   ├── app/                 Routes only: (marketing), (auth), (app) workspace, auth/*, design-system
│   ├── components/          Shared UI: ui/, oscar/, layout/, icons/
│   ├── config/              Static, non-secret app configuration
│   ├── features/
│   │   ├── auth/            Validation, errors, route policy, actions, forms, session DAL
│   │   ├── workspace/       App shell, navigation, dashboard, area pages, data loading
│   │   ├── candidate/       Profile editor, resume upload and processing, completeness
│   │   ├── marketing/       Landing page sections and copy
│   │   └── legal/           Privacy Policy, Terms, contact configuration
│   ├── lib/                 Framework-agnostic utilities
│   ├── server/supabase/     Server-only Supabase adapters (client, session, database types)
│   ├── server/candidate/    Repositories and private file storage (RLS-scoped)
│   ├── styles/              Design tokens, typography roles, motion utilities
│   ├── types/               Domain model (domain.ts) and candidate model (candidate.ts)
│   └── proxy.ts             Session refresh and route guard
└── tests/                   Vitest suites (incl. tests/db RLS), Playwright e2e (tests/e2e),
                             and test support (tests/support: PGlite + Supabase emulator)
```

See [`docs/architecture.md`](docs/architecture.md) for the reasoning behind this layout and the
authentication design.

## Documentation

- [Architecture](docs/architecture.md)
- [Design system](docs/design-system.md) (source of truth for all UI)
- [Candidate intelligence](docs/candidate-intelligence.md) (profile, resumes, storage, RLS, privacy)
- [Development rules](docs/development-rules.md)
- QA checklists: [Phase 0](docs/qa/phase-0.md), [Phase 1](docs/qa/phase-1.md),
  [Phase 2](docs/qa/phase-2.md), [Phase 3](docs/qa/phase-3.md), [Phase 4](docs/qa/phase-4.md)

## Environment variables

All variables are documented in [`.env.example`](.env.example), which contains placeholders only.
Real values belong in `.env.local` (git-ignored) or the deployment platform's secret store.
Supabase values are server-only by design; do not rename them to `NEXT_PUBLIC_*`.

## Troubleshooting

**The dev server reloads the page over and over.** Next.js 16.4's Turbopack dev cache can
occasionally get out of sync (the browser console shows `HMR hash mismatch` on a framework chunk).
It only affects `npm run dev`, never production. Stop the dev server, run `npm run clean`, and
start it again.

**"Authentication is not configured" on /login.** Set `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY` in `.env.local` and restart the dev server.

**The profile or resume page shows "Something went wrong".** The database migrations have probably
not been applied to the Supabase project. Apply `supabase/migrations/` (see above).
