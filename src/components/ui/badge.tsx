import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import styles from "./badge.module.css";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "error" | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

/** Short, non-interactive status text. Not a button and not a tag input. */
export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return <span className={cn(styles.badge, styles[tone], className)} {...props} />;
}
