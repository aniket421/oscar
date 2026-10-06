# Oscar 2.0

Oscar 2.0 is a new web application built on Next.js (App Router) and TypeScript.

> **Status: Phase 0 — foundation only.** The repository contains tooling, configuration, folder
> structure, and documentation. No product features, landing page, dashboard, or UI components
> exist yet.

## Tech stack

| Concern         | Choice                                        |
| --------------- | --------------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack)            |
| Language        | TypeScript 5 (strict mode + extra checks)     |
| UI runtime      | React 19                                      |
| Linting         | ESLint 9 (flat config) + `eslint-config-next` |
| Formatting      | Prettier 3                                    |
| Testing         | Vitest                                        |
| Package manager | npm (lockfile committed)                      |

## Requirements

- Node.js **22** (see `.nvmrc`; Next.js 16 needs ≥ 20.9)
- npm 10+

## Getting started

```bash
npm ci                        # install exact locked dependencies
cp .env.example .env.local    # then fill in values locally (never commit .env.local)
npm run dev                   # http://localhost:3000
```

Health check: `GET http://localhost:3000/api/health` → `{"status":"ok"}`.

## Scripts

| Script                 | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run dev`          | Start the development server                                      |
| `npm run build`        | Production build                                                  |
| `npm run start`        | Serve the production build                                        |
| `npm run typecheck`    | Generate Next.js route types, then run `tsc --noEmit`             |
| `npm run lint`         | ESLint, failing on any warning                                    |
| `npm run lint:fix`     | ESLint with auto-fix                                              |
| `npm run format`       | Format all files with Prettier                                    |
| `npm run format:check` | Verify formatting without writing                                 |
| `npm run test`         | Run the unit test suite once                                      |
| `npm run test:watch`   | Run tests in watch mode                                           |
| `npm run check`        | Everything above that CI should run, in order (typecheck → build) |

## Project structure

```
.
├── docs/                    Architecture, development rules, QA checklists
├── src/
│   ├── app/                 Next.js routes only (pages, layouts, route handlers)
│   ├── components/          Shared presentation components (empty in Phase 0)
│   ├── config/              Static, non-secret app configuration
│   ├── features/            Product domains, one folder each (empty in Phase 0)
│   ├── lib/                 Framework-agnostic utilities
│   ├── server/              Server-only integrations (empty in Phase 0)
│   └── types/               Shared cross-feature types (empty in Phase 0)
└── tests/unit/              Unit tests
```

See [`docs/architecture.md`](docs/architecture.md) for the reasoning behind this layout.

## Documentation

- [Architecture](docs/architecture.md)
- [Development rules](docs/development-rules.md)
- [Phase 0 QA checklist](docs/qa/phase-0.md)

## Environment variables

All variables are documented in [`.env.example`](.env.example), which contains placeholders only.
Real values belong in `.env.local` (git-ignored) or the deployment platform's secret store.
