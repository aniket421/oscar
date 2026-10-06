# Oscar 2.0

Oscar 2.0 is a new web application built on Next.js (App Router) and TypeScript.

> **Status: Phase 1 complete (design system).** The repository contains the foundation (Phase 0)
> and the Oscar design system: tokens, typography, motion, accessible UI components, and Oscar's
> visual identity. No product features, landing page, or dashboard exist yet.

## Tech stack

| Concern         | Choice                                        |
| --------------- | --------------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack)            |
| Language        | TypeScript 5 (strict mode + extra checks)     |
| UI runtime      | React 19                                      |
| Styling         | CSS custom properties (tokens) + CSS Modules  |
| Fonts           | Geist Sans / Geist Mono, self-hosted          |
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

Design system playground (development only): `http://localhost:3000/design-system`.

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
│   ├── components/
│   │   ├── ui/              Design-system components (Button, Input, Dialog, ...)
│   │   ├── oscar/           Oscar identity (presence mark, status, wordmark)
│   │   ├── layout/          Layout primitives (Container)
│   │   └── icons/           Inline SVG icons
│   ├── config/              Static, non-secret app configuration
│   ├── features/            Product domains, one folder each (empty in Phase 0)
│   ├── lib/                 Framework-agnostic utilities
│   ├── server/              Server-only integrations (empty)
│   ├── styles/              Design tokens, typography roles, motion utilities
│   └── types/               Shared cross-feature types (empty)
└── tests/                   Unit, component, and design-system tests
```

See [`docs/architecture.md`](docs/architecture.md) for the reasoning behind this layout.

## Documentation

- [Architecture](docs/architecture.md)
- [Design system](docs/design-system.md) (source of truth for all UI)
- [Development rules](docs/development-rules.md)
- [Phase 0 QA checklist](docs/qa/phase-0.md)
- [Phase 1 QA checklist](docs/qa/phase-1.md)

## Troubleshooting

**The dev server reloads the page over and over.** Next.js 16.4's Turbopack dev cache can
occasionally get out of sync (the browser console shows `HMR hash mismatch` on a framework chunk).
It only affects `npm run dev`, never production. Stop the dev server, run `npm run clean`, and
start it again.

## Environment variables

All variables are documented in [`.env.example`](.env.example), which contains placeholders only.
Real values belong in `.env.local` (git-ignored) or the deployment platform's secret store.
