# Architecture

This document records the architecture of Oscar 2.0 and every assumption made while building it.
Anything not written here has **not** been decided yet.

| Phase | Scope                                     | Status   |
| ----- | ----------------------------------------- | -------- |
| 0     | Foundation: tooling, structure, docs      | Complete |
| 1     | Design system and reusable UI foundation  | Complete |
| 2     | Landing page, legal pages, authentication | Complete |

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

## 3. Source layout

```
src/
├── app/                 Routing only: pages, layouts, route handlers. Thin.
│   ├── (marketing)/     Public pages with site header/footer: /, /privacy, /terms, /contact
│   ├── (auth)/          /login, /signup (split-screen auth layout)
│   ├── (app)/           Signed-in area: /app (protected placeholder)
│   ├── auth/confirm/    Email confirmation route handler
│   └── design-system/   Development-only component playground
├── components/          Shared, presentation-only components (ui, oscar, layout, icons)
├── features/            Product domains, one folder each
│   ├── auth/            Validation, error mapping, route policy, actions, forms, session DAL
│   ├── marketing/       Landing page sections, header, footer, and their copy (content.ts)
│   └── legal/           Privacy Policy, Terms, contact configuration
├── server/              Server-only adapters to external systems
│   └── supabase/        Config, cookie policy, request client, proxy session refresh
├── styles/              Design tokens, typography roles, motion utilities
├── config/              Static, non-secret configuration (site name, metadata)
├── lib/                 Pure utilities (env access, class names, motion constants)
├── types/               Shared cross-feature types
└── proxy.ts             Next.js Proxy (formerly middleware): session refresh + route guard
tests/
├── unit/, components/, features/, server/, pages/, design-system/   Vitest (jsdom or node)
└── e2e/                 Playwright specs + a mock Supabase Auth server (test fixture)
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
| Database           | `src/server/db`                                  | Supabase Postgres or other, schema, migrations, RLS       |
| AI                 | `src/server/ai` (provider-agnostic interface)    | Provider(s), streaming model, cost controls               |
| Realtime interview | `src/features/interview`, `src/server/realtime`  | Transport (WebSocket/WebRTC/SSE), hosting constraints     |
| Coding environment | `src/features/coding`                            | Editor, sandboxed execution strategy                      |
| Evaluation         | `src/features/evaluation`                        | Rubric model, scoring pipeline                            |
| Analytics          | `src/features/analytics`, `src/server/analytics` | Vendor vs. self-hosted (Privacy Policy must change first) |

The AI layer will sit behind an internal interface so the provider can be swapped; no provider
names or branding appear in user-facing code.

## 4. Configuration and secrets

All variables are listed in `.env.example` with empty placeholders.

| Variable                   | Exposure                   | Purpose                                                             |
| -------------------------- | -------------------------- | ------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`      | Public                     | Absolute URLs for metadata and the email confirmation link          |
| `SUPABASE_URL`             | Server only                | Supabase project URL                                                |
| `SUPABASE_PUBLISHABLE_KEY` | Server only                | Publishable (or legacy anon) key. Never the secret/service-role key |
| `CONTACT_EMAIL`            | Server only, read at build | Public contact address on /contact and in legal pages               |

- Supabase values are deliberately **not** `NEXT_PUBLIC_`: Oscar never creates a Supabase client in
  the browser, so the browser never receives the project URL or key.
- `src/lib/env.ts` provides `readEnv` / `requireEnv`. Missing auth config is detected at runtime;
  the app then reports "sign-in temporarily unavailable" (production) or shows a setup notice
  (development) instead of crashing.

## 5. Quality gates

| Gate           | Tool                                                                                     | Command                |
| -------------- | ---------------------------------------------------------------------------------------- | ---------------------- |
| Types          | `tsc` strict + extra checks                                                              | `npm run typecheck`    |
| Lint           | ESLint 9 flat config, zero warnings                                                      | `npm run lint`         |
| Format         | Prettier 3                                                                               | `npm run format:check` |
| Unit/component | Vitest + Testing Library (jsdom or node per file); token contrast and design-rule guards | `npm run test`         |
| Build          | `next build`                                                                             | `npm run build`        |
| End-to-end     | Playwright against the production build and a mock Supabase Auth API                     | `npm run test:e2e`     |

`npm run check` runs the first five. `npm run test:e2e` builds and starts the app itself.

## 6. Routes

| Route                            | Rendering         | Access                                            | Purpose                                          |
| -------------------------------- | ----------------- | ------------------------------------------------- | ------------------------------------------------ |
| `/`                              | Static            | Public                                            | Landing page                                     |
| `/privacy`, `/terms`, `/contact` | Static            | Public                                            | Legal and contact pages                          |
| `/login`                         | Partial prerender | Guests (signed-in users are redirected to `/app`) | Log in                                           |
| `/signup`                        | Static            | Guests (signed-in users are redirected to `/app`) | Create an account                                |
| `/app`                           | Partial prerender | Signed-in users                                   | Protected placeholder for the future workspace   |
| `/auth/confirm`                  | Dynamic           | Public                                            | Email confirmation (PKCE `code` or `token_hash`) |
| `/api/health`                    | Static            | Public                                            | Liveness probe                                   |
| `/design-system`                 | Static            | Development only (404 in production)              | Component playground                             |
| `/robots.txt`                    | Static            | Public                                            | Disallows `/app`, `/auth/`, `/design-system`     |

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
   └──── redirect ◀──── /app ◀── proxy.ts (refresh + guard) ◀── Supabase Auth (getUser)
                            └── requireUser() in the page (DAL, authoritative)
```

| Concern                       | Implementation                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Credentials                   | Sent only to Server Actions; passed to Supabase; never stored or logged by Oscar                                                                       |
| Validation                    | `features/auth/validation.ts`, shared by the browser (instant feedback) and Server Actions (authoritative)                                             |
| Session storage               | Supabase session in `sb-<project>-auth-token` cookies: **httpOnly**, `SameSite=Lax`, `Secure` in production                                            |
| Session refresh               | `src/proxy.ts` runs on `/app/*`, `/login`, `/signup`; refreshes tokens and writes cookies                                                              |
| Route guard (optimistic)      | Proxy: anonymous users on `/app/*` go to `/login?next=…`; signed-in users on `/login`/`/signup` go to `/app`                                           |
| Authorization (authoritative) | `requireUser()` / `getCurrentUser()` in `features/auth/session.ts` (Data Access Layer) verify the user with `supabase.auth.getUser()` on every request |
| Expired/revoked sessions      | Proxy clears the cookies and redirects to `/login?notice=session_expired`                                                                              |
| Provider outage               | Proxy denies protected pages but keeps the cookies, so the session survives the outage                                                                 |
| Open redirects                | `safeRedirectPath()` only accepts same-origin paths inside `/app`                                                                                      |
| Errors                        | `describeAuthError()` maps provider codes to fixed, user-safe messages; logs carry only error name, status, and code                                   |
| Email confirmation            | `signUp` sets `emailRedirectTo` to `/auth/confirm`; the route handles PKCE `code` and `token_hash` links                                               |
| Logout                        | Form POST to a Server Action; `signOut({ scope: "local" })`, then session cookies are deleted even if the provider is unreachable                      |

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

## 9. Deferred decisions

Hosting/deployment target, CI provider, a nonce-based Content Security Policy, password reset,
OAuth providers, account deletion UI, automated accessibility checks in CI (axe), final logo and
brand assets, logging and error monitoring, i18n, and legal review of the Privacy Policy and Terms
(operating entity, governing law, minimum age). Each is added when the phase that needs it begins,
and recorded here.
