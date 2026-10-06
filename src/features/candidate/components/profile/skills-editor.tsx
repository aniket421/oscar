"use client";

import type { FormEvent, RefObject } from "react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import { CloseIcon, PlusIcon } from "@/components/icons";
import { Alert, Button, IconButton, Input, Select } from "@/components/ui";
import {
  SKILL_CATEGORIES,
  type CandidateSkill,
  type CandidateSkillCategory,
} from "@/types/candidate";

import { idleActionState, type ActionState } from "../../action-state";
import { addSkillAction, deleteSkillAction, updateSkillAction } from "../../actions";
import { findCatalogSkill, skillCategoryLabels, skillCategoryOptions } from "../../skills-catalog";
import {
  limits,
  readFormInput,
  validateSkill,
  type FieldErrors,
  type SkillField,
} from "../../validation";
import styles from "./profile.module.css";
import { ProfileSection, SectionEditorProvider } from "./section-editor";
import { useHydrated } from "../use-hydrated";
import { ProfileForm } from "./profile-form";

/**
 * Skills, grouped by category. Candidates add, rename, recategorize, and remove them; skills
 * that came from their resume are marked so the two sources stay distinguishable.
 */
export function SkillsSection({ skills }: { skills: readonly CandidateSkill[] }) {
  const hydrated = useHydrated();
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const nameButtons = useRef(new Map<string, HTMLButtonElement>());
  const addInput = useRef<HTMLInputElement>(null);
  const returnFocusTo = useRef<string | "add" | null>(null);

  useEffect(() => {
    if (editing !== null) return;
    const target = returnFocusTo.current;
    returnFocusTo.current = null;
    if (target === "add") addInput.current?.focus();
    else if (target) nameButtons.current.get(target)?.focus();
  });

  const [, removeAction, removing] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await deleteSkillAction(previous, formData);
      setStatus(result.message ?? "");
      if (result.status === "success") returnFocusTo.current = "add";
      return result;
    },
    idleActionState,
  );

  const groups = SKILL_CATEGORIES.map((category) => ({
    category,
    skills: skills.filter((skill) => skill.category === category),
  })).filter((group) => group.skills.length > 0);

  return (
    <ProfileSection
      id="skills"
      title="Skills"
      description="Technologies, tools, and ways of working you can talk about with confidence."
      status={status}
    >
      <AddSkillForm inputRef={addInput} onAdded={setStatus} />

      {groups.length === 0 ? (
        <p className={styles.empty}>No skills added yet.</p>
      ) : (
        <div className={styles.skillGroups}>
          {groups.map((group) => (
            <div key={group.category} className={styles.skillGroup}>
              <h3 className={styles.skillGroupTitle}>{skillCategoryLabels[group.category]}</h3>
              <ul className={styles.skillList}>
                {group.skills.map((skill) =>
                  editing === skill.id ? (
                    <li key={skill.id} className={styles.skillEditing}>
                      <SectionEditorProvider
                        value={{
                          done(message) {
                            returnFocusTo.current = skill.id;
                            setStatus(message);
                            setEditing(null);
                          },
                          cancel() {
                            returnFocusTo.current = skill.id;
                            setEditing(null);
                          },
                        }}
                      >
                        <EditSkillForm skill={skill} />
                      </SectionEditorProvider>
                    </li>
                  ) : (
                    <li key={skill.id} className={styles.skill}>
                      <button
                        ref={(element) => {
                          if (element) nameButtons.current.set(skill.id, element);
                          else nameButtons.current.delete(skill.id);
                        }}
                        type="button"
                        className={styles.skillName}
                        disabled={!hydrated}
                        onClick={() => {
                          setStatus("");
                          setEditing(skill.id);
                        }}
                      >
                        <span className="visually-hidden">Edit</span> {skill.name}
                      </button>
                      {skill.source === "resume" ? (
                        <span className={styles.skillSource}>From resume</span>
                      ) : null}
                      <form action={removeAction} className={styles.skillRemove}>
                        <input type="hidden" name="id" value={skill.id} />
                        <IconButton
                          type="submit"
                          size="sm"
                          label={`Remove ${skill.name}`}
                          icon={<CloseIcon size={14} />}
                          disabled={removing || !hydrated}
                        />
                      </form>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

const skillFields: readonly SkillField[] = ["name", "category"];

function AddSkillForm({
  inputRef,
  onAdded,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onAdded: (message: string) => void;
}) {
  const hydrated = useHydrated();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldErrors<SkillField>>({});
  const [category, setCategory] = useState<CandidateSkillCategory | "">("");
  const [categoryChosen, setCategoryChosen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await addSkillAction(previous, formData);
      if (result.status === "success") {
        onAdded(result.message ?? "Skill added.");
        formRef.current?.reset();
        setCategory("");
        setCategoryChosen(false);
        inputRef.current?.focus();
      } else {
        setErrors(result.fieldErrors ?? {});
      }
      return result;
    },
    idleActionState,
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = validateSkill(readFormInput(formData));
    if (result.ok) {
      startTransition(() => formAction(formData));
      return;
    }
    setErrors(result.errors);
    const first = skillFields.find((field) => result.errors[field]);
    const element = first ? event.currentTarget.elements.namedItem(first) : null;
    if (element instanceof HTMLElement) element.focus();
  }

  const formError = state.status === "error" && !state.fieldErrors ? state.message : undefined;

  return (
    <form
      ref={formRef}
      className={styles.addSkill}
      onSubmit={onSubmit}
      aria-label="Add a skill"
      noValidate
    >
      {formError ? (
        <Alert tone="error" role="alert">
          {formError}
        </Alert>
      ) : null}
      <div className={styles.addSkillFields}>
        <Input
          ref={inputRef}
          name="name"
          label="Skill"
          maxLength={limits.skill}
          autoComplete="off"
          error={errors.name}
          onChange={(event) => {
            setErrors((current) => ({ ...current, name: undefined }));
            // Suggest the catalog category until the candidate picks one themselves.
            const match = findCatalogSkill(event.target.value);
            if (match && !categoryChosen) {
              setCategory(match.category);
              setErrors((current) => ({ ...current, category: undefined }));
            }
          }}
        />
        <Select
          name="category"
          label="Category"
          placeholder="Choose"
          options={skillCategoryOptions}
          value={category}
          error={errors.category}
          onChange={(event) => {
            setCategory(event.target.value as CandidateSkillCategory);
            setCategoryChosen(true);
            setErrors((current) => ({ ...current, category: undefined }));
          }}
        />
        <Button
          type="submit"
          variant="outline"
          leadingIcon={<PlusIcon />}
          loading={pending}
          disabled={!hydrated}
          className={styles.addSkillButton}
        >
          {pending ? "Adding" : "Add skill"}
        </Button>
      </div>
    </form>
  );
}

function EditSkillForm({ skill }: { skill: CandidateSkill }) {
  return (
    <ProfileForm
      label={`Edit ${skill.name}`}
      action={updateSkillAction}
      validate={validateSkill}
      fieldOrder={skillFields}
      hidden={{ id: skill.id }}
    >
      {({ errors, clear }) => (
        <div className={styles.fieldRow}>
          <Input
            name="name"
            label="Skill"
            maxLength={limits.skill}
            defaultValue={skill.name}
            error={errors.name}
            onChange={() => clear("name")}
          />
          <Select
            name="category"
            label="Category"
            options={skillCategoryOptions}
            defaultValue={skill.category}
            error={errors.category}
            onChange={() => clear("category")}
          />
        </div>
      )}
    </ProfileForm>
  );
}
