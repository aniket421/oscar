"use client";

import type { ReactNode } from "react";
import { createContext, use, useEffect, useId, useRef, useState } from "react";

import { PencilIcon } from "@/components/icons";
import { Button } from "@/components/ui";

import { useHydrated } from "../use-hydrated";
import styles from "./profile.module.css";

interface SectionEditor {
  /** Leaves edit mode after a successful save, announcing `message`. */
  done(message: string): void;
  /** Leaves edit mode without saving. */
  cancel(): void;
}

const SectionEditorContext = createContext<SectionEditor | null>(null);

/** For forms rendered inside an `EditableSection`. */
export function useSectionEditor(): SectionEditor {
  const editor = use(SectionEditorContext);
  if (!editor) throw new Error("useSectionEditor must be used inside an EditableSection");
  return editor;
}

/** Provides an editor to forms that manage their own open state (list entries). */
export function SectionEditorProvider({
  value,
  children,
}: {
  value: SectionEditor;
  children: ReactNode;
}) {
  return <SectionEditorContext value={value}>{children}</SectionEditorContext>;
}

export interface ProfileSectionProps {
  id: string;
  title: string;
  description: ReactNode;
  /** Live status line (saved and removed messages). */
  status?: string;
  children: ReactNode;
}

/** The profile's section layout: a label column and a content column, separated by hairlines. */
export function ProfileSection({ id, title, description, status, children }: ProfileSectionProps) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className={styles.section}>
      <div className={styles.intro}>
        <h2 id={headingId} className={styles.sectionTitle}>
          {title}
        </h2>
        <p className={styles.sectionText}>{description}</p>
        <p role="status" className={styles.status}>
          {status}
        </p>
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

export interface EditableSectionProps {
  id: string;
  title: string;
  description: ReactNode;
  /** Read view of the stored data (rendered on the server). */
  view: ReactNode;
  /** The section's form; it calls `useSectionEditor()` to finish. */
  form: ReactNode;
  /** Completes "Edit …" for assistive technology, for example "personal details". */
  editLabel: string;
}

/**
 * One profile section with a read view and an edit mode. Opening moves focus into the form;
 * saving or cancelling returns focus to the Edit button, and saves are announced.
 */
export function EditableSection({
  id,
  title,
  description,
  view,
  form,
  editLabel,
}: EditableSectionProps) {
  const hydrated = useHydrated();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const editButton = useRef<HTMLButtonElement>(null);
  const formRegion = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (editing) {
      formRegion.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      editButton.current?.focus();
    }
  }, [editing]);

  const editor: SectionEditor = {
    done(message) {
      restoreFocus.current = true;
      setStatus(message);
      setEditing(false);
    },
    cancel() {
      restoreFocus.current = true;
      setEditing(false);
    },
  };

  return (
    <ProfileSection id={id} title={title} description={description} status={status}>
      {editing ? (
        <div ref={formRegion} className={styles.formRegion}>
          <SectionEditorProvider value={editor}>{form}</SectionEditorProvider>
        </div>
      ) : (
        <>
          {view}
          <Button
            ref={editButton}
            variant="outline"
            size="sm"
            leadingIcon={<PencilIcon />}
            disabled={!hydrated}
            onClick={() => {
              setStatus("");
              setEditing(true);
            }}
          >
            Edit <span className="visually-hidden">{editLabel}</span>
          </Button>
        </>
      )}
    </ProfileSection>
  );
}
