import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";

import styles from "./legal-document.module.css";

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

interface LegalDocumentProps {
  title: string;
  /** ISO date (YYYY-MM-DD) of the last substantive change. */
  lastUpdated: string;
  intro: ReactNode;
  sections: readonly LegalSection[];
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/** Shared layout for policy pages: title, date, contents, numbered sections. */
export function LegalDocument({ title, lastUpdated, intro, sections }: LegalDocumentProps) {
  return (
    <Container width="narrow" className={styles.page}>
      <article className={styles.article}>
        <header className={styles.header}>
          <h1 className="text-h1">{title}</h1>
          <p className={styles.updated}>
            Last updated <time dateTime={lastUpdated}>{formatDate(lastUpdated)}</time>
          </p>
          <div className={styles.intro}>{intro}</div>
        </header>

        <nav aria-label="Contents" className={styles.toc}>
          <h2 className={styles.tocTitle}>Contents</h2>
          <ol className={styles.tocList}>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        {sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            className={styles.section}
          >
            <h2 id={`${section.id}-title`} className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>{index + 1}.</span> {section.title}
            </h2>
            <div className={styles.prose}>{section.content}</div>
          </section>
        ))}
      </article>
    </Container>
  );
}
