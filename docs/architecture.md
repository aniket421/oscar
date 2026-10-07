# Architecture

This document records the architecture of Oscar 2.0 and every assumption made while building it.
Anything not written here has **not** been decided yet.

| Phase | Scope                                     | Status   |
| ----- | ----------------------------------------- | -------- |
| 0     | Foundation: tooling, structure, docs      | Complete |
| 1     | Design system and reusable UI foundation  | Complete |
| 2     | Landing page, legal pages, authentication | Complete |
| 3     | Application shell and dashboard           | Complete |
| 4     | Resume intelligence and candidate profile | Complete |

## 1. Goals

1. A stable, production-ready Next.js + TypeScript baseline.
2. A folder layout that lets future systems (AI, realtime interview, database, coding environment,
   evaluation, analytics) be added as isolated modules without restructuring.
3. Automated quality gates (typecheck, lint, format, unit tests, build, end-to-end) on every change.
4. No fake data, invented claims, or secrets in the repository.

## 2. Runtime and framework

| Decision                                     | Rationale                                                                                                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Next.js 16.4 (App Router)**                | Current stable major. Server Components, Server Actions, Route Handlers, and Proxy are the primitives auth and future features build on.                                                                     |
| **React 19.3**                               | Version pinned by Next.js 16.                                                                                                                                                                                |
| **TypeScript 5.9**                           | Stable line supported by `typescript-eslint`. TypeScript 7 (native) not adopted yet.                                                                                                                         |
| **Node.js 22 LTS**                           | Pinned in `.nvmrc`; `engines` enforces Next.js's minimum (≥ 20.9).                                                                                                                                           |
| **npm**                                      | `package-lock.json` is committed for reproducible installs.                                                                                                                                                  |
| **`cacheComponents` + `partialPrefetching`** | Next.js 16.4 defaults, kept. Consequences: request-time reads (cookies, search params, session) must sit behind `<Suspense>`; the current time must come from a `"use cache"` scope or after `connection()`. |
| **CSS custom properties + CSS Modules**      | Phase 1. Zero runtime, zero dependencies; one token file; themes re-map tokens with one attribute. See `docs/design-system.md`.                                                                              |
| **Geist via `geist` (`next/font/local`)**    | Phase 1. Self-hosted fonts; no external font requests at build or run time.                                                                                                                                  |
| **No headless UI library**                   | Phase 1. Components use native elements plus small, tested keyboard handling.                                                                                                                                |
| **Supabase Auth via `@supabase/ssr`**        | Phase 2. See section 8.                                                                                                                                                                                      |
| **Supabase Postgres + Storage**              | Phase 4. Same project as auth, so RLS can use `auth.uid()`. Migrations in `supabase/migrations/`; accessed only with the user's session. See section 10 and `docs/candidate-intelligence.md`.                |
| **`unpdf` (pdf.js) for PDF text**            | Phase 4. Mozilla's PDF engine in a serverless build; runs in-process, no native code, no third-party service. DOCX is read with a small built-in ZIP reader and `node:zlib`, so no second dependency.        |
| **PGlite (dev only)**                        | Phase 4. Postgres compiled to WebAssembly: the real migrations and RLS policies run in tests and the end-to-end mock with no database to install.                                                            |

## 3. Source layout

```
src/
├── app/                 Routing only: pages, layouts, route handlers. Thin.
│   ├── (marketing)/     Public pages with site header/footer: /, /privacy, /terms, /contact
│   ├── (auth)/          /login, /signup (split-screen auth layout)
│   ├── (app)/           Signed-in workspace: /dashboard, /interviews, /resume, /roadmap,
│   │                    /practice/*, /profile, /settings (+ loading.tsx, error.tsx);
│   │                    file handlers /resume/upload, /resume/file, /profile/avatar
│   ├── auth/confirm/    Email confirmation route handler
│   ├── auth/logout/     Logout route handler (plain form POST, full page reload)
│   └── not-found.tsx    Designed 404
│   └── design-system/   Development-only component playground
├── components/          Shared, presentation-only components (ui, oscar, layout, icons)
├── features/            Product domains, one folder each
│   ├── auth/            Validation, error mapping, route policy, actions, forms, session DAL
│   ├── workspace/       App shell, navigation, dashboard, area pages, data loading (snapshot)
│   ├── candidate/       Profile and resume: validation, completeness, processing, actions, UI
│   ├── marketing/       Landing page sections, header, footer, and their copy (content.ts)
│   └── legal/           Privacy Policy, Terms, contact configuration
├── server/              Server-only adapters to external systems
│   ├── supabase/        Config, cookie policy, request client, database types, proxy, sign-out
│   └── candidate/       Repositories and private storage, scoped by RLS
├── styles/              Design tokens, typography roles, motion utilities
├── config/              Static, non-secret configuration (site name, metadata)
├── lib/                 Pure utilities (env access, class names, motion constants)
├── types/               Shared cross-feature types (domain.ts, candidate.ts)
└── proxy.ts             Next.js Proxy (formerly middleware): session refresh + route guard
supabase/migrations/     Schema, RLS policies, storage buckets (source of truth)
tests/
├── unit/, components/, features/, server/, pages/, design-system/   Vitest (jsdom or node)
├── db/                  RLS and constraint tests on Postgres (PGlite)
├── support/supabase/    Test database (PGlite + platform shim) and REST/Storage emulator
└── e2e/                 Playwright specs + a mock Supabase project (test fixture)
```

