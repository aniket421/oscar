"use client";

import type { FormEvent } from "react";
import { startTransition, useActionState, useState } from "react";

import { Alert, Button, Checkbox } from "@/components/ui";

import { idleActionState } from "../../action-state";
import { addResumeSkillsAction } from "../../actions";
import { useHydrated } from "../use-hydrated";
import styles from "./resume.module.css";

export interface ResumeSkillsFormProps {
  resumeId: string;
  /** Catalog skills found in the resume. */
  skillNames: readonly string[];
  /** Skill names already on the profile (any capitalization). */
  profileSkillNames: readonly string[];
}

/**
 * Skills found in the resume, with a choice to add them to the profile. Nothing is added
 * until the candidate asks, and skills already on the profile are never changed.
 */
export function ResumeSkillsForm({
  resumeId,
  skillNames,
  profileSkillNames,
}: ResumeSkillsFormProps) {
  const hydrated = useHydrated();
  const existing = new Set(profileSkillNames.map((name) => name.toLocaleLowerCase("en")));
  const addable = skillNames.filter((name) => !existing.has(name.toLocaleLowerCase("en")));
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(addable));
  const [state, formAction, pending] = useActionState(addResumeSkillsAction, idleActionState);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const chosen = addable.filter((name) => selected.has(name));

  return (
    <div className={styles.skills}>
      {addable.length > 0 ? (
        <form onSubmit={onSubmit} aria-label="Add skills from your resume">
          <input type="hidden" name="resumeId" value={resumeId} />
          <fieldset className={styles.skillFieldset}>
            <legend className={styles.skillLegend}>Not in your profile yet</legend>
            <div className={styles.skillChoices}>
              {addable.map((name) => (
                <Checkbox
                  key={name}
                  name="skill"
                  value={name}
                  label={name}
                  checked={selected.has(name)}
                  onChange={(event) => {
                    const next = new Set(selected);
                    if (event.target.checked) next.add(name);
                    else next.delete(name);
                    setSelected(next);
                  }}
                />
              ))}
            </div>
          </fieldset>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            loading={pending}
            disabled={!hydrated || chosen.length === 0}
          >
            {pending
              ? "Adding"
              : chosen.length === 1
                ? "Add 1 skill to profile"
                : `Add ${chosen.length} skills to profile`}
          </Button>
        </form>
      ) : null}

      {skillNames.length > addable.length ? (
        <div>
          <p className={styles.skillLegend}>Already in your profile</p>
          <p className={styles.mutedList}>
            {skillNames.filter((name) => existing.has(name.toLocaleLowerCase("en"))).join(", ")}
          </p>
        </div>
      ) : null}

      <p role="status" className={styles.formStatus}>
        {state.status === "success" ? state.message : ""}
      </p>
      {state.status === "error" && state.message ? (
        <Alert tone="error" role="alert">
          {state.message}
        </Alert>
      ) : null}
    </div>
  );
}
