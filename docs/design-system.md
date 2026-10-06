# Oscar Design System

**Status:** Phase 1. This document is the source of truth for every Oscar interface. If code and
this document disagree, fix one of them in the same change.

- Tokens: `src/styles/tokens.css`
- Typography roles: `src/styles/typography.css`
- Motion utilities: `src/styles/motion.css`
- Components: `src/components/ui`, `src/components/oscar`, `src/components/layout`, `src/components/icons`
- Live playground (development only): `/design-system`

---

## 1. Oscar visual principles

Oscar is a premium interview coach. People use it when something real is at stake, so the interface
has to earn trust before it tries to impress.

1. **Calm confidence.** White space, strong type, and few colors. The interface never shouts.
2. **Emerald is a signal, not a wallpaper.** Emerald marks the primary action, focus, progress, and
   Oscar's presence. Large emerald backgrounds are not used.
3. **Controlled geometry.** Small, consistent radii. Rectangles with softened corners, not pills.
4. **Depth through contrast.** Borders and surface contrast first; shadows are soft and rare.
5. **Motion with intent.** Motion confirms an action or shows state. It never decorates.
6. **Honest content.** No invented numbers, testimonials, logos, results, or activity. Example copy
   in the playground is clearly labelled as example.
7. **Human, not robotic.** Oscar is represented by an abstract presence mark, never a mascot, face,
   or robot.

## 2. Color

All colors live in `tokens.css` in two layers:

- **Palette primitives** (`--palette-*`): raw values. Referenced only inside `tokens.css`.
- **Semantic tokens** (`--color-*`): what components use. Themes re-map these.

A unit test fails the build if a raw color (`#hex`, `rgb()`, `hsl()`) or a `--palette-*` reference
appears in any style file other than `tokens.css`.

### Semantic tokens

| Token                                                  | Light             | Dark              | Use                                   |
| ------------------------------------------------------ | ----------------- | ----------------- | ------------------------------------- |
| `--color-background`                                   | white             | neutral-950       | Page background                       |
| `--color-background-subtle`                            | neutral-50        | neutral-900       | Alternate bands, table headers        |
| `--color-surface`                                      | white             | neutral-900       | Cards, inputs                         |
| `--color-surface-elevated`                             | white             | neutral-850       | Dialogs, menus, toasts                |
| `--color-surface-sunken`                               | neutral-100       | black             | Disabled inputs, tracks, wells        |
| `--color-surface-inverse`                              | neutral-900       | neutral-50        | Tooltips                              |
| `--color-foreground`                                   | neutral-950       | neutral-50        | Primary text                          |
| `--color-foreground-muted`                             | neutral-600       | neutral-400       | Secondary text (≥ 4.5:1)              |
| `--color-foreground-subtle`                            | neutral-500       | neutral-450       | Placeholders, disabled text (≥ 4.5:1) |
| `--color-border`                                       | neutral-200       | neutral-800       | Dividers, card borders                |
| `--color-border-strong`                                | neutral-300       | neutral-700       | Outline buttons                       |
| `--color-border-control`                               | neutral-450       | neutral-500       | Form control boundaries (≥ 3:1)       |
| `--color-primary`                                      | emerald-700       | emerald-500       | Primary actions, selection            |
| `--color-primary-hover` / `-active`                    | emerald-800 / 900 | emerald-400 / 300 | Interaction states                    |
| `--color-primary-foreground`                           | white             | neutral-950       | Text on primary                       |
| `--color-primary-subtle` (+ `-foreground`)             | emerald-50        | emerald-950       | Accent badges                         |
| `--color-accent`                                       | emerald-700       | emerald-400       | Accent text (eyebrows)                |
| `--color-secondary` (+ hover, active, foreground)      | neutral-900       | neutral-50        | Secondary (charcoal) actions          |
| `--color-interactive-hover` / `-active`                | neutral-100 / 200 | neutral-800 / 700 | Ghost and outline hover               |
| `--color-success` (+ `-surface`, `-border`)            | emerald           | emerald           | Positive outcomes                     |
| `--color-warning` (+ `-surface`, `-border`)            | amber             | amber             | Needs attention                       |
| `--color-error` (+ hover, foreground, surface, border) | red               | red               | Failures, destructive actions         |
| `--color-info` (+ `-surface`, `-border`)               | slate             | slate             | Neutral information                   |
| `--color-focus-ring`                                   | emerald-600       | emerald-400       | Keyboard focus outline                |
| `--color-overlay`                                      | charcoal 56%      | black 72%         | Dialog backdrop                       |
| `--color-oscar-core` / `-signal` / `-track` / `-glyph` |                   |                   | Oscar presence mark only              |

