# components

Shared, presentation-only React components. No data fetching, no business logic.
Rules and usage: [`docs/design-system.md`](../../docs/design-system.md).

- `ui/`: design-system primitives. Import from `@/components/ui`.
- `oscar/`: Oscar's visual identity (presence mark, status pattern, wordmark). Import from
  `@/components/oscar`.
- `layout/`: layout primitives such as `Container`.
- `icons/`: inline SVG icon set (no emoji, no icon-font dependency).

Each component lives in its own file with a co-located CSS module that uses semantic tokens only.
