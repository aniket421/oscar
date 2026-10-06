# Phase 0 QA Checklist — Foundation

Scope: project initialization, tooling, structure, and documentation only. No product features.

## Repository

- [x] Repository state inspected before changes (empty, no commits)
- [x] Next.js + TypeScript project initialized (Next.js 16.4, React 19.3, TypeScript 5.9)
- [x] `create-next-app` boilerplate removed (template page, CSS module, SVGs, favicon, Google fonts)
- [x] `package-lock.json` committed; `npm ci` installs cleanly
- [x] `.gitignore` excludes build output, dependencies, env files (except `.env.example`)

## Structure

- [x] `src/app`, `src/components`, `src/config`, `src/features`, `src/lib`, `src/server`,
      `src/types`, `tests/unit` exist
- [x] Empty folders carry a README describing their purpose
- [x] `@/*` path alias works in app code and tests

## TypeScript

- [x] `strict: true`
- [x] `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`,
      `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames` enabled
- [x] `allowJs: false`
- [x] `npm run typecheck` passes

## Lint and format

- [x] ESLint flat config extends `next/core-web-vitals` and `next/typescript`
- [x] Prettier configured; ESLint stylistic conflicts disabled via `eslint-config-prettier`
- [x] `npm run lint` passes with zero warnings
- [x] `npm run format:check` passes

## Tests

- [x] Vitest configured with the `@/` alias
- [x] Unit tests for `src/lib/env.ts` and `/api/health`
- [x] `npm run test` passes

## Environment and secrets

- [x] `.env.example` exists with placeholders only — no real or fake keys
- [x] No secrets anywhere in the repository
- [x] No generic AI-provider branding in user-facing code

## Run and build

- [x] `npm run build` succeeds
- [x] `npm run dev` serves `/` (HTTP 200)
- [x] `npm run start` (production) serves `/` and `/api/health` (HTTP 200, `{"status":"ok"}`)

## Documentation

- [x] `README.md`
- [x] `docs/architecture.md`
- [x] `docs/development-rules.md`
- [x] `docs/qa/phase-0.md` (this file)

## Out of scope (confirmed not built)

- [x] Landing page
- [x] Dashboard
- [x] UI components / design system
- [x] Auth, database, AI, realtime, coding, evaluation, analytics
- [x] Fake/mock data
