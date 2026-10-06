# features

One folder per product domain (e.g. `auth`, `interview`, `coding`, `evaluation`, `analytics`).
Each feature owns its components, hooks, server actions, and types, and exposes a small public
surface via its own `index.ts`. Features must not import each other's internals.
Empty in Phase 0 — no product features are built yet.
