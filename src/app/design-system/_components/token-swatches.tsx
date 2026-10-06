import styles from "../showcase.module.css";

const groups: Array<{ title: string; tokens: string[] }> = [
  {
    title: "Surfaces",
    tokens: [
      "background",
      "background-subtle",
      "surface",
      "surface-elevated",
      "surface-sunken",
      "surface-inverse",
    ],
  },
  {
    title: "Text and borders",
    tokens: [
      "foreground",
      "foreground-muted",
      "foreground-subtle",
      "border",
      "border-strong",
      "border-control",
    ],
  },
  {
    title: "Brand",
    tokens: [
      "primary",
      "primary-hover",
      "primary-foreground",
      "primary-subtle",
      "secondary",
      "accent",
    ],
  },
  {
    title: "Status",
    tokens: [
      "success",
      "success-surface",
      "warning",
      "warning-surface",
      "error",
      "error-surface",
      "info",
      "info-surface",
    ],
  },
];

export function TokenSwatches() {
  return (
    <div className={styles.swatchGroups}>
      {groups.map((group) => (
        <div key={group.title} className={styles.swatchGroup}>
          <h3 className="text-label">{group.title}</h3>
          <ul className={styles.swatchList}>
            {group.tokens.map((token) => (
              <li key={token} className={styles.swatch}>
                <span
                  className={styles.swatchChip}
                  style={{ backgroundColor: `var(--color-${token})` }}
                  aria-hidden="true"
                />
                <code className="text-caption text-mono">--color-{token}</code>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
