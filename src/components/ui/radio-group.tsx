"use client";

import type { ReactNode } from "react";
import { useId } from "react";

import { cn } from "@/lib/cn";

import styles from "./choice.module.css";
import { describedBy, FieldDescription, FieldError } from "./field";

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  legend: ReactNode;
  options: readonly RadioOption[];
  /** Form field name. Generated when omitted. */
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  orientation?: "vertical" | "horizontal";
  className?: string;
}

/**
 * Native radio inputs in a fieldset: arrow-key navigation and form submission
 * come from the platform.
 */
export function RadioGroup({
  legend,
  options,
  name,
  value,
  defaultValue,
  onValueChange,
  description,
  error,
  required,
  disabled,
  orientation = "vertical",
  className,
}: RadioGroupProps) {
  const baseId = useId();
  const groupName = name ?? baseId;
  const descriptionId = `${baseId}-description`;
  const errorId = `${baseId}-error`;
  const hasError = error !== undefined && error !== null && error !== false;

  return (
    <fieldset
      className={cn(styles.fieldset, className)}
      disabled={disabled}
      aria-describedby={describedBy(description ? descriptionId : false, hasError && errorId)}
    >
      <legend className={styles.legend}>
        {legend}
        {required ? (
          <span className={styles.requiredMark} aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
      <div className={styles.options} data-orientation={orientation}>
        {options.map((option, index) => {
          const optionId = `${baseId}-${index}`;
          const optionDescriptionId = `${optionId}-description`;
          return (
            <div
              key={option.value}
              className={styles.choice}
              data-disabled={disabled || option.disabled || undefined}
            >
              <span className={styles.boxWrapper}>
                <input
                  id={optionId}
                  type="radio"
                  name={groupName}
                  value={option.value}
                  className={cn(styles.input, styles.radio)}
                  required={required}
                  disabled={option.disabled}
                  aria-describedby={option.description ? optionDescriptionId : undefined}
                  {...(value !== undefined
                    ? { checked: value === option.value }
                    : { defaultChecked: defaultValue === option.value })}
                  onChange={(event) => onValueChange?.(event.currentTarget.value)}
                />
              </span>
              <span className={styles.text}>
                <label htmlFor={optionId} className={styles.label}>
                  {option.label}
                </label>
                {option.description ? (
                  <span id={optionDescriptionId} className={styles.description}>
                    {option.description}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      {hasError ? <FieldError id={errorId}>{error}</FieldError> : null}
    </fieldset>
  );
}
