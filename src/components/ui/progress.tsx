import { useId } from "react";

import { cn } from "@/lib/cn";

import styles from "./progress.module.css";

export interface ProgressProps {
  /** Visible label; also the accessible name. */
  label: string;
  /** Current value. Omit for an indeterminate bar. */
  value?: number;
  max?: number;
  /** Show the percentage next to the label. */
  showValue?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function Progress({
  label,
  value,
  max = 100,
  showValue = false,
  size = "md",
  className,
}: ProgressProps) {
  const labelId = useId();
  const indeterminate = value === undefined;
  const clamped = indeterminate ? 0 : Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? Math.round((clamped / max) * 100) : 0;

  return (
    <div className={cn(styles.progress, className)}>
      <div className={styles.header}>
        <span id={labelId} className={styles.label}>
          {label}
        </span>
        {showValue && !indeterminate ? (
          <span className={styles.value} aria-hidden="true">
            {percent}%
          </span>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={indeterminate ? undefined : 0}
        aria-valuemax={indeterminate ? undefined : max}
        aria-valuenow={indeterminate ? undefined : clamped}
        className={cn(styles.track, styles[size])}
        data-indeterminate={indeterminate || undefined}
      >
        <div
          className={styles.indicator}
          data-motion={indeterminate ? "essential" : undefined}
          style={indeterminate ? undefined : { transform: `translateX(-${100 - percent}%)` }}
        />
      </div>
    </div>
  );
}
