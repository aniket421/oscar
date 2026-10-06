import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import styles from "./page-header.module.css";

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Short label above the title (e.g. the navigation group). */
  eyebrow?: string;
  /** Status shown beside the eyebrow, e.g. an "Available later" badge. */
  status?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** The page's own heading block. Every workspace page has exactly one. */
export function PageHeader({
  title,
  description,
  eyebrow,
  status,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(styles.pageHeader, className)}>
      <div className={styles.text}>
        {eyebrow || status ? (
          <div className={styles.meta}>
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
            {status}
          </div>
        ) : null}
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
