import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { SectionHeading, type SectionHeadingProps } from "@/components/ui";
import { cn } from "@/lib/cn";

import styles from "./section.module.css";

interface SectionProps extends Omit<SectionHeadingProps, "titleId" | "as"> {
  id: string;
  tone?: "default" | "subtle";
  children: ReactNode;
}

/** A landing page section: anchor target, labelled landmark, heading, content. */
export function Section({ id, tone = "default", children, className, ...heading }: SectionProps) {
  const titleId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(styles.section, styles[tone], className)}
    >
      <Container>
        <div className={styles.inner}>
          <SectionHeading {...heading} titleId={titleId} />
          {children}
        </div>
      </Container>
    </section>
  );
}
