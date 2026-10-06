import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import styles from "./card.module.css";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** `raised` adds a soft shadow; use it sparingly for surfaces that sit above content. */
  elevation?: "flat" | "raised";
  padding?: "compact" | "standard" | "none";
  /** Render as `section`, `article`, or `li` when that is semantically correct. */
  as?: "div" | "section" | "article" | "li";
}

export function Card({
  elevation = "flat",
  padding = "standard",
  as: Component = "div",
  className,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(styles.card, styles[elevation], styles[`padding-${padding}`], className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.header, className)} {...props} />;
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h2" | "h3" | "h4";
}

export function CardTitle({ as: Component = "h3", className, ...props }: CardTitleProps) {
  return <Component className={cn(styles.title, className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn(styles.description, className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.content, className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.footer, className)} {...props} />;
}
