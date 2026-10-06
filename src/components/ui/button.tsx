import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "@/lib/cn";

import styles from "./button.module.css";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Button class names, for elements that must look like a button but are not
 * one (e.g. a `<Link>` that navigates). Links stay links; buttons stay buttons.
 */
export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(styles.button, styles[variant], styles[size], fullWidth && styles.fullWidth, className);
}

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, Omit<ButtonStyleOptions, "className"> {
  /** Shows a spinner, blocks interaction, and marks the button busy. */
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  leadingIcon,
  trailingIcon,
  disabled,
  className,
  children,
  type = "button",
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, fullWidth, className })}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      onClick={loading ? (event) => event.preventDefault() : onClick}
      {...props}
    >
      {loading ? (
        <span className={styles.spinner}>
          <Spinner size={size === "lg" ? "md" : "sm"} />
        </span>
      ) : null}
      <span className={styles.content}>
        {leadingIcon}
        {children}
        {trailingIcon}
      </span>
    </button>
  );
}
