import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { OscarPresence, type OscarState } from "./oscar-presence";
import styles from "./oscar-status.module.css";

export interface OscarStatusProps {
  state: OscarState;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Announce changes politely (use for loading and async outcomes). */
  live?: boolean;
  /** `md` for compact regions; `lg` (default) for page-level states. */
  size?: "md" | "lg";
  className?: string;
}

/**
 * Centered status message for empty, loading, success, and error states, so
 * every such state in Oscar looks and reads the same.
 */
export function OscarStatus({
  state,
  title,
  description,
  actions,
  live = false,
  size = "lg",
  className,
}: OscarStatusProps) {
  return (
    <div
      className={cn(styles.status, className)}
      role={live ? "status" : undefined}
      aria-busy={state === "thinking" || undefined}
    >
      <OscarPresence state={state} size={size} decorative />
      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
