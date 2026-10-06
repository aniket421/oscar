import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

import styles from "./choice.module.css";
import { useFieldIds } from "./field";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> {
  label: ReactNode;
  description?: ReactNode;
}

/**
 * A checkbox with `role="switch"`: announced as on/off, toggled with Space,
 * and submitted with forms like any checkbox.
 */
export function Switch({ id, label, description, className, disabled, ...props }: SwitchProps) {
  const { controlId, descriptionId } = useFieldIds(id);

  return (
    <div
      className={cn(styles.choice, styles.switchRow, className)}
      data-disabled={disabled || undefined}
    >
      <span className={styles.text}>
        <label htmlFor={controlId} className={styles.label}>
          {label}
        </label>
        {description ? (
          <span id={descriptionId} className={styles.description}>
            {description}
          </span>
        ) : null}
      </span>
      <input
        id={controlId}
        type="checkbox"
        role="switch"
        className={cn(styles.input, styles.switch)}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        {...props}
      />
    </div>
  );
}