Information uses a muted slate rather than a bright blue, so status colors never drift toward the
blue/purple look of generic AI products.

### Contrast guarantees

Enforced by `tests/design-system/tokens.test.ts` for **both** themes:

- Body text on background ≥ 7:1; muted, subtle, accent, and all status text ≥ 4.5:1.
- Text on primary, secondary, error, and inverse surfaces ≥ 4.5:1.
- Control borders, focus ring, and primary indicators ≥ 3:1 (WCAG 1.4.11).

## 3. Typography

**Typeface:** Geist Sans and Geist Mono, self-hosted through the `geist` package (`next/font/local`).
No requests to external font services at build or run time, no layout shift, works offline and in
CI. Fallback is the system UI stack.

Display through H3 are fluid (`clamp()`), scaling between ~360px and ~1440px viewports.

| Role     | Class            | Size              | Line height | Tracking          | Weight     |
| -------- | ---------------- | ----------------- | ----------- | ----------------- | ---------- |
| Display  | `.text-display`  | 44 → 76px         | 1.02        | -0.04em           | 600        |
| H1       | `.text-h1`       | 36 → 56px         | 1.06        | -0.035em          | 600        |
| H2       | `.text-h2`       | 28 → 40px         | 1.12        | -0.028em          | 600        |
| H3       | `.text-h3`       | 22 → 26px         | 1.25        | -0.02em           | 600        |
| H4       | `.text-h4`       | 18px              | 1.4         | -0.012em          | 600        |
| Lead     | `.text-lead`     | 18px              | 1.6         | 0                 | 400, muted |
| Body     | `.text-body`     | 16px              | 1.6         | 0                 | 400        |
| Small    | `.text-small`    | 14px              | 1.5         | 0                 | 400        |
| Caption  | `.text-caption`  | 12px              | 1.4         | 0                 | 400, muted |
| Label    | `.text-label`    | 14px              | 1.35        | 0                 | 500        |
| Overline | `.text-overline` | 12px              | 1.4         | 0.08em, uppercase | 500        |
| Button   | (in Button)      | 15px (14px small) | 1           | -0.006em          | 500        |

Rules:

- Use `<Heading as="h2" size="h1">` to separate document outline from visual size. One `h1` per page.
- Use `<Text variant="...">` or the classes above. Do not set font sizes ad hoc.
- Headings use `text-wrap: balance`; body uses `text-wrap: pretty`.
- Inputs use at least 16px text so iOS does not zoom on focus.

## 4. Spacing

4px base. Use tokens, never arbitrary pixel values.

| Token                                | Value                | Typical use                              |
| ------------------------------------ | -------------------- | ---------------------------------------- |
| `--space-0-5` / `-1` / `-1-5`        | 2 / 4 / 6px          | Icon gaps, tight label stacks            |
| `--space-2` / `-3`                   | 8 / 12px             | Compact UI, control padding, button gaps |
| `--space-4` / `-5` / `-6`            | 16 / 20 / 24px       | Card padding, form field gaps            |
| `--space-8` / `-10` / `-12`          | 32 / 40 / 48px       | Between groups, dashboard panels         |
| `--space-16` / `-20` / `-24` / `-32` | 64 / 80 / 96 / 128px | Large sections                           |

Semantic layout tokens:

| Token                                    | Value              | Use                                   |
| ---------------------------------------- | ------------------ | ------------------------------------- |
| `--space-gutter`                         | 16 → 32px (fluid)  | Page side padding, dialog inset       |
| `--space-section`                        | 64 → 128px (fluid) | Vertical rhythm between page sections |
| `--space-card` / `--space-card-compact`  | 24 / 16px          | Card padding                          |
| `--container-max` / `--container-narrow` | 1200 / 720px       | Content width / reading width         |
| `--control-height-sm` / `-md` / `-lg`    | 32 / 40 / 48px     | Buttons and inputs align on one row   |

Contexts: compact UI (menus, badges, tables) uses 4 to 12px; standard cards 16 to 24px; dashboard
layouts 24 to 48px between panels; interview screens favour generous space (48px+) around the
question and Oscar's presence; mobile relies on the fluid gutter and section tokens.

## 5. Radius

| Token           | Value  | Use                                                                     |
| --------------- | ------ | ----------------------------------------------------------------------- |
| `--radius-sm`   | 4px    | Badges, checkboxes, tooltips, menu items, progress                      |
| `--radius-md`   | 6px    | Buttons, inputs, menus, alerts, toasts                                  |
| `--radius-lg`   | 10px   | Cards, dialogs                                                          |
| `--radius-xl`   | 16px   | Feature surfaces only (e.g. the interview stage)                        |
| `--radius-full` | 9999px | **Only** avatars, the switch track, radio buttons, and Oscar's presence |

