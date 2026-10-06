"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useId, useRef, useState } from "react";

import { cn } from "@/lib/cn";

import styles from "./tabs.module.css";

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: readonly TabItem[];
  /** Accessible name for the tab list. */
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

/**
 * WAI-ARIA tabs with automatic activation: Left/Right move and select,
 * Home/End jump, Tab moves into the active panel.
 */
export function Tabs({ items, label, value, defaultValue, onValueChange, className }: TabsProps) {
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const firstEnabled = items.find((item) => !item.disabled)?.value;
  const [internalValue, setInternalValue] = useState(defaultValue ?? firstEnabled);
  const selected = value ?? internalValue;

  function select(next: string) {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = items.flatMap((item, index) => (item.disabled ? [] : [index]));
    const current = enabled.indexOf(items.findIndex((item) => item.value === selected));
    let target: number | undefined;

    if (event.key === "ArrowRight") target = enabled[(current + 1) % enabled.length];
    else if (event.key === "ArrowLeft")
      target = enabled[(current - 1 + enabled.length) % enabled.length];
    else if (event.key === "Home") target = enabled[0];
    else if (event.key === "End") target = enabled.at(-1);
    else return;

    event.preventDefault();
    const item = target === undefined ? undefined : items[target];
    if (target === undefined || !item) return;
    select(item.value);
    tabRefs.current[target]?.focus();
  }

  return (
    <div className={cn(styles.tabs, className)}>
      <div role="tablist" aria-label={label} className={styles.list} onKeyDown={onKeyDown}>
        {items.map((item, index) => {
          const isSelected = item.value === selected;
          return (
            <button
              key={item.value}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`${baseId}-tab-${index}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${index}`}
              tabIndex={isSelected ? 0 : -1}
              disabled={item.disabled}
              className={styles.tab}
              onClick={() => select(item.value)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item, index) => (
        <div
          key={item.value}
          id={`${baseId}-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${index}`}
          tabIndex={0}
          hidden={item.value !== selected}
          className={styles.panel}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
