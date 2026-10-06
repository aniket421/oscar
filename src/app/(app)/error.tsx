"use client";

import Link from "next/link";

import { ErrorState } from "@/components/oscar";
import { Button, buttonStyles } from "@/components/ui";

/**
 * Error boundary for the workspace. Next.js replaces server error messages
 * with a generic one in production; this screen never shows error details.
 */
export default function WorkspaceError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorState
      actions={
        <>
          <Button onClick={() => retry()}>Try again</Button>
          <Link href="/dashboard" className={buttonStyles({ variant: "outline" })}>
            Go to overview
          </Link>
        </>
      }
    />
  );
}
