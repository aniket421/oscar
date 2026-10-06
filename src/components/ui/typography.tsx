import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export type HeadingSize = "display" | "h1" | "h2" | "h3" | "h4";

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Semantic level (document outline). */
  as: HeadingLevel;
  /** Visual size. Defaults to the matching level so outline and look stay aligned. */
  size?: HeadingSize;
}

export function Heading({ as: Component, size, className, ...props }: HeadingProps) {
  const visual = size ?? (Component === "h5" || Component === "h6" ? "h4" : Component);
  return <Component className={cn(`text-${visual}`, className)} {...props} />;
}

export type TextVariant = "lead" | "body" | "small" | "caption" | "label" | "overline";

export interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  muted?: boolean;
  as?: "p" | "span" | "div";
}

export function Text({
  variant = "body",
  muted = false,
  as: Component = "p",
  className,
  ...props
}: TextProps) {
  return (
    <Component className={cn(`text-${variant}`, muted && "text-muted", className)} {...props} />
  );
}
