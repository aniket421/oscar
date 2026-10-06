import type { ReactNode } from "react";
import { useId } from "react";

import { ErrorIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

import styles from "./field.module.css";
import { Label } from "./label";

/** Props shared by every labelled form control. */
export interface FieldProps {
  label: ReactNode;
  /** Helper text shown under the label. */
  description?: ReactNode;
  /** Validation message. When set, the control is marked invalid. */
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Visually hide the label (it stays available to assistive technology). */
  hideLabel?: boolean;
  className?: string;
}

export interface FieldControlProps {
  id: string;
  required?: boolean;
  disabled?: boolean;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

/** Generates the ids that tie a control to its label, description, and error. */
export function useFieldIds(id?: string) {
  const generated = useId();
  const controlId = id ?? generated;
  return {
    controlId,
    descriptionId: `${controlId}-description`,
    errorId: `${controlId}-error`,
  };
}

export function describedBy(...ids: Array<string | false | undefined>): string | undefined {
  const value = ids.filter(Boolean).join(" ");
  return value || undefined;
}

export function FieldDescription({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className={styles.description}>
      {children}
    </p>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className={styles.error}>
      <ErrorIcon size={14} className={styles.errorIcon} />
      <span>{children}</span>
    </p>
  );
}

interface FieldShellProps extends FieldProps {
  id?: string;
  /** Called with the props the control element must spread. */
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * Lays out label, description, control, and error, and wires their ids so the
 * control is announced with its description and error.
 */
export function FieldShell({
  id,
  label,
  description,
  error,
  required,
  disabled,
  hideLabel = false,
  className,
  children,
}: FieldShellProps) {
  const { controlId, descriptionId, errorId } = useFieldIds(id);
  const hasError = error !== undefined && error !== null && error !== false;

  return (
    <div className={cn(styles.field, className)} data-disabled={disabled || undefined}>
      <Label
        htmlFor={controlId}
        required={required}
        className={hideLabel ? "visually-hidden" : undefined}
      >
        {label}
      </Label>
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
      {children({
        id: controlId,
        required,
        disabled,
        "aria-invalid": hasError ? true : undefined,
        "aria-describedby": describedBy(description ? descriptionId : false, hasError && errorId),
      })}
      {hasError ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}
