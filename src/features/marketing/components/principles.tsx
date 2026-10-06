import Link from "next/link";

import { principles } from "../content";
import styles from "./principles.module.css";
import { Section } from "./section";

export function Principles() {
  return (
    <Section
      id="principles"
      tone="subtle"
      eyebrow={principles.eyebrow}
      title={principles.title}
      description={principles.description}
      actions={
        <Link href="/privacy" className={styles.link}>
          Read the Privacy Policy
        </Link>
      }
    >
      <ul className={styles.grid}>
        {principles.items.map((item, index) => (
          <li key={item.title} className={styles.item}>
            <span className={styles.index} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className={styles.text}>
              <h3 className={styles.title}>{item.title}</h3>
              <p className={styles.body}>{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