### Dependency direction

```
app  ──▶  features  ──▶  components, lib, config, types, styles
              │
              └──────▶  server (server-only adapters)
```

- `app/` may import anything; nothing imports from `app/` (tests excepted).
- `features/*` may import shared layers and `server/`, never another feature's internals.
- `server/` never imports from `features/` or `app/`. It wraps external systems only.
- `components/`, `lib/`, `config/`, `types/`, `styles/` never import from `features/` or `server/`.
- Server-only modules start with `import "server-only"`, so importing one into a client bundle
  fails the build. Feature server code is exposed through a separate entry point
  (`@/features/auth/server`), never through the feature's main `index.ts`.

### Planned modules (not built)

| Future system      | Likely location                                  | Open decisions                                            |
| ------------------ | ------------------------------------------------ | --------------------------------------------------------- |
| AI                 | `src/server/ai` (provider-agnostic interface)    | Provider(s), streaming model, cost controls, resume data  |
| Realtime interview | `src/features/interview`, `src/server/realtime`  | Transport (WebSocket/WebRTC/SSE), hosting constraints     |
| Coding environment | `src/features/coding`                            | Editor, sandboxed execution strategy                      |
| Evaluation         | `src/features/evaluation`                        | Rubric model, scoring pipeline                            |
| Analytics          | `src/features/analytics`, `src/server/analytics` | Vendor vs. self-hosted (Privacy Policy must change first) |

The AI layer will sit behind an internal interface so the provider can be swapped; no provider
names or branding appear in user-facing code.

## 4. Configuration and secrets

All variables are listed in `.env.example` with empty placeholders.

| Variable                               | Exposure                   | Purpose                                                                   |
| -------------------------------------- | -------------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                  | Public                     | Absolute URLs for metadata and the email confirmation link                |
| `NEXT_PUBLIC_SUPABASE_URL`             | Read on the server only    | Supabase project URL (older name: `SUPABASE_URL`)                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Read on the server only    | Publishable (or legacy anon) key (older name: `SUPABASE_PUBLISHABLE_KEY`) |
| `SUPABASE_SECRET_KEY`                  | Never read by the app      | Operator tooling only; bypasses RLS, so the application must not use it   |
| `CONTACT_EMAIL`                        | Server only, read at build | Public contact address on /contact and in legal pages                     |

- The Supabase names follow Supabase's `NEXT_PUBLIC_*` convention, but Oscar never creates a
  Supabase client in the browser and reads them by name at run time in `server/supabase/config.ts`
  (a static `process.env.NEXT_PUBLIC_*` reference would be inlined into a bundle). Tests fail if a
  client component mentions them, if any code inlines them, or if application code reads
  `SUPABASE_SECRET_KEY`.
- The app refuses a secret key or service-role JWT in the publishable slot (fail closed), since it
  would bypass Row Level Security for every request.
- Test isolation: Vitest blanks every Supabase variable, and `playwright.config.ts` pins the app
  under test to the mock (explicit values beat `.env.local`; the secret key is blanked).
- `src/lib/env.ts` provides `readEnv` / `requireEnv`. Missing auth config is detected at runtime;
  the app then reports "sign-in temporarily unavailable" (production) or shows a setup notice
  (development) instead of crashing.

## 5. Quality gates

