"use client";

import { useState } from "react";

import type { FieldErrors } from "../validation";

/**
 * Field errors from two sources: instant client validation and the server
 * action's latest result. Editing a field clears its error.
 */
export function useFormErrors<Field extends string>(serverErrors: FieldErrors<Field> | undefined) {
  const [errors, setErrors] = useState<FieldErrors<Field>>(serverErrors ?? {});
  const [lastServerErrors, setLastServerErrors] = useState(serverErrors);

  // Adopt new server errors when a new action result arrives (derived state, no effect needed).
  if (serverErrors !== lastServerErrors) {
    setLastServerErrors(serverErrors);
    setErrors(serverErrors ?? {});
  }

  function clear(field: Field) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  return { errors, setErrors, clear };
}

/** Moves focus to the first invalid control so keyboard and screen-reader users land on it. */
export function focusFirstInvalid<Field extends string>(
  form: HTMLFormElement,
  order: readonly Field[],
  errors: FieldErrors<Field>,
) {
  const first = order.find((field) => errors[field]);
  if (!first) return;
  const element = form.elements.namedItem(first);
  if (element instanceof HTMLElement) element.focus();
}
