import type { InputHTMLAttributes, ReactNode } from "react";

import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

import styles from "./choice.module.css";
import { describedBy, FieldError, useFieldIds } from "./field";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
}

export function Checkbox({
  id,
  label,
  description,
  error,
  className,
  disabled,
  ...props
}: CheckboxProps) {
  const { controlId, descriptionId, errorId } = useFieldIds(id);
  const hasError = error !== undefined && error !== null && error !== false;

  return (
    <div className={cn(styles.choice, className)} data-disabled={disabled || undefined}>
      <span className={styles.boxWrapper}>
        <input
          id={controlId}
          type="checkbox"
          className={cn(styles.input, styles.checkbox)}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy(description ? descriptionId : false, hasError && errorId)}
          {...props}
        />
        <CheckIcon size={12} strokeWidth={2.5} className={styles.checkIcon} />
      </span>
      <span className={styles.text}>
        <label htmlFor={controlId} className={styles.label}>
          {label}
        </label>
        {description ? (
          <span id={descriptionId} className={styles.description}>
            {description}
          </span>
        ) : null}
        {hasError ? <FieldError id={errorId}>{error}</FieldError> : null}
      </span>
    </div>
  );
}
