# features

One folder per product domain. Each feature owns its components, actions, and logic, and exposes
a public API through its `index.ts`. Features must not import each other's internals.

- `auth/`: validation, error messages, route policy, Server Actions, forms, and the session Data
  Access Layer (server-only entry point: `@/features/auth/server`).
- `workspace/`: the signed-in application shell (sidebar, header, mobile drawer, profile menu),
  the dashboard and area pages, navigation, availability flags, and data loading (server-only
  entry point: `@/features/workspace/server`).
- `marketing/`: landing page sections, site header and footer, and their copy (`content.ts`).
- `legal/`: Privacy Policy, Terms & Conditions, and contact configuration.