| Gate           | Tool                                                                                                                                                         | Command                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Types          | `tsc` strict + extra checks                                                                                                                                  | `npm run typecheck`    |
| Lint           | ESLint 9 flat config, zero warnings                                                                                                                          | `npm run lint`         |
| Format         | Prettier 3                                                                                                                                                   | `npm run format:check` |
| Unit/component | Vitest + Testing Library (jsdom or node per file); token contrast and design-rule guards; RLS tests on PGlite; integration tests through the Supabase client | `npm run test`         |
| Build          | `next build`                                                                                                                                                 | `npm run build`        |
| End-to-end     | Playwright against the production build and a mock Supabase Auth API                                                                                         | `npm run test:e2e`     |

`npm run check` runs the first five. `npm run test:e2e` builds and starts the app itself.

## 6. Routes

| Route                                                             | Rendering           | Access                                      | Purpose                                                     |
| ----------------------------------------------------------------- | ------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| `/`                                                               | Static              | Public                                      | Landing page                                                |
| `/privacy`, `/terms`, `/contact`                                  | Static              | Public                                      | Legal and contact pages                                     |
| `/login`                                                          | Partial prerender   | Guests (signed-in users go to `/dashboard`) | Log in                                                      |
| `/signup`                                                         | Static              | Guests (signed-in users go to `/dashboard`) | Create an account                                           |
| `/dashboard`                                                      | Partial prerender   | Signed-in users                             | Workspace overview                                          |
| `/interviews`, `/interviews/new`                                  | Partial prerender   | Signed-in users                             | Interview history; interview setup placeholder              |
| `/resume`                                                         | Partial prerender   | Signed-in users                             | Current resume, upload, findings, analysis state            |
| `/resume/upload`                                                  | Dynamic (POST only) | Signed-in, same-origin                      | Resume upload (multipart), validated, then processed        |
| `/resume/file`                                                    | Dynamic             | Signed-in owner                             | Download of the current resume (`private, no-store`)        |
| `/roadmap`                                                        | Partial prerender   | Signed-in users                             | Area page (empty state until its phase)                     |
| `/practice/technical`, `/practice/behavioral`, `/practice/coding` | Partial prerender   | Signed-in users                             | Practice areas (empty states until their phases)            |
| `/profile`                                                        | Partial prerender   | Signed-in users                             | Section-by-section candidate profile and completeness       |
| `/profile/avatar`                                                 | Dynamic (GET, POST) | Signed-in owner; POST same-origin           | Profile photo download (revalidated) and upload             |
| `/settings`                                                       | Partial prerender   | Signed-in users                             | Account details, session, privacy links                     |
| `/app`, `/app/*`                                                  | Redirect (308)      | -                                           | Phase 2 placeholder address, now `/dashboard`               |
| `/auth/confirm`                                                   | Dynamic             | Public                                      | Email confirmation (PKCE `code` or `token_hash`)            |
| `/auth/logout`                                                    | Dynamic (POST only) | Same-origin form POST                       | Ends the session; 303 to `/login` with a full page load     |
| `/api/health`                                                     | Static              | Public                                      | Liveness probe                                              |
| `/design-system`                                                  | Static              | Development only (404 in production)        | Component playground                                        |
| `/robots.txt`                                                     | Static              | Public                                      | Disallows the workspace, `/app`, `/auth/`, `/design-system` |
| anything else                                                     | Static              | Public                                      | Designed 404 page                                           |

Workspace pages prerender a static shell (navigation, page header) that contains no user data; the
user's data streams in behind `<Suspense>` after the page verifies the session. Authenticated
responses are sent with `Cache-Control: private, no-store`.

All responses carry baseline security headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Permissions-Policy` denying camera, microphone, geolocation). The voice/video
phase must relax `Permissions-Policy` for camera and microphone on the interview routes.

## 7. Landing page

- Fully static: no session reads, no request-time data, one small client component (mobile menu).
- Copy lives in `src/features/marketing/content.ts` so it can be reviewed in one place.
- Capabilities are labelled "In development". The interview preview is an `inert` figure with a
  text alternative, so it cannot be mistaken for, or operated as, a working interface.
- No testimonials, logos, user counts, or statistics. Tests assert this.

## 8. Authentication

**Provider:** Supabase Auth (email + password), integrated with `@supabase/ssr`. No OAuth providers
are configured, and none are shown in the UI.

```
Browser ──form POST──▶ Server Action (login/signup/logout) ──▶ Supabase Auth
   ▲                         │ sets httpOnly session cookies
   │                         ▼
   └──── redirect ◀── /dashboard ◀── proxy.ts (refresh + guard) ◀── Supabase Auth (getUser)
                            └── requireUser() in the page (DAL, authoritative)
