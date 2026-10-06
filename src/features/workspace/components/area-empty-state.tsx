import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui";

import type { EmptyStateCopy } from "../content";

interface AreaEmptyStateProps {
  copy: EmptyStateCopy;
  visual?: ReactNode;
  action?: ReactNode;
  size?: "section" | "page";
  headingLevel?: "h2" | "h3";
}

/** Workspace empty state built from reviewed copy: what, why, and what next. */
export function AreaEmptyState({
  copy,
  visual,
  action,
  size = "section",
  headingLevel = "h3",
}: AreaEmptyStateProps) {
  return (
    <EmptyState
      visual={visual}
      title={copy.title}
      description={copy.description}
      reason={copy.reason}
      next={copy.next}
      headingLevel={headingLevel}
      size={size}
      action={action}
    />
  );
}
