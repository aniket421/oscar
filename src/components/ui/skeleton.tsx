import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";

import styles from "./skeleton.module.css";

export interface SkeletonProps {
  /** Any CSS length. Defaults to full width. */
  width?: CSSProperties["width"];
  /** Any CSS length. Defaults to one line of body text. */
  height?: CSSProperties["height"];
  shape?: "line" | "block" | "circle";
  className?: string;
}

/**
 * Decorative placeholder. Mark the loading region itself with `aria-busy="true"`
 * and give it an accessible loading message; skeletons are hidden from AT.
 */
export function Skeleton({ width, height, shape = "line", className }: SkeletonProps) {
  return (
    <span
      className={cn(styles.skeleton, styles[shape], className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
