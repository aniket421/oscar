"use client";

import Link from "next/link";
import type { KeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/cn";

import styles from "./dropdown-menu.module.css";

interface DropdownMenuItemBase {
  /** Stable key for the item. */
  id: string;
  label: ReactNode;
  disabled?: boolean;
  /** Styles the item as a destructive action. */
  destructive?: boolean;
}

/** An item that performs an action (rendered as a button). */
export interface DropdownMenuActionItem extends DropdownMenuItemBase {
  onSelect: () => void;
  href?: never;
}

/** An item that navigates (rendered as a real link, so it can be opened in a new tab). */
export interface DropdownMenuLinkItem extends DropdownMenuItemBase {
  href: string;
  onSelect?: never;
}

export type DropdownMenuItem = DropdownMenuActionItem | DropdownMenuLinkItem;

export interface DropdownMenuProps {
  /** Renders the trigger. Spread `triggerProps` onto a `<button>` (e.g. Button or IconButton). */
  trigger: (triggerProps: DropdownTriggerProps) => ReactNode;
  items: readonly DropdownMenuItem[];
  /** Accessible name for the menu. */
  label: string;
  /** Non-interactive content above the items (e.g. who is signed in). */
  header?: ReactNode;
  align?: "start" | "end";
  className?: string;
}

export interface DropdownTriggerProps {
  id: string;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

/**
 * Action menu following the WAI-ARIA menu button pattern: Enter/Space/ArrowDown
 * open on the first item, ArrowUp opens on the last, arrows/Home/End move,
 * Escape closes and returns focus, Tab closes.
 */
export function DropdownMenu({
  trigger,
  items,
  label,
  header,
  align = "start",
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const [initialFocus, setInitialFocus] = useState<"first" | "last">("first");
  const triggerId = useId();
  const menuId = useId();

  const enabledIndexes = items.flatMap((item, index) => (item.disabled ? [] : [index]));

  const focusItem = useCallback((index: number | undefined) => {
    if (index !== undefined) itemRefs.current[index]?.focus();
  }, []);

  const close = useCallback(
    (returnFocus: boolean) => {
      setOpen(false);
      if (returnFocus) document.getElementById(triggerId)?.focus();
    },
    [triggerId],
  );

  const firstEnabled = enabledIndexes[0];
  const lastEnabled = enabledIndexes.at(-1);

  // Move focus into the menu once it has rendered.
  useEffect(() => {
    if (open) focusItem(initialFocus === "first" ? firstEnabled : lastEnabled);
  }, [open, initialFocus, firstEnabled, lastEnabled, focusItem]);

  // Close on outside pointer interaction.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function openMenu(focus: "first" | "last") {
    setInitialFocus(focus);
    setOpen(true);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu("last");
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = itemRefs.current.findIndex((element) => element === document.activeElement);
    const position = enabledIndexes.indexOf(current);
    const count = enabledIndexes.length;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(enabledIndexes[(position + 1) % count]);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(enabledIndexes[(position - 1 + count) % count]);
        break;
      case "Home":
        event.preventDefault();
        focusItem(enabledIndexes[0]);
        break;
      case "End":
        event.preventDefault();
        focusItem(enabledIndexes.at(-1));
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className={cn(styles.root, className)}>
      {trigger({
        id: triggerId,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": menuId,
        onClick: () => (open ? close(false) : openMenu("first")),
        onKeyDown: onTriggerKeyDown,
      })}
      <div className={cn(styles.popover, styles[align])} hidden={!open}>
        {header ? <div className={styles.header}>{header}</div> : null}
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={styles.menu}
          onKeyDown={onMenuKeyDown}
        >
          {items.map((item, index) => {
            const setRef = (element: HTMLElement | null) => {
              itemRefs.current[index] = element;
            };
            const className = cn(styles.item, item.destructive && styles.destructive);

            if (item.href !== undefined && !item.disabled) {
              return (
                <Link
                  key={item.id}
                  ref={setRef}
                  href={item.href}
                  role="menuitem"
                  tabIndex={-1}
                  className={className}
                  onClick={() => close(false)}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                ref={setRef}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                className={className}
                onClick={() => {
                  close(true);
                  item.onSelect?.();
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
