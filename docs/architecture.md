# Architecture — Phase 0

This document records the initial architecture of Oscar 2.0 and every assumption made while
setting it up. Anything not written here has **not** been decided yet.

## 1. Goals of the foundation

1. A stable, production-ready Next.js + TypeScript baseline.
2. A folder layout that lets future systems — AI, realtime interview, authentication, database,
   coding environment, evaluation, analytics — be added as isolated modules without restructuring.
3. Automated quality gates (typecheck, lint, format, test, build) from day one.
4. Zero product features, fake data, or secrets in the repository.

## 2. Runtime and framework

| Decision                                             | Rationale                                                                                                                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js 16.4 (App Router)**                        | Current stable major. App Router gives server components, route handlers, and server actions — the primitives future AI/auth/database work will need.                                                   |
| **React 19.3**                                       | Version pinned by Next.js 16.                                                                                                                                                                           |
| **TypeScript 5.9**                                   | Stable line used by `create-next-app` and supported by `typescript-eslint`. TypeScript 7 (native) was not adopted because the lint toolchain does not target it yet.                                    |
| **Node.js 22 LTS**                                   | Pinned in `.nvmrc`; `engines` enforces Next.js's minimum (≥ 20.9).                                                                                                                                      |
| **npm**                                              | Default, no extra tooling; `package-lock.json` is committed for reproducible installs.                                                                                                                  |
| **`cacheComponents` + `partialPrefetching` enabled** | These are the Next.js 16.4 `create-next-app` defaults. They were kept rather than disabled so the project starts on the framework's recommended rendering model. Revisit if a future feature conflicts. |
| **No Tailwind / CSS framework**                      | Styling is a UI-phase decision. Only a minimal CSS reset exists.                                                                                                                                        |
| **No `next/font/google`**                            | Avoids build-time network fetches and premature typography choices.                                                                                                                                     |

## 3. Source layout

```
src/
├── app/          Routing layer only. Thin pages/layouts/route handlers that compose features.
├── components/   Shared, presentation-only components. No data access.
├── config/       Static, non-secret configuration (e.g. site name).
├── features/     Product domains. One folder per domain.
├── lib/          Pure, framework-agnostic utilities (e.g. env access).
├── server/       Server-only adapters to external systems.
└── types/        Types shared across features.
tests/unit/       Unit tests (Vitest). Co-located `*.test.ts` under src/ are also picked up.
```

### Dependency direction

```
app  ──▶  features  ──▶  components, lib, config, types
              │
              └──────▶  server (server-only code paths)
```

- `app/` may import anything; nothing imports from `app/` (tests excepted).
- `features/*` may import shared layers, never another feature's internals — only its `index.ts`.
- `components/`, `lib/`, `config/`, `types/` never import from `features/` or `server/`.
- `server/` is never imported by a client component.

### Planned modules (not built)

These are placeholders for future phases to show where each system will land. None exist yet,
and each needs its own design decision before implementation.

| Future system      | Likely location                                  | Open decisions                                        |
| ------------------ | ------------------------------------------------ | ----------------------------------------------------- |
| Authentication     | `src/features/auth`, `src/server/auth`           | Provider, session strategy                            |
| Database           | `src/server/db`                                  | Engine, ORM/query builder, migrations                 |
| AI                 | `src/server/ai` (provider-agnostic interface)    | Provider(s), streaming model, cost controls           |
| Realtime interview | `src/features/interview`, `src/server/realtime`  | Transport (WebSocket/WebRTC/SSE), hosting constraints |
| Coding environment | `src/features/coding`                            | Editor, sandboxed execution strategy                  |
| Evaluation         | `src/features/evaluation`                        | Rubric model, scoring pipeline                        |
| Analytics          | `src/features/analytics`, `src/server/analytics` | Vendor vs. self-hosted, privacy policy                |

The AI layer will sit behind an internal interface so the provider can be swapped; no provider
names or branding appear in user-facing code.

## 4. Configuration and secrets

- `.env.example` lists every variable with **placeholders only**. Future-phase variables are
  commented out until their phase lands.
- `src/lib/env.ts` provides `readEnv` / `requireEnv` with no external dependency. A schema-based
  validator (e.g. Zod) may replace it once there are enough variables to justify the dependency.
- Only `NEXT_PUBLIC_*` variables reach the browser. Secrets are read only in server code.

## 5. Quality gates

| Gate   | Tool                                                                                                                            | Command                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Types  | `tsc` (strict, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`)             | `npm run typecheck`    |
| Lint   | ESLint 9 flat config: `next/core-web-vitals`, `next/typescript`, type-import consistency, no `any`, Prettier conflict rules off | `npm run lint`         |
| Format | Prettier 3                                                                                                                      | `npm run format:check` |
| Tests  | Vitest (Node environment)                                                                                                       | `npm run test`         |
| Build  | `next build`                                                                                                                    | `npm run build`        |

`npm run typecheck` runs `next typegen` first so the global route helper types (`PageProps`,
`LayoutProps`, `RouteContext`) exist before `tsc` runs, even on a clean checkout.

## 6. Existing endpoints

| Route         | Purpose                                                      |
| ------------- | ------------------------------------------------------------ |
| `/`           | Placeholder page showing the app name. Not the landing page. |
| `/api/health` | Liveness probe returning `{"status":"ok"}`.                  |

## 7. Deferred decisions

Hosting/deployment target, CI provider, UI/styling system, component library, browser/E2E
testing (e.g. Playwright), React component testing (e.g. Testing Library + jsdom), logging and
error monitoring, i18n. Each is added when the phase that needs it begins, and recorded here.
