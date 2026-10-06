import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import styles from "./container.module.css";

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  width?: "default" | "narrow" | "full";
  /** Use `main` or `section` when the container is that landmark. */
  as?: "div" | "main" | "section";
}

/** Centers content with responsive side gutters. The base for every page section. */
export function Container({
  width = "default",
  as: Component = "div",
  className,
  ...props
}: ContainerProps) {
  return <Component className={cn(styles.container, styles[width], className)} {...props} />;
}
