import type { SelectHTMLAttributes } from "react";

import { ChevronDownIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

import { FieldShell, type FieldProps } from "./field";
import styles from "./field.module.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends FieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, keyof FieldProps> {
  options: readonly SelectOption[];
  /** Adds an empty first option. Pair with `required` to force a choice. */
  placeholder?: string;
  selectClassName?: string;
}

/**
 * Native `<select>`: full keyboard support and the platform picker on mobile,
 * styled to match the other controls.
 */
export function Select({
  id,
  label,
  description,
  error,
  required,
  disabled,
  hideLabel,
  className,
  selectClassName,
  options,
  placeholder,
  value,
  defaultValue,
  ...props
}: SelectProps) {
  // With a placeholder and no explicit value, start on the placeholder option.
  const initialValue = defaultValue ?? (placeholder !== undefined ? "" : undefined);

  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      required={required}
      disabled={disabled}
      hideLabel={hideLabel}
      className={className}
    >
      {(control) => (
        <div className={styles.selectWrapper}>
          <select
            className={cn(styles.control, styles.select, selectClassName)}
            {...(value !== undefined ? { value } : { defaultValue: initialValue })}
            {...props}
            {...control}
          >
            {placeholder !== undefined ? (
              <option value="" disabled={required}>
                {placeholder}
              </option>
            ) : null}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className={styles.selectIcon} />
        </div>
      )}
    </FieldShell>
  );
}
