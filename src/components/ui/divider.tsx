import { cn } from "@/lib/cn";

import styles from "./divider.module.css";

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  /** Decorative dividers are hidden from assistive technology. */
  decorative?: boolean;
  className?: string;
}

export function Divider({
  orientation = "horizontal",
  decorative = false,
  className,
}: DividerProps) {
  if (orientation === "horizontal" && !decorative) {
    return <hr className={cn(styles.divider, styles.horizontal, className)} />;
  }
  return (
    <div
      className={cn(styles.divider, styles[orientation], className)}
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
    />
  );
}
