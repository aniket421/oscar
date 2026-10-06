import { cn } from "@/lib/cn";

import styles from "./spinner.module.css";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  /** Accessible label. Omit when a parent already announces the busy state. */
  label?: string;
  className?: string;
}

export function Spinner({ size = "md", label, className }: SpinnerProps) {
  return (
    <span
      className={cn(styles.spinner, styles[size], className)}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-motion="essential"
    />
  );
}