```

| Concern                       | Implementation                                                                                                                                                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Credentials                   | Sent only to Server Actions; passed to Supabase; never stored or logged by Oscar                                                                                                                                                         |
| Validation                    | `features/auth/validation.ts`, shared by the browser (instant feedback) and Server Actions (authoritative)                                                                                                                               |
| Session storage               | Supabase session in `sb-<project>-auth-token` cookies: **httpOnly**, `SameSite=Lax`, `Secure` in production                                                                                                                              |
| Session refresh               | `src/proxy.ts` runs on every protected area plus `/login` and `/signup`; refreshes tokens and writes cookies                                                                                                                             |
| Route guard (optimistic)      | Proxy: anonymous users on protected areas go to `/login?next=…`; signed-in users on `/login`/`/signup` go to `/dashboard`                                                                                                                |
| Authorization (authoritative) | `requireUser()` / `getCurrentUser()` in `features/auth/session.ts` (Data Access Layer) verify the user with `supabase.auth.getUser()` on every request                                                                                   |
| Expired/revoked sessions      | Proxy clears the cookies and redirects to `/login?notice=session_expired`                                                                                                                                                                |
| Provider outage               | Proxy denies protected pages but keeps the cookies, so the session survives the outage                                                                                                                                                   |
| Open redirects                | `safeRedirectPath()` only accepts same-origin paths inside the protected areas                                                                                                                                                           |
| Errors                        | `describeAuthError()` maps provider codes to fixed, user-safe messages; logs carry only error name, status, and code                                                                                                                     |
| Email confirmation            | `signUp` sets `emailRedirectTo` to `/auth/confirm`; the route handles PKCE `code` and `token_hash` links                                                                                                                                 |
| Logout                        | Plain form POST to `/auth/logout` (same-origin check): `signOut({ scope: "local" })`, session cookies expired on the response even if the provider is unreachable, then a 303 to `/login` that the browser follows with a full page load |
| Protected areas               | `protectedPrefixes` in `features/auth/routes.ts` is the single list; a test keeps the proxy matcher in sync with it                                                                                                                      |
| Hidden pages (Activity)       | Auth forms are wrapped in `ResetOnHide`, so a hidden login page never keeps a typed password or a stale error                                                                                                                            |

Why `getUser()` and not `getClaims()`: it asks Supabase Auth to validate the token, so revoked
sessions are caught immediately. It costs one request per protected navigation; the proxy only runs
on auth-relevant routes, so marketing pages stay static. Revisit when traffic grows.

**Supabase project settings required:**

- Authentication > URL Configuration: Site URL = `NEXT_PUBLIC_APP_URL`; add
  `<NEXT_PUBLIC_APP_URL>/auth/confirm` to Redirect URLs.
- Email confirmation can be on (users see "Check your email") or off (users are signed in
  immediately). Both paths are implemented and tested.
- Password policy: Oscar enforces at least 8 characters with a letter and a number; Supabase may
  enforce more (weak and breached passwords are reported to the user).

### Phase 3 changes to authentication (and why)

| Change                                                                                                 | Reason                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Default destination `/app` → `/dashboard`; `/app` redirects                                            | The workspace now has real routes; old links keep working                                                                                                                                                                                                                                  |
| Logout moved from a Server Action to a plain POST route handler                                        | Next.js keeps visited pages mounted but hidden (React `<Activity>`). A Server Action redirect is a client navigation, so the previous user's pages, with their name and email, stayed in the DOM after logout. A plain form POST ends with a full page load, which clears all client state |
| Session cookies are expired with `Max-Age=0` and `Expires` in the past, written on the response itself | Writing through `cookies()` in a Route Handler let a later merge drop the expiry, leaving an empty session cookie instead of deleting it                                                                                                                                                   |
| `ResetOnHide` around the login and signup forms                                                        | A hidden login page could otherwise keep a typed password and a stale error message                                                                                                                                                                                                        |
| `AuthUser.createdAt`                                                                                   | Shown as "member since" on the profile page                                                                                                                                                                                                                                                |

### Phase 4 changes to authentication (and why)

| Change                                                                                 | Reason                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The proxy redirects only signed-out page loads (GET, HEAD); other methods pass through | A redirect answer to a Server Action or upload POST is replayed as a POST to `/login`. Every action and handler verifies the session itself (rule 21) and answers in its caller's format: an action redirect, or a 401 JSON response. |
| File Route Handlers check the request's origin (`isSameOriginRequest`)                 | Next.js checks the origin of Server Actions, not of Route Handlers; uploads are mutations and get the same CSRF protection.                                                                                                           |

## 9. Workspace (Phase 3)

```
(app)/layout.tsx ── DashboardShell
                     ├── Sidebar (≥ 1024px): grouped NavList, aria-current on the active page
                     ├── AppHeader: MobileNavigation (< 1024px, modal Drawer), context line,
                     │              Start interview, ProfileMenu (Profile, Settings, Log out)
                     └── <main id="workspace-main"> page content
