import { OscarPresence } from "@/components/oscar";

import styles from "./oscar-stage.module.css";

// Fixed, decorative bar heights (percent). Deterministic so server and client match.
const bars = [18, 30, 46, 28, 60, 82, 54, 100, 72, 90, 64, 40, 76, 52, 34, 58, 26, 44, 20, 32];

/**
 * Hero visual: Oscar's presence on a dark stage. Pure SVG and CSS; no images,
 * no client JavaScript. Decorative, so it is hidden from assistive technology
 * and described by its caption instead.
 */
export function OscarStage() {
  return (
    <figure className={styles.figure}>
      <div className={styles.stage} data-theme="dark" aria-hidden="true">
        <svg className={styles.rings} viewBox="0 0 400 400" focusable="false">
          <circle cx="200" cy="200" r="190" />
          <circle cx="200" cy="200" r="150" />
          <circle cx="200" cy="200" r="110" />
          <line x1="200" y1="0" x2="200" y2="400" />
          <line x1="0" y1="200" x2="400" y2="200" />
        </svg>
        <div className={styles.center}>
          <OscarPresence state="listening" size="xl" decorative className={styles.presence} />
        </div>
        <div className={styles.wave}>
          {bars.map((height, index) => (
            <span
              key={index}
              className={styles.bar}
              data-active={index >= 6 && index <= 13 ? "" : undefined}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
      <figcaption className={styles.caption}>
        Oscar&apos;s presence: one visual language for listening, thinking, and speaking.
      </figcaption>
    </figure>
  );
}
