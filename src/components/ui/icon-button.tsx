import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

import styles from "./icon-button.module.css";

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children"
> {
  /** Required accessible name: icon-only buttons have no visible text. */
  label: string;
  icon: ReactNode;
  variant?: "ghost" | "outline" | "secondary";
  size?: "sm" | "md" | "lg";
}

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(styles.iconButton, styles[variant], styles[size], className)}
      {...props}
    >
      {icon}
    </button>
  );
}
