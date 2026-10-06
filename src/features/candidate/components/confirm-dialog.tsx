"use client";

import { useActionState, useId } from "react";

import { Alert, Button, Dialog } from "@/components/ui";

import { idleActionState, type ActionState } from "../action-state";

export interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Server Action run on confirm; receives `fields` as form data. */
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  confirmLabel: string;
  pendingLabel: string;
  /** Called after the action succeeds, with its message. */
  onConfirmed: (message: string) => void;
}

/** A destructive confirmation: Cancel, or run a Server Action and report its outcome. */
export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  action,
  fields,
  confirmLabel,
  pendingLabel,
  onConfirmed,
}: ConfirmActionDialogProps) {
  const formId = useId();
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.status === "success") onConfirmed(result.message ?? "Done.");
      return result;
    },
    idleActionState,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" type="submit" form={formId} loading={pending}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </>
      }
    >
      <form id={formId} action={formAction}>
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      </form>
      {state.status === "error" && state.message ? (
        <Alert tone="error" role="alert">
          {state.message}
        </Alert>
      ) : null}
    </Dialog>
  );
}
