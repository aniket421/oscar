import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { FieldShell, type FieldProps } from "./field";
import styles from "./field.module.css";

export interface TextareaProps
  extends FieldProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof FieldProps> {
  textareaClassName?: string;
}

export function Textarea({
  id,
  label,
  description,
  error,
  required,
  disabled,
  hideLabel,
  className,
  textareaClassName,
  rows = 4,
  ...props
}: TextareaProps) {
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
        <textarea
          rows={rows}
          className={cn(styles.control, styles.textarea, textareaClassName)}
          {...props}
          {...control}
        />
      )}
    </FieldShell>
  );
}
