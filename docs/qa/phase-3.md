# Phase 3 QA Checklist: Application Shell + Dashboard

Scope: the signed-in workspace (routing, layout, navigation, header, account menu, dashboard,
area pages, empty/loading/error states, data types). No AI, interview, resume, roadmap, practice,
or coding functionality.

## Routing and protection

- [x] `/dashboard`, `/interviews`, `/interviews/new`, `/resume`, `/roadmap`,
      `/practice/technical`, `/practice/behavioral`, `/practice/coding`, `/profile`, `/settings`
- [x] Each redirects anonymous visitors to `/login?next=…` (proxy) and verifies the session itself
      (`getWorkspaceSnapshot` → `requireUser`)
- [x] Proxy matcher covers every protected prefix (unit test keeps them in sync)
- [x] Signed-in users land on `/dashboard`; `/app` (Phase 2) redirects there
- [x] Designed 404 for unknown routes

## Shell

- [x] Desktop: persistent sidebar with grouped navigation and `aria-current`
- [x] Below 1024px: top bar + modal drawer (focus trapped, Escape closes, focus returns, closes on
      navigation, closes if the window grows past the breakpoint)
- [x] Header: context line, Start interview, account menu
- [x] Account menu: real name and email, Profile, Settings, Log out (keyboard operable)
- [x] Preparation group marked "Later"; no fake sections
- [x] No notifications (nothing real to notify about); no fake user data

## Dashboard and areas

- [x] Welcome (real first name), Start interview CTA (leads to setup placeholder, starts nothing),
      preparation path (derived from stored data: all "Not started"), recent interviews, skill
      development, roadmap preview, resume status
- [x] Empty states for interviews, resume, roadmap, technical, behavioral, coding: what, why, next
- [x] Interview setup placeholder explains what setup will include; "No interview has started"
- [x] Profile: real name, email, member since; preferences "Not set"
- [x] Settings: email, sign-in method, Log out, privacy links; honest about unavailable actions
- [x] No fabricated interviews, scores, statistics, progress, charts, or activity (unit tests)

## Data architecture

- [x] `src/types/domain.ts`: UserProfile, Interview, InterviewConfig, InterviewSession,
      InterviewTurn, Resume, Skill, Roadmap, RoadmapStep, PracticeSession
- [x] `WorkspaceDataSource` interface; `unconnectedDataSource` returns no data (no storage yet)
- [x] All queries scoped to the verified user's id (unit test)
- [x] Availability flags drive "later" labels

## Loading and error states

- [x] `loading.tsx` and per-region skeletons that mirror the content, `aria-busy`, one status message
- [x] `error.tsx`: plain language, Try again (`retry`), Go to overview; never shows error details
      (unit test feeds a sensitive message and asserts it is not rendered)

## Accessibility

- [x] Landmarks: banner, labelled sidebar and navigation, main; one h1 per page
- [x] Skip link targets the visible workspace main (`#workspace-main`)
- [x] Accessible names verified (fixed "Account menu forAda" and "PreparationLater" spacing bugs)
- [x] axe-core: 0 violations on all 10 workspace pages at 1440, 1280, 1024, 768, 430, 390, 375px
- [x] Reduced motion respected (design-system tokens)

## Responsive

- [x] No horizontal overflow on any workspace page at 1440, 1280, 1024, 768, 430, 390, 375px
- [x] Sidebar visible only from 1024px; menu button only below 1024px (E2E)

## Security

- [x] Protected routes require authentication (E2E for all 10 routes)
- [x] Workspace pages served `Cache-Control: private, no-store`
- [x] Logout is a same-origin POST with a full page reload; cross-site logout refused (403)
- [x] After logout the page contains no trace of the user (E2E); session cookies are expired, not
      emptied (unit + E2E)
- [x] Hidden login page keeps no password (E2E)
- [x] No user data or tokens in URLs (E2E)
- [x] No Supabase configuration or client code in browser bundles; no secrets committed

## Automated gates

| Gate                           | Result                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `npm run typecheck`            | Pass                                                                           |
| `npm run lint` (zero warnings) | Pass                                                                           |
| `npm run format:check`         | Pass                                                                           |
| `npm run test`                 | Pass: 22 files, 274 tests                                                      |
| `npm run build`                | Pass                                                                           |
| `npm run test:e2e`             | Pass: 61 passed, 3 skipped by design (phone-only tests in the desktop project) |

## Design QA

- [x] Not a card grid: whitespace and hairlines; one focal dark panel
- [x] No pill navigation, no purple, no gradients, no glow, no fake metrics
- [x] "Available later" stated once per area, not on every row
- [x] Restrained icons: one line icon per navigation item, icon tiles only in section empty states

## Out of scope (confirmed not built)

- [x] Resume parsing or analysis, question generation, interview state machine, realtime voice or
      video, AI scoring, coding execution, MCQ engine, AI roadmap generation
