import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import styles from "./empty-state.module.css";

export interface EmptyStateProps {
  /** Icon or visual (e.g. an icon, or `OscarPresence` for page-level states). */
  visual?: ReactNode;
  title: string;
  /** What this area holds once there is data. */
  description: ReactNode;
  /** Why it matters to the user's preparation. */
  reason?: ReactNode;
  /** What happens next, or what the user can do now. */
  next?: ReactNode;
  /** What the user can do next (a link or button). */
  action?: ReactNode;
  /** Optional status label shown beside the action (e.g. an "Available later" badge). */
  status?: ReactNode;
  headingLevel?: "h2" | "h3";
  size?: "section" | "page";
  className?: string;
}

/**
 * An empty state that explains instead of apologizing: what this area is,
 * why it matters, and what to do next. Never "Nothing here yet."
 */
export function EmptyState({
  visual,
  title,
  description,
  reason,
  next,
  action,
  status,
  headingLevel: Heading = "h3",
  size = "section",
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(styles.emptyState, styles[size], className)}>
      {visual ? <div className={styles.visual}>{visual}</div> : null}
      <div className={styles.text}>
        <Heading className={styles.title}>{title}</Heading>
        <p className={styles.description}>{description}</p>
        {reason ? (
          <p className={styles.detail}>
            <span className={styles.detailLabel}>Why it matters.</span> {reason}
          </p>
        ) : null}
        {next ? (
          <p className={styles.detail}>
            <span className={styles.detailLabel}>What&apos;s next.</span> {next}
          </p>
        ) : null}
      </div>
      {action || status ? (
        <div className={styles.footer}>
          {action}
          {status}
        </div>
      ) : null}
    </div>
  );
}
