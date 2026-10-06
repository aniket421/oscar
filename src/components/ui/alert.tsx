import type { HTMLAttributes, ReactNode } from "react";

import { ErrorIcon, InfoIcon, SuccessIcon, WarningIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

import styles from "./alert.module.css";

export type AlertTone = "info" | "success" | "warning" | "error";

const icons: Record<AlertTone, typeof InfoIcon> = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
};

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: AlertTone;
  title?: ReactNode;
  /** Optional actions (buttons or links) placed under the message. */
  actions?: ReactNode;
}

/**
 * Inline, persistent message. It has no live-region role by default; pass
 * `role="alert"` only when it is inserted in response to a user action and must
 * interrupt (for example a failed submission).
 */
export function Alert({
  tone = "info",
  title,
  actions,
  className,
  children,
  ...props
}: AlertProps) {
  const Icon = icons[tone];
  return (
    <div className={cn(styles.alert, styles[tone], className)} {...props}>
      <Icon size={18} className={styles.icon} />
      <div className={styles.body}>
        {title ? <p className={styles.title}>{title}</p> : null}
        {children ? <div className={styles.message}>{children}</div> : null}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </div>
  );
}
