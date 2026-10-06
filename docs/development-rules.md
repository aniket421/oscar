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

## UI and design system

14. `docs/design-system.md` is the source of truth for UI. Read it before building any screen.
15. Build screens from `src/components/ui` and `src/components/oscar`. Do not create a second
    button, input, or card; extend the existing component if a real need appears.
16. Use semantic tokens only. No raw colors, palette tokens, or arbitrary spacing outside
    `src/styles/tokens.css` (enforced by tests).
17. Follow the forbidden-pattern list in the design system: no fake data, no decorative gradients,
    no pill buttons, no emoji icons, no AI-provider branding, no em dashes in product copy.
18. Every new interactive component ships with keyboard and accessibility tests.
19. Product copy describes only what exists. Anything not yet available is labelled as in
    development. Marketing copy lives in `src/features/marketing/content.ts`.
20. The Privacy Policy and Terms describe the product as it is. Update them, and their date,
    before shipping any feature that collects new kinds of information (resumes, recordings,
    answers, analytics).

## Authentication and data access

21. Every protected page, Server Action, and Route Handler verifies the user itself through
    `@/features/auth/server` (`requireUser`/`getCurrentUser`). The proxy is a first line of
    defense, not the authorization check.
22. Never create a Supabase client in the browser, never expose Supabase keys through
    `NEXT_PUBLIC_*`, and never use the service-role key in this app without an explicit design
    review.
23. Show users the messages from `describeAuthError()`, never raw provider errors. Log only error
    name, status, and code.
24. Accept redirect targets only through `safeRedirectPath()`.
25. Add every new signed-in area to `protectedPrefixes` and the proxy matcher (a test enforces
    that they match). Workspace pages load data only through `getWorkspaceSnapshot()`, which
    verifies the user first.
26. Logout must end with a full page load (the `/auth/logout` POST), so no client state from the
    session survives. Forms holding passwords or other one-time sensitive input use `ResetOnHide`.

## Workspace data

27. Never fabricate records, progress, scores, or activity to fill the UI. Show stored data or a
    designed empty state. Test fixtures live in `tests/fixtures` and are labelled.
28. Derive status from stored records (for example `derivePreparationSteps`), never from
    assumptions.
29. When a capability ships, flip its flag in `features/workspace/availability.ts` and remove the
    "later" labels it controlled in the same change.

## TypeScript

30. Strict mode stays on. Do not weaken `tsconfig.json` flags to make code compile.
31. No `any`. Use `unknown` and narrow. No `@ts-ignore`; `@ts-expect-error` only with a comment
    explaining why.
32. Use `import type` for type-only imports.

## Quality gates

33. Before every commit/PR, `npm run check` must pass (typecheck, lint with zero warnings,
    format check, tests, production build). Changes to routes, authentication, or page behavior
    must also pass `npm run test:e2e`.
34. New logic ships with unit tests. Bug fixes ship with a test that would have caught the bug.
35. Never skip, disable, or delete a failing test to get green — fix the cause.
36. Do not disable lint rules inline without a comment explaining why.

## Git

37. Small, focused commits with descriptive messages in the imperative mood.
38. Never commit generated output (`.next/`, `coverage/`, `node_modules/`, `*.tsbuildinfo`).
39. Lockfile changes are committed together with the `package.json` change that caused them.

## Documentation

40. Each phase has a QA checklist in `docs/qa/phase-N.md` that must be completed before the phase
    is declared done.
41. Update `README.md` and `docs/architecture.md` in the same change that alters setup, scripts,
    structure, or architecture.
