import type { ReactNode } from "react";

import styles from "../showcase.module.css";

interface ShowcaseSectionProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}

export function ShowcaseSection({ id, title, description, children }: ShowcaseSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 id={`${id}-title`} className="text-h3">
          {title}
        </h2>
        {description ? <p className="text-small text-muted">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function Demo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.demo}>
      <h3 className="text-overline text-muted">{title}</h3>
      <div className={styles.demoBody}>{children}</div>
    </div>
  );
}
