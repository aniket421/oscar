# Phase 1 QA Checklist: Design System

Scope: design tokens, typography, spacing, radius, elevation, motion, Oscar identity foundation,
reusable accessible components, documentation, and a development-only showcase. No product
features.

## Tokens and foundations

- [x] Semantic color tokens for background, surface, surface elevated, foreground, muted
      foreground, border, primary (+ hover, foreground), success, warning, error, information
- [x] Palette primitives referenced only in `src/styles/tokens.css` (tested)
- [x] No raw colors in any other style file (tested)
- [x] Dark theme re-maps every `--color-*` token (tested)
- [x] WCAG AA contrast for text pairs and 3:1 for UI boundaries in both themes (tested)
- [x] Typography roles: display, H1 to H4, lead, body, small, caption, label, overline, button
- [x] Self-hosted Geist fonts; no external font requests
- [x] 4px spacing scale + semantic layout tokens (gutter, section, card, containers, control heights)
- [x] Restrained radius scale; buttons are not pills
- [x] Elevation scale with soft shadows; flat cards by default
- [x] Motion tokens (fast 120ms, standard 200ms, slow 480ms) + easings + utilities
- [x] JS motion mirror in sync with CSS (tested)
- [x] `prefers-reduced-motion` collapses durations and stops decorative animation; spinners slow
      down instead (tested in CSS and verified in a browser with reduced motion emulated)

## Oscar identity

- [x] `OscarPresence` with idle, listening, thinking, speaking, success, error states and four sizes
- [x] `OscarStatus` pattern for empty, loading, success, and error states
- [x] `OscarWordmark` and favicon derived from the presence mark
- [x] No mascot, robot, face, or AI-provider branding

## Components

- [x] Button (primary, secondary, outline, ghost, destructive; sm/md/lg; hover, active, focus,
      disabled, loading)
- [x] IconButton, Input, Textarea, Select, Checkbox, Radio (RadioGroup), Switch, Label
- [x] Badge, Card, Dialog, Dropdown menu, Tooltip, Tabs, Progress, Avatar, Skeleton, Alert
- [x] Toast foundation (provider + hook), Divider, Section heading
- [x] Heading/Text typography components, Container layout primitive, Spinner, icon set

## Accessibility

- [x] Native elements first (button, a, input, select, dialog, fieldset)
- [x] Labels, descriptions, and errors linked to controls; `aria-invalid` on errors
- [x] Visible `:focus-visible` ring on every interactive element
- [x] Keyboard: menu (arrows, Home, End, Escape, Tab), tabs (arrows, Home, End), dialog (focus
      trap, Escape, focus return), switch/checkbox (Space), tooltip (focus, Escape)
- [x] axe-core: 0 violations on `/design-system` at 1440px, 820px, and 375px

## Showcase (`/design-system`)

- [x] Demonstrates typography, colors, spacing, radius, elevation, motion, buttons, forms, cards,
      badges, avatars, dialogs, dropdowns, tooltips, toasts, tabs, progress, skeletons, alerts,
      dark surface, and responsive conventions
- [x] Returns 404 in production builds; `noindex`
- [x] No fake metrics, testimonials, logos, or results

## Manual inspection

Inspected in Chromium at desktop (1440px), tablet (820px), and mobile (375px):

- [x] No horizontal overflow
- [x] No broken spacing, unreadable text, or poor contrast
- [x] Consistent buttons; no pill buttons; no excessive rounding
- [x] No accidental gradients; no visual clutter
- [x] No console errors or warnings

## Automated gates

- [x] `npm run typecheck`
- [x] `npm run lint` (zero warnings)
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`

## Out of scope (confirmed not built)

- [x] Landing page, login, signup, dashboard
- [x] Resume analyzer, interview engine, AI agent
- [x] Authentication, AI functionality
