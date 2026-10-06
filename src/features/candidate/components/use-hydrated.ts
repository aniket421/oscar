"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during server rendering and hydration, true once the component is interactive. Controls
 * that only work with JavaScript (file pickers) stay disabled until then, so a file chosen before
 * the page is ready is never silently ignored.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
