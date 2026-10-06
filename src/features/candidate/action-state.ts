import type { FieldErrors } from "./validation";

/** The result of a profile or resume Server Action, as the form that called it sees it. */
export interface ActionState<Field extends string = string> {
  status: "idle" | "success" | "error";
  /** A sentence for the candidate: what happened, or what to do. Never a provider message. */
  message?: string;
  fieldErrors?: FieldErrors<Field>;
  /** Set on every completed submission, so a form can tell two identical results apart. */
  completedAt?: number;
}

export const idleActionState: ActionState = { status: "idle" };
