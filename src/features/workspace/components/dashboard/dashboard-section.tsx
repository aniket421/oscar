import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./dashboard.module.css";

interface DashboardSectionProps {
  id: string;
  title: string;
  /** Optional "View all" style link to the full area. */
  link?: { href: string; label: string };
  children: ReactNode;
}

/** A titled dashboard region separated by whitespace and a hairline, not a card. */
export function DashboardSection({ id, title, link, children }: DashboardSectionProps) {
  const titleId = `${id}-title`;
  return (
    <section aria-labelledby={titleId} className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 id={titleId} className={styles.sectionTitle}>
          {title}
        </h2>
        {link ? (
          <Link href={link.href} className={styles.sectionLink}>
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
