"use client";

import type { FormEvent, ReactNode } from "react";
import { startTransition, useActionState, useState } from "react";

import { Alert, Button } from "@/components/ui";

import { idleActionState, type ActionState } from "../../action-state";
import {
  readFormInput,
  type FieldErrors,
  type FormInput,
  type ValidationResult,
} from "../../validation";
import styles from "./profile.module.css";
import { useSectionEditor } from "./section-editor";

export interface FieldHelpers<Field extends string> {
  errors: FieldErrors<Field>;
  /** Clears a field's error when it is edited. */
  clear: (field: Field) => void;
}

export interface ProfileFormProps<Field extends string> {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** The same validator the Server Action runs, for instant feedback. */
  validate: (input: FormInput) => ValidationResult<unknown, Field>;
  /** Field names in visual order, to focus the first invalid one. */
  fieldOrder: readonly Field[];
  /** Accessible name of the form, for example "Personal details". */
  label: string;
  submitLabel?: string;
  pendingLabel?: string;
  /** Hidden values sent with the form, such as an entry id. */
  hidden?: Record<string, string>;
  children: (helpers: FieldHelpers<Field>) => ReactNode;
}

/**
 * A profile form following the design system's form pattern: browser validation with the
 * server's validator, focus on the first invalid field, errors cleared on edit, a form-level
 * alert for server failures, and a pending state on the submit button.
 */
export function ProfileForm<Field extends string>({
  action,
  validate,
  fieldOrder,
  label,
  submitLabel = "Save",
  pendingLabel = "Saving",
  hidden,
  children,
}: ProfileFormProps<Field>) {
  const editor = useSectionEditor();
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.status === "success") editor.done(result.message ?? "Saved.");
      else setErrors((result.fieldErrors ?? {}) as FieldErrors<Field>);
      return result;
    },
    idleActionState,
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // Dispatched by hand rather than through `<form action>`, which resets every field after
    // submitting: typed values must survive a failed save.
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = validate(readFormInput(formData));
    if (result.ok) {
      startTransition(() => formAction(formData));
      return;
    }
    setErrors(result.errors);
    const first = fieldOrder.find((field) => result.errors[field]);
    const element = first ? form.elements.namedItem(first) : null;
    if (element instanceof HTMLElement) element.focus();
    else if (element instanceof RadioNodeList) (element[0] as HTMLElement | undefined)?.focus();
  }

  function clear(field: Field) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  const formError = state.status === "error" && !state.fieldErrors ? state.message : undefined;

  return (
    <form className={styles.form} onSubmit={onSubmit} aria-label={label} noValidate>
      {formError ? (
        <Alert tone="error" title="Not saved" role="alert">
          {formError}
        </Alert>
      ) : null}
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      <div className={styles.fields}>{children({ errors, clear })}</div>
      <div className={styles.formActions}>
        <Button type="submit" size="sm" loading={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        <Button variant="ghost" size="sm" onClick={editor.cancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
