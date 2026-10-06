import type { LabelHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import styles from "./field.module.css";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Shows a visual required marker. Pair with `required` on the control itself. */
  required?: boolean;
}

export function Label({ required = false, className, children, ...props }: LabelProps) {
  return (
    <label className={cn(styles.label, className)} {...props}>
      {children}
      {required ? (
        <span className={styles.requiredMark} aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}
