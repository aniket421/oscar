import { cn } from "@/lib/cn";

import { OscarPresence } from "./oscar-presence";
import styles from "./oscar-wordmark.module.css";

export interface OscarWordmarkProps {
  size?: "sm" | "md";
  className?: string;
}

/** Interim wordmark: the presence mark with the Oscar name set in the display face. */
export function OscarWordmark({ size = "md", className }: OscarWordmarkProps) {
  return (
    <span className={cn(styles.wordmark, styles[size], className)}>
      <OscarPresence size="sm" decorative className={styles.mark} />
      <span>Oscar</span>
    </span>
  );
}
