import { cn } from "@/lib/cn";

import styles from "./oscar-presence.module.css";

/**
 * Oscar's states across the product. One visual language for idle UI, voice and
 * video interviews, loading, and outcomes.
 */
export type OscarState = "idle" | "listening" | "thinking" | "speaking" | "success" | "error";

const defaultLabels: Record<OscarState, string> = {
  idle: "Oscar",
  listening: "Oscar is listening",
  thinking: "Oscar is thinking",
  speaking: "Oscar is speaking",
  success: "Oscar: complete",
  error: "Oscar: something went wrong",
};

export interface OscarPresenceProps {
  state?: OscarState;
  size?: "sm" | "md" | "lg" | "xl";
  /** Accessible label. Defaults to a description of the state. */
  label?: string;
  /** Hide from assistive technology when adjacent text already conveys the state. */
  decorative?: boolean;
  className?: string;
}

/**
 * Oscar's visual presence: a charcoal core inside a signal ring. Abstract on
 * purpose (no face, no robot, no mascot) so it scales from a 24px inline mark to
 * the centerpiece of an interview screen.
 */
export function OscarPresence({
  state = "idle",
  size = "md",
  label,
  decorative = false,
  className,
}: OscarPresenceProps) {
  return (
    <span
      className={cn(styles.presence, styles[size], className)}
      data-state={state}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : (label ?? defaultLabels[state])}
      aria-hidden={decorative || undefined}
    >
      <svg viewBox="0 0 48 48" className={styles.svg} aria-hidden="true" focusable="false">
        <circle className={styles.halo} cx="24" cy="24" r="22" />
        <circle className={styles.track} cx="24" cy="24" r="21" />
        <circle className={styles.arc} cx="24" cy="24" r="21" pathLength="100" />
        <circle className={styles.core} cx="24" cy="24" r="15" />
        {state === "speaking" ? (
          <g className={styles.bars}>
            <rect x="18.5" y="20" width="2" height="8" rx="1" />
            <rect x="23" y="17" width="2" height="14" rx="1" />
            <rect x="27.5" y="20" width="2" height="8" rx="1" />
          </g>
        ) : state === "success" ? (
          <path className={styles.glyph} d="M18.5 24.5l3.5 3.5 7.5-8" />
        ) : state === "error" ? (
          <path className={styles.glyph} d="M24 18.5v6.5M24 29.5v.01" />
        ) : (
          <circle className={styles.signal} cx="24" cy="24" r="3" />
        )}
      </svg>
    </span>
  );
}
