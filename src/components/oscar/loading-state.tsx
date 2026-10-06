import { OscarStatus } from "./oscar-status";

export interface LoadingStateProps {
  /** Say what is happening, e.g. "Loading your workspace". */
  label: string;
  className?: string;
}

/**
 * Compact, announced loading state for regions without a meaningful skeleton.
 * Prefer a skeleton that mirrors the content when the layout is known.
 */
export function LoadingState({ label, className }: LoadingStateProps) {
  return <OscarStatus state="thinking" title={label} live size="md" className={className} />;
}
