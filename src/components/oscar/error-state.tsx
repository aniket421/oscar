import type { ReactNode } from "react";

import { OscarStatus } from "./oscar-status";

export interface ErrorStateProps {
  title?: string;
  /** Plain-language explanation. Never pass error messages, codes, or stack traces. */
  description?: string;
  /** Recovery actions, e.g. a "Try again" button and a link back to safety. */
  actions: ReactNode;
  className?: string;
}

/** Reusable failure state: what happened, in plain words, and a way to recover. */
export function ErrorState({
  title = "Something went wrong",
  description = "This page could not be loaded. Your account and data are not affected. Try again, or go back to your dashboard.",
  actions,
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={className}>
      <OscarStatus state="error" title={title} description={description} actions={actions} />
    </div>
  );
}
