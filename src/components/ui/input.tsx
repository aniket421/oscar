import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { FieldShell, type FieldProps } from "./field";
import styles from "./field.module.css";

export interface InputProps
  extends FieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, keyof FieldProps> {
  inputClassName?: string;
}

export function Input({
  id,
  label,
  description,
  error,
  required,
  disabled,
  hideLabel,
  className,
  inputClassName,
  type = "text",
  ...props
}: InputProps) {
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
        <input type={type} className={cn(styles.control, inputClassName)} {...props} {...control} />
      )}
    </FieldShell>
  );
}