Buttons are never pills.

## 6. Elevation

| Token              | Use                                               |
| ------------------ | ------------------------------------------------- |
| `--shadow-xs`      | Filled buttons                                    |
| `--shadow-sm`      | Switch thumb                                      |
| `--shadow-md`      | Raised cards, menus, tooltips                     |
| `--shadow-lg`      | Dialogs, toasts                                   |
| `--highlight-edge` | A 1px lit top edge, visible only on dark surfaces |

Default cards are flat (border only). Use `elevation="raised"` for at most one focal surface per view.
No glow effects. No glassmorphism (no `backdrop-filter` blur on content surfaces).

## 7. Motion

| Token                 | Value                           | Use                                                    |
| --------------------- | ------------------------------- | ------------------------------------------------------ |
| `--duration-fast`     | 120ms                           | Hover, press, color changes, menus, tooltips           |
| `--duration-standard` | 200ms                           | Dialogs, toasts, switches, tab indicator               |
| `--duration-slow`     | 480ms                           | Cinematic reveals, progress fills, Oscar state changes |
| `--ease-standard`     | `cubic-bezier(0.2, 0, 0, 1)`    | Most transitions                                       |
| `--ease-out`          | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances                                              |
| `--ease-in`           | `cubic-bezier(0.4, 0, 1, 1)`    | Exits                                                  |

Utilities: `.motion-fade-in`, `.motion-scale-in`, `.motion-rise-in`. `src/lib/motion.ts` mirrors the
values for script-driven timing; a test keeps the two in sync.

**Reduced motion** (`prefers-reduced-motion: reduce`):

- Duration tokens collapse to 0ms and every non-essential animation and transition is disabled.
- Elements that communicate progress (`Spinner`, indeterminate `Progress`) opt out with
  `data-motion="essential"` and slow down instead of stopping.
- Oscar's presence remains readable without motion: every state has a distinct static form.

Not allowed: cursor-following effects, parallax, scroll-jacking, scroll-triggered animation on every
element, floating decorative objects, looping decoration.

## 8. Oscar identity

`OscarPresence` is a charcoal core inside a signal ring. It is abstract on purpose so it scales from a
24px inline mark to the centerpiece of a voice or video interview.

| State       | Visual                     | Where                             |
| ----------- | -------------------------- | --------------------------------- |
| `idle`      | Quarter arc, emerald dot   | Default, wordmark, empty states   |
| `listening` | Soft expanding halo        | Voice/video: the user is speaking |
| `thinking`  | Arc orbits                 | Loading, generating feedback      |
| `speaking`  | Wider arc, voice bars      | Oscar is talking                  |
| `success`   | Full emerald ring, check   | Completed outcomes                |
| `error`     | Full red ring, exclamation | Failures                          |

Related components:

- `OscarStatus`: presence + title + description + actions. Use for every empty, loading, success,
  and error state so they look and read the same. Pass `live` for asynchronous updates.
- `OscarWordmark`: interim wordmark (presence mark + "Oscar"). A final logo is a later decision.
- `src/app/icon.svg`: favicon derived from the presence mark.

Never: mascots, faces, robots, sparkles, or AI-provider marks and names.

## 9. Components

| Component                                              | Notes                                                                                                                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                               | `primary` (emerald), `secondary` (charcoal), `outline`, `ghost`, `destructive`; sizes `sm`/`md`/`lg`; `loading`, `leadingIcon`, `trailingIcon`, `fullWidth`. Defaults to `type="button"`. |
| `buttonStyles()`                                       | Button classes for a link that must look like a button. Links stay links.                                                                                                                 |
| `IconButton`                                           | Requires `label` (accessible name). `ghost`/`outline`/`secondary`.                                                                                                                        |
| `Input`, `Textarea`, `Select`                          | Labelled fields with `description`, `error`, `required`, `disabled`, `hideLabel`. Select is native.                                                                                       |
| `Checkbox`, `Switch`, `RadioGroup`                     | Native inputs. Switch is `role="switch"`. RadioGroup is a fieldset with a legend.                                                                                                         |
| `Label`                                                | For custom controls.                                                                                                                                                                      |
| `Badge`                                                | Non-interactive status text. Tones: neutral, accent, success, warning, error, info.                                                                                                       |
| `Card` (+ Header, Title, Description, Content, Footer) | `elevation` flat/raised, `padding`, semantic `as`.                                                                                                                                        |
| `Dialog`                                               | Native `<dialog>` modal. Controlled `open`/`onOpenChange`.                                                                                                                                |
| `DropdownMenu`                                         | Action menu (menu button pattern). Data-driven `items`.                                                                                                                                   |
| `Tooltip`                                              | Supplementary text only. Hover (400ms delay) and focus; Escape dismisses.                                                                                                                 |
| `Tabs`                                                 | Automatic activation, roving tabindex, data-driven `items`.                                                                                                                               |
| `Progress`                                             | Determinate or indeterminate; always labelled.                                                                                                                                            |
| `Avatar`                                               | Image with initials fallback.                                                                                                                                                             |
| `Skeleton`                                             | Decorative; pair with `aria-busy` and a visually hidden loading message.                                                                                                                  |
| `Alert`                                                | Inline persistent message. Add `role="alert"` only for interrupting messages.                                                                                                             |
| `ToastProvider` / `useToast`                           | Transient notifications in one polite live region. Max 3; pause on hover/focus.                                                                                                           |
| `Divider`                                              | `<hr>` or vertical separator; `decorative` hides it from assistive technology.                                                                                                            |
| `SectionHeading`                                       | Eyebrow, heading, description, actions.                                                                                                                                                   |
| `Heading`, `Text`                                      | Typography roles as components.                                                                                                                                                           |
| `Spinner`                                              | Used by Button; label it when standalone.                                                                                                                                                 |
| `Container`                                            | Max width + fluid gutters; `as="main"` or `"section"` for landmarks.                                                                                                                      |

