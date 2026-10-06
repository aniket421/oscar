"use client";

import type { ReactNode } from "react";
import { Fragment, useLayoutEffect, useState } from "react";

/**
 * Next.js keeps recently visited pages mounted but hidden (React `<Activity>`)
 * to preserve UI state. Auth forms must not keep anything: no typed password,
 * no stale error. When this subtree is hidden, it remounts so it comes back fresh.
 */
export function ResetOnHide({ children }: { children: ReactNode }) {
  const [generation, setGeneration] = useState(0);
  useLayoutEffect(() => () => setGeneration((value) => value + 1), []);
  return <Fragment key={generation}>{children}</Fragment>;
}
