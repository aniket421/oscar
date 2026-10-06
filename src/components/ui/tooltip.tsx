"use client";

import type { ReactElement, ReactNode } from "react";
import { cloneElement, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/cn";

import styles from "./tooltip.module.css";

const SHOW_DELAY_MS = 400;

export interface TooltipProps {
  content: ReactNode;
  /** A single focusable element (usually a Button or IconButton). */
  children: ReactElement<{ "aria-describedby"?: string }>;
  side?: "top" | "bottom";
  className?: string;
}

/**
 * Supplementary hint shown on hover (after a short delay) and on keyboard focus.
 * Dismissible with Escape and hoverable, per WCAG 1.4.13. Never put essential
 * information or interactive content inside a tooltip.
 */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tooltipId = useId();

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function show(delay: number) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  }

  function hide() {
    clearTimeout(timer.current);
    setOpen(false);
  }

  const existing = children.props["aria-describedby"];

  return (
    <span
      className={cn(styles.root, className)}
      onPointerEnter={() => show(SHOW_DELAY_MS)}
      onPointerLeave={hide}
      onFocus={() => show(0)}
      onBlur={hide}
    >
      {cloneElement(children, {
        "aria-describedby": open ? cn(existing, tooltipId) : existing,
      })}
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(styles.tooltip, styles[side])}
        hidden={!open}
      >
        {content}
      </span>
    </span>
  );
}
