# Phase 2 QA Checklist: Landing Page + Authentication

Scope: public landing page, legal and contact pages, email + password authentication, session
management, and a protected placeholder route. No dashboard, interview, resume, coding, or AI
features.

## Landing page

- [x] Hero explains the product (realistic mock interviews, evaluation, a plan to improve) with a
      primary and secondary call to action and an honest development-status line
- [x] Oscar's presence on a dark stage (SVG + CSS, no images, no client JavaScript)
- [x] Capabilities section covering all nine capabilities, labelled "In development"
- [x] How it works: Configure, Interview, Evaluate, Improve
- [x] Interview preview: `inert`, captioned as illustrative, example content labelled, no scores
- [x] Six feature sections: Resume Intelligence, Interview Practice, Technical Preparation,
      Behavioral Preparation, Performance Feedback, Personalized Roadmap
- [x] Trust through principles (transparent evaluation, honesty, data purpose, security), not
      social proof
- [x] Final call to action and footer (brand, product, resources, legal, contact, copyright)
- [x] No testimonials, reviews, logos, user counts, statistics, or fake results (unit + e2e tests)
- [x] No em dashes in copy (design-rule test scans `.tsx` and landing copy)
- [x] Landing, legal, and contact pages are fully static

## Authentication

- [x] Supabase Auth via `@supabase/ssr`, server-side only; no browser Supabase client
- [x] `/login` and `/signup` with labels, descriptions, validation, loading, error, and success
      states
- [x] Signup: name, email, password, confirmation; both "confirm email" and "signed in
      immediately" flows
- [x] Protected `/app` placeholder; proxy guard plus Data Access Layer check in the page
- [x] Signed-in users are redirected away from `/login` and `/signup`
- [x] Logout via form POST; cookies cleared even if the provider is unreachable
- [x] Errors handled: invalid credentials, duplicate account (explicit and obfuscated), invalid
      email, weak and breached passwords, expired/revoked session, network/API failure, rate
      limits, unknown errors
- [x] Provider messages and stack traces never reach the UI; logs carry only name/status/code
- [x] Email confirmation route (`/auth/confirm`) for PKCE and token-hash links
- [x] Open-redirect protection on `next`

## Legal and contact

- [x] `/privacy` and `/terms` state that Oscar is an interview preparation and coaching platform
- [x] Content matches what is implemented today; no unsupported claims (no compliance claims,
      no outcome guarantees)
- [x] Structured for review: dated, numbered sections, contents list, content in one file each
- [x] `/contact` uses `CONTACT_EMAIL`; shows no invented address when unset

## Automated gates

| Gate                           | Result                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `npm run typecheck`            | Pass                                                                           |
| `npm run lint` (zero warnings) | Pass                                                                           |
| `npm run format:check`         | Pass                                                                           |
| `npm run test`                 | Pass: 15 files, 206 tests                                                      |
| `npm run build`                | Pass                                                                           |
| `npm run test:e2e`             | Pass: 34 passed, 1 skipped by design (mobile-menu test on the desktop project) |

## Browser QA (Playwright, Chromium)

1. [x] Landing page loads
2. [x] Navigation works (header anchors, mobile menu, footer links)
3. [x] Login page opens
4. [x] Signup page opens
5. [x] Invalid login is handled
6. [x] Signup validation works
7. [x] Successful authentication works (login and signup)
8. [x] Protected route blocks unauthenticated users
9. [x] Logout works
10. [x] Privacy page loads
11. [x] Terms page loads
12. [x] Mobile layout works (Pixel 7 profile)

Also verified: session expiry, return to the requested page after login, off-site redirect
rejection, httpOnly + SameSite=Lax session cookies, outage messaging, no console errors.

## Responsive and accessibility

- [x] `/`, `/login`, `/signup`, `/privacy`, `/terms`, `/contact` at 1440, 1280, 1024, 820, and
      375px: no horizontal overflow, no console errors, 0 axe-core violations
- [x] `/app` (signed in) at 1440, 1280, 820, and 375px: same results
- [x] Skip link is the first Tab stop and moves focus to `<main>`
- [x] One `h1` per page; sections labelled by their headings; step headings have clean
      accessible names
- [x] Forms: visible labels, linked descriptions and errors, `aria-invalid`, focus moves to the
      first invalid field, results announced
- [x] Reduced motion disables hero and presence animation

## Design QA

- [x] Not a generic AI SaaS look: white/charcoal with emerald accents, strong type, no gradients
- [x] No pill buttons; radii follow the token scale
- [x] Large dark panels use `--shadow-md` (no glow)
- [x] Hero headline sets on two lines from 1024px up (Display role capped at 68px)
- [x] No visual clutter; motion limited to a short entrance and Oscar's presence

## Security

- [x] No secrets committed; `.env*` ignored except `.env.example` (placeholders only)
- [x] Build with sentinel Supabase values: sentinels absent from all client and server bundles;
      Supabase client code absent from client bundles
- [x] Passwords handled only by Supabase; never stored or logged by Oscar
- [x] Session cookies httpOnly, SameSite=Lax, Secure in production
- [x] Protected routes verified by both proxy and Data Access Layer
- [x] Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
      `Permissions-Policy`; `X-Powered-By` removed

## Out of scope (confirmed not built)

- [x] Dashboard, resume analyzer, interview engine, voice/video interview, coding system, MCQ
      system, AI evaluation engine
