"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Button } from "@/components/ui";
import type { EntryKind } from "@/types/candidate";

import { deleteEntryAction } from "../../actions";
import { ConfirmActionDialog } from "../confirm-dialog";
import { useHydrated } from "../use-hydrated";
import styles from "./profile.module.css";
import { ProfileSection, SectionEditorProvider } from "./section-editor";

export interface EntryListProps<Entry extends { id: string }> {
  id: string;
  kind: EntryKind;
  title: string;
  description: ReactNode;
  /** Singular noun for buttons: "role", "project". */
  noun: string;
  entries: readonly Entry[];
  /** Short name of an entry for button labels: "Engineer at Example Labs". */
  name: (entry: Entry) => string;
  renderEntry: (entry: Entry) => ReactNode;
  /** The add or edit form; `entry` is null when adding. */
  renderForm: (entry: Entry | null) => ReactNode;
  emptyText: string;
}

type Focus = { type: "edit" | "remove"; id: string } | { type: "add" } | null;

/**
 * A repeating profile section (education, experience, projects, certifications): each entry
 * can be edited in place or removed after confirmation, and new entries are added at the end.
 */
export function EntryList<Entry extends { id: string }>({
  id,
  kind,
  title,
  description,
  noun,
  entries,
  name,
  renderEntry,
  renderForm,
  emptyText,
}: EntryListProps<Entry>) {
  const hydrated = useHydrated();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [removing, setRemoving] = useState<Entry | null>(null);
  const [status, setStatus] = useState("");
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  const formRegion = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<Focus>(null);

  // Opening a form moves focus into it.
  useEffect(() => {
    if (editing !== null) {
      formRegion.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    }
  }, [editing]);

  // Closing a form or the removal dialog returns focus to where the candidate was.
  useEffect(() => {
    if (editing !== null || removing !== null) return;
    const focus = pendingFocus.current;
    pendingFocus.current = null;
    if (!focus) return;
    const target =
      focus.type === "edit"
        ? editButtons.current.get(focus.id)
        : focus.type === "remove"
          ? removeButtons.current.get(focus.id)
          : undefined;
    (target ?? addButton.current)?.focus();
  }, [editing, removing]);

  function finish(message: string | null) {
    pendingFocus.current =
      editing && editing !== "new" ? { type: "edit", id: editing } : { type: "add" };
    if (message) setStatus(message);
    setEditing(null);
  }

  const editor = { done: (message: string) => finish(message), cancel: () => finish(null) };

  function form(entry: Entry | null) {
    return (
      <div ref={formRegion} className={styles.formRegion}>
        <SectionEditorProvider value={editor}>{renderForm(entry)}</SectionEditorProvider>
      </div>
    );
  }

  return (
    <ProfileSection id={id} title={title} description={description} status={status}>
      {entries.length > 0 ? (
        <ul className={styles.entries}>
          {entries.map((entry) =>
            editing === entry.id ? (
              <li key={entry.id} className={styles.entryEditing}>
                {form(entry)}
              </li>
            ) : (
              <li key={entry.id} className={styles.entry}>
                <div className={styles.entryContent}>{renderEntry(entry)}</div>
                <div className={styles.entryActions}>
                  <Button
                    ref={(element) => {
                      if (element) editButtons.current.set(entry.id, element);
                      else editButtons.current.delete(entry.id);
                    }}
                    variant="ghost"
                    size="sm"
                    leadingIcon={<PencilIcon />}
                    disabled={!hydrated || editing !== null}
                    onClick={() => {
                      setStatus("");
                      setEditing(entry.id);
                    }}
                  >
                    Edit <span className="visually-hidden">{name(entry)}</span>
                  </Button>
                  <Button
                    ref={(element) => {
                      if (element) removeButtons.current.set(entry.id, element);
                      else removeButtons.current.delete(entry.id);
                    }}
                    variant="ghost"
                    size="sm"
                    leadingIcon={<TrashIcon />}
                    disabled={!hydrated || editing !== null}
                    onClick={() => setRemoving(entry)}
                  >
                    Remove <span className="visually-hidden">{name(entry)}</span>
                  </Button>
                </div>
              </li>
            ),
          )}
        </ul>
      ) : editing !== "new" ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : null}

      {editing === "new" ? (
        form(null)
      ) : (
        <Button
          ref={addButton}
          variant="outline"
          size="sm"
          leadingIcon={<PlusIcon />}
          disabled={!hydrated || editing !== null}
          onClick={() => {
            setStatus("");
            setEditing("new");
          }}
        >
          Add {noun}
        </Button>
      )}

      {removing ? (
        <ConfirmActionDialog
          open
          onOpenChange={(open) => {
            if (open) return;
            pendingFocus.current = { type: "remove", id: removing.id };
            setRemoving(null);
          }}
          title={`Remove ${name(removing)}?`}
          description="This removes it from your profile. You can add it again later."
          action={deleteEntryAction.bind(null, kind)}
          fields={{ id: removing.id }}
          confirmLabel="Remove"
          pendingLabel="Removing"
          onConfirmed={(message) => {
            pendingFocus.current = { type: "add" };
            setStatus(message);
            setRemoving(null);
          }}
        />
      ) : null}
    </ProfileSection>
  );
}