Component rules:

- Use semantic tokens only. No raw colors, no palette tokens, no magic numbers.
- Props are typed. Variant sets stay small; add a variant only when a real screen needs it.
- Native elements first (`button`, `a`, `input`, `select`, `dialog`, `fieldset`). ARIA only when
  native semantics are not enough.
- One component per file with a co-located CSS module.
- Server components by default; `"use client"` only where state or events require it.

## 10. Responsive rules

Mobile first: base styles target the smallest screen; layout is added with `min-width` queries.

| Name    | Range          | Convention                                                       |
| ------- | -------------- | ---------------------------------------------------------------- |
| Mobile  | < 640px        | Single column. Dialog actions stack full width. Toasts centered. |
| Tablet  | 640 to 1023px  | Two columns where content allows.                                |
| Laptop  | 1024 to 1279px | Full layouts and side navigation.                                |
| Desktop | ≥ 1280px       | Content capped at `--container-max`; gutters grow.               |

Breakpoint values are `640px`, `768px`, `1024px`, `1280px` (CSS custom properties cannot be used in
media queries, so these four values are the only ones allowed). Grids use `minmax(0, 1fr)` columns
to avoid overflow. Typography and section spacing are fluid, so most components need no breakpoint
at all. Touch targets are at least 32px (40px default).

## 11. Accessibility rules

- Semantic HTML: real `button`, `a`, headings in order, landmarks (`header`, `main`, `nav`).
- Every form control has a visible `<label>` (or `hideLabel` for search-style fields). Descriptions
  and errors are linked with `aria-describedby`; invalid fields set `aria-invalid`.
- Required fields use the native `required` attribute; the asterisk is decorative.
- One visible focus treatment everywhere (`:focus-visible`, 2px emerald ring, 2px offset).
- Keyboard: Tab order follows reading order; menus and tabs support arrow keys, Home, End, Escape.
  Dialogs trap focus and return it to the trigger.
- Contrast meets WCAG 2.2 AA (tested automatically, both themes).
- Reduced motion is respected everywhere.
- Icon-only buttons require a label. Decorative icons are `aria-hidden`.
- Live regions only where content changes asynchronously (toasts, `OscarStatus live`).
- Loading regions set `aria-busy` and provide text for screen readers.

## 12. Dark interview surfaces

Light is the default product experience. Interview screens (and any panel) can switch to dark by
setting `data-theme="dark"` on a container. The attribute re-maps semantic tokens and sets
`color-scheme: dark`, so every component works without changes. A test requires every light
`--color-*` token to have a dark value. There is deliberately no user-facing theme switcher yet.

## 13. Forbidden patterns

- Purple or blue/purple gradients; any decorative gradient (the skeleton shimmer is the single,
  tested exception).
- Neon colors and glowing cards; overuse of glassmorphism.
- Pill-shaped buttons and over-rounded cards.
- Emoji used as icons. Generic AI-provider logos, names, or styling.
- Fake testimonials, user counts, company logos, statistics, reviews, interview results, or activity.
- Marketing clichés (for example "Revolutionize your career with AI").
- Em dashes in product copy (a test scans `.tsx` files).
- Cursor-following effects, excessive parallax, excessive scroll animation, floating objects,
  unnecessary 3D.
- Raw color values or arbitrary spacing outside the token files.
