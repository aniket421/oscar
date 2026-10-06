"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

import styles from "./drawer.module.css";
import { IconButton } from "./icon-button";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name of the drawer (e.g. "Navigation"). */
  label: string;
  /** Optional visible content at the top, beside the close button (e.g. the wordmark). */
  header?: ReactNode;
  children: ReactNode;
  side?: "start" | "end";
  className?: string;
}

/**
 * Off-canvas panel built on the native modal `<dialog>`: the browser traps
 * focus, makes the page behind it inert, handles Escape, and returns focus to
 * the element that opened it.
 */
export function Drawer({
  open,
  onOpenChange,
  label,
  header,
  children,
  side = "start",
  className,
}: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={cn(styles.drawer, styles[side], className)}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => {
        if (open) onOpenChange(false);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerContent}>{header}</div>
          <IconButton
            label="Close menu"
            icon={<CloseIcon size={20} />}
            onClick={() => onOpenChange(false)}
          />
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  );
}
