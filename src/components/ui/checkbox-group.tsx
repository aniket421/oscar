"use client";

import type { ReactNode } from "react";
import { useId } from "react";

import { cn } from "@/lib/cn";

import { Checkbox } from "./checkbox";
import styles from "./choice.module.css";
import { describedBy, FieldDescription, FieldError } from "./field";

export interface CheckboxOption {
  value: string;
  label: ReactNode;
}

export interface CheckboxGroupProps {
  legend: ReactNode;
  /** Form field name shared by every checkbox (submitted as repeated values). */
  name: string;
  options: readonly CheckboxOption[];
  defaultValue?: readonly string[];
  description?: ReactNode;
  error?: ReactNode;
  disabled?: boolean;
  orientation?: "vertical" | "horizontal";
  onChange?: () => void;
  className?: string;
}

/** Several native checkboxes in a fieldset, for choosing any number of options. */
export function CheckboxGroup({
  legend,
  name,
  options,
  defaultValue = [],
  description,
  error,
  disabled,
  orientation = "vertical",
  onChange,
  className,
}: CheckboxGroupProps) {
  const baseId = useId();
  const descriptionId = `${baseId}-description`;
  const errorId = `${baseId}-error`;
  const hasError = error !== undefined && error !== null && error !== false;

  return (
    <fieldset
      className={cn(styles.fieldset, className)}
      disabled={disabled}
      aria-describedby={describedBy(description ? descriptionId : false, hasError && errorId)}
    >
      <legend className={styles.legend}>{legend}</legend>
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
      <div className={styles.options} data-orientation={orientation}>
        {options.map((option, index) => (
          <Checkbox
            key={option.value}
            id={`${baseId}-${index}`}
            name={name}
            value={option.value}
            label={option.label}
            defaultChecked={defaultValue.includes(option.value)}
            aria-invalid={hasError || undefined}
            onChange={onChange}
          />
        ))}
      </div>
      {hasError ? <FieldError id={errorId}>{error}</FieldError> : null}
    </fieldset>
  );
}
