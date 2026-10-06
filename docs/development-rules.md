# Development Rules

These rules apply to every change in Oscar 2.0, by humans and AI agents alike.

## Scope discipline

1. Work only on the current phase. Do not start the next phase's features early.
2. Document product or architectural assumptions in `docs/architecture.md` **before** building on
   them. If something is undecided, ask or record it as an open decision.
3. No fake or mock data in application code. Test fixtures live in tests only and are clearly
   labelled.
4. Do not add a dependency unless it is needed now. Note why it was added in the PR description;
   prefer the platform or the standard library where reasonable.

## Security and secrets

5. Never commit secrets, real API keys, tokens, or credentials. `.env*` is git-ignored except
   `.env.example`, which holds placeholders only.
6. Read secrets only in server code (`src/server`, route handlers, server actions). Never prefix a
   secret with `NEXT_PUBLIC_`.
7. Validate all external input (request bodies, query params, webhooks, AI output) at the
   boundary before use.

## Branding

8. Oscar's user-facing UI and copy carry Oscar branding only. Do not surface generic AI-provider
   names, logos, or model names to users. Provider specifics stay behind internal interfaces.

## Code structure

9. Follow the layering and dependency direction in `docs/architecture.md`:
   `app` → `features` → shared layers; `server` is server-only.
10. Keep `src/app` thin: routing, layout, and composition. Business logic lives in `features/`.
11. Features expose a public API through `index.ts`; do not deep-import another feature.
12. Use the `@/` alias for imports from `src/`.
13. Default to React Server Components; add `"use client"` only where interactivity requires it.

## TypeScript

14. Strict mode stays on. Do not weaken `tsconfig.json` flags to make code compile.
15. No `any`. Use `unknown` and narrow. No `@ts-ignore`; `@ts-expect-error` only with a comment
    explaining why.
16. Use `import type` for type-only imports.

## Quality gates

17. Before every commit/PR, `npm run check` must pass (typecheck, lint with zero warnings,
    format check, tests, production build).
18. New logic ships with unit tests. Bug fixes ship with a test that would have caught the bug.
19. Never skip, disable, or delete a failing test to get green — fix the cause.
20. Do not disable lint rules inline without a comment explaining why.

## Git

21. Small, focused commits with descriptive messages in the imperative mood.
22. Never commit generated output (`.next/`, `coverage/`, `node_modules/`, `*.tsbuildinfo`).
23. Lockfile changes are committed together with the `package.json` change that caused them.

## Documentation

24. Each phase has a QA checklist in `docs/qa/phase-N.md` that must be completed before the phase
    is declared done.
25. Update `README.md` and `docs/architecture.md` in the same change that alters setup, scripts,
    structure, or architecture.