page.tsx ── PageHeader (static) + <Suspense> ── getWorkspaceSnapshot(path)
                                                 ├── requireUser(path)  (verifies the session)
                                                 └── loadWorkspaceSnapshot(user, source)
```

- **Navigation** is data (`features/workspace/navigation.ts`); every href is a protected route
  (tested).
- **Data model**: `src/types/domain.ts` defines `UserProfile`, `Interview`, `InterviewConfig`,
  `InterviewSession`, `InterviewTurn`, `Resume`, `Skill`, `Roadmap`, `RoadmapStep`, and
  `PracticeSession`. No score fields: the evaluation model is still an open decision.
- **Data access**: pages depend only on `WorkspaceDataSource`. Since Phase 4,
  `createDatabaseDataSource` reads the profile summary and current resume from the database with
  the user's session; interviews, roadmaps, and practice are not stored yet and stay empty.
  `unconnectedDataSource` is used only when Supabase is not configured. Every query takes the
  verified user's id.
- **Availability flags** (`features/workspace/availability.ts`): `resume` is `true` since Phase 4;
  the others are still `false`. The UI reads these to label areas ("Later", "Available later",
  "In development") instead of faking functionality. Each later phase flips its own flag.
- **Derived state only**: the preparation path is computed from stored records
  (`derivePreparationSteps`). With no data, every step is "Not started".
- **States**: route-level `loading.tsx` (skeleton) and `error.tsx` (plain-language error, retry,
  link to overview; never shows error details); per-region skeletons inside each Suspense boundary.
- **Notifications**: not built. There is nothing real to notify about yet; a notification
  foundation will be added with the first feature that produces events.

## 10. Candidate intelligence (Phase 4)

The full design is in [`docs/candidate-intelligence.md`](candidate-intelligence.md). In brief:

```
/profile, /resume (Server Components) ── loadProfilePage / loadResumePage
   │                                        └── requireUser(path), then repositories
   ├── forms ──▶ Server Actions (features/candidate/actions.ts): requireUser, validate, write
   └── uploader (XHR, progress) ──▶ POST /resume/upload: origin check, session, file checks,
                                     storage upload, metadata row, then after(): processing
repositories (server/candidate) ──▶ Supabase Data API + Storage with the user's JWT ──▶ RLS
```

- **Ownership is enforced by the database.** RLS on every table and on `storage.objects`; the
  application never uses the service-role key. Tests prove isolation on a real Postgres engine.
- **Normalized schema**: `profiles`, `candidate_preferences`, `education`, `experience`,
  `projects`, `certifications`, `skills`, `resumes`, `resume_parses`, `resume_analyses`.
- **Files are private** and reach the browser only through authenticated handlers; no storage
  URL is ever sent to the client.
- **Processing is server-side and deterministic** (no third-party services): text extraction,
  then contact details, sections, summary, and catalog skills. The full text is never stored.
- **Statuses**: `uploaded`, `processing`, `processed`, `failed` (with an error code).
- **Profile completeness** is computed from stored data on every render and never presented as
  a rating. Resume analysis is a typed, read-only foundation with no output yet.

## 11. Deferred decisions

Hosting/deployment target, CI provider, a nonce-based Content Security Policy, password reset,
OAuth providers, account deletion (including removal of storage objects; rows already cascade),
notifications, automated accessibility checks in CI (axe), final logo and brand assets, logging
and error monitoring, i18n, and legal review of the Privacy Policy and Terms (operating entity,
governing law, minimum age). From Phase 4: a background worker and job queue for resume processing
(with a service-role design review), the resume analysis provider and its privacy terms,
model-assisted extraction of work history and education, upload rate limiting, malware scanning
of uploaded files, and image resizing for profile photos. Each is added when the phase that needs
it begins, and recorded here.
