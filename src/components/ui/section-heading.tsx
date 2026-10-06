import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import styles from "./section-heading.module.css";
import { Heading, type HeadingSize } from "./typography";

export interface SectionHeadingProps {
  title: ReactNode;
  /** Short context label above the title. */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Buttons or links aligned with the heading on wide screens. */
  actions?: ReactNode;
  as?: "h1" | "h2" | "h3";
  size?: HeadingSize;
  align?: "start" | "center";
  className?: string;
}

export function SectionHeading({
  title,
  eyebrow,
  description,
  actions,
  as = "h2",
  size,
  align = "start",
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn(styles.sectionHeading, styles[align], className)}>
      <div className={styles.text}>
        {eyebrow ? <p className={cn("text-overline", styles.eyebrow)}>{eyebrow}</p> : null}
        <Heading as={as} size={size}>
          {title}
        </Heading>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
