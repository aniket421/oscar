"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CloseIcon, ErrorIcon, InfoIcon, SuccessIcon, WarningIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { motion } from "@/lib/motion";

import { IconButton } from "./icon-button";
import styles from "./toast.module.css";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss. `null` keeps it until dismissed. */
  duration?: number | null;
}

type ToastRecord = ToastOptions & {
  tone: ToastTone;
  id: number;
  leaving: boolean;
};

interface ToastContextValue {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const DEFAULT_DURATION_MS = 5000;
const MAX_VISIBLE = 3;

const icons: Record<ToastTone, typeof InfoIcon> = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Provides `useToast()` and renders the notification region. New toasts are
 * announced through one polite live region, pause while hovered or focused, and
 * can always be dismissed by keyboard. Toasts are transient: errors the user must
 * act on belong in an inline <Alert>, not only in a toast.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
    );
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, motion.duration.fast);
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) =>
      [...current, { tone: "info" as const, ...options, id, leaving: false }].slice(-MAX_VISIBLE),
    );
    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <section className={styles.viewport} aria-label="Notifications">
        <ol className={styles.list} aria-live="polite" aria-relevant="additions">
          {toasts.map((record) => (
            <ToastItem key={record.id} record={record} onDismiss={dismiss} />
          ))}
        </ol>
      </section>
    </ToastContext.Provider>
  );
}

function ToastItem({
  record,
  onDismiss,
}: {
  record: ToastRecord;
  onDismiss: (id: number) => void;
}) {
  const { id, title, description, tone, leaving } = record;
  const duration = record.duration === undefined ? DEFAULT_DURATION_MS : record.duration;
  const [paused, setPaused] = useState(false);
  const Icon = icons[tone];

  useEffect(() => {
    if (duration === null || paused || leaving) return;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [duration, paused, leaving, id, onDismiss]);

  return (
    <li
      className={cn(styles.toast, styles[tone])}
      data-leaving={leaving || undefined}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon size={18} className={styles.icon} />
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      <IconButton
        label="Dismiss notification"
        icon={<CloseIcon size={16} />}
        size="sm"
        className={styles.close}
        onClick={() => onDismiss(id)}
      />
    </li>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>.");
  }
  return context;
}
