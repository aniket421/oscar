"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";

import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

import styles from "./dialog.module.css";
import { IconButton } from "./icon-button";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Action buttons, rendered right-aligned (stacked on mobile). */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Close when the backdrop is clicked. Disable for forms with unsaved input. */
  dismissOnBackdrop?: boolean;
  className?: string;
}

/**
 * Modal dialog built on the native `<dialog>` element: the browser provides the
 * focus trap, inert background, top-layer stacking, Escape handling, and focus
 * return to the trigger. This component keeps it controlled.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissOnBackdrop = true,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cn(styles.dialog, styles[size], className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        // Escape: keep React state as the source of truth.
        event.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => {
        if (open) onOpenChange(false);
      }}
      onClick={(event) => {
        // Clicks on the dialog element itself land on the backdrop area.
        if (dismissOnBackdrop && event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.headings}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className={styles.description}>
                {description}
              </p>
            ) : null}
          </div>
        </header>
        {children ? <div className={styles.body}>{children}</div> : null}
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
        {/* Last in DOM order so initial focus lands on the dialog's content, not on Close. */}
        <IconButton
          label="Close dialog"
          icon={<CloseIcon size={18} />}
          size="sm"
          className={styles.close}
          onClick={() => onOpenChange(false)}
        />
      </div>
    </dialog>
  );
}
