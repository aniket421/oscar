"use server";

import { refresh } from "next/cache";
import { after } from "next/server";

import { requireUser } from "@/features/auth/server";
import { logDataError, toDataError, type DataErrorKind } from "@/server/candidate/errors";
import {
  addSkill,
  addSkills,
  countEntries,
  createEntry,
  deleteEntry,
  deleteSkill,
  ENTRY_KINDS,
  listSkills,
  MAX_ENTRIES_PER_SECTION,
  MAX_SKILLS,
  saveCareer,
  saveGoals,
  saveIdentity,
  setAvatarPath,
  updateEntry,
  updateSkill,
  type EntryKind,
  type EntryValues,
} from "@/server/candidate/profile-repository";
import { getResume, getResumeParse, setResumeStatus } from "@/server/candidate/resume-repository";
import { AVATAR_BUCKET, removeObjects } from "@/server/candidate/storage";

import type { ActionState } from "./action-state";
import { getCandidateDb } from "./data/load";
import { deleteResume, reprocessResume } from "./data/resume-service";
import { categoryForSkill } from "./skills-catalog";
import {
  isUuid,
  readFormInput,
  validateCareer,
  validateCertification,
  validateEducation,
  validateExperience,
  validateGoals,
  validateIdentity,
  validateProject,
  validateSkill,
  type FormInput,
  type ValidationResult,
} from "./validation";

/*
 * Server Actions for the candidate profile and resume. Each one verifies the user itself
 * (development rule 21), validates every input on the server, writes through the user's own
 * session (RLS applies), and returns only a status and a message. Next.js checks that action
 * requests come from this origin.
 */

const PROFILE_PATH = "/profile";
const RESUME_PATH = "/resume";

const dataMessages: Record<DataErrorKind, string> = {
  not_found: "This item no longer exists. Refresh the page to see your latest profile.",
  conflict: "This is already in your profile.",
  invalid: "Some details could not be saved. Check them and try again.",
  unauthorized: "Your session could not be confirmed. Refresh the page and try again.",
  unavailable: "Oscar could not save right now. Check your connection and try again.",
  unknown: "Oscar could not save this change. Try again.",
};

function failed(operation: string, error: unknown): ActionState {
  logDataError(operation, error);
  return {
    status: "error",
    message: dataMessages[toDataError(error).kind],
    completedAt: Date.now(),
  };
}

function invalid<Field extends string>(
  result: Extract<ValidationResult<unknown, Field>, { ok: false }>,
): ActionState<Field> {
  return {
    status: "error",
    message: "Some details need attention.",
    fieldErrors: result.errors,
    completedAt: Date.now(),
  };
}

function saved(message: string): ActionState {
  // Re-render the current page with the stored data in the same response.
  refresh();
  return { status: "success", message, completedAt: Date.now() };
}

async function signedIn(path: string) {
  const user = await requireUser(path);
  const db = await getCandidateDb();
  return { userId: user.id, db };
}

// Personal, career, and goals ------------------------------------------------------------------

export async function saveIdentityAction(_previous: ActionState, formData: FormData) {
  const { userId, db } = await signedIn(PROFILE_PATH);
  const result = validateIdentity(readFormInput(formData));
  if (!result.ok) return invalid(result);
  try {
    await saveIdentity(db, userId, result.value);
  } catch (error) {
    return failed("profile.identity", error);
  }
  return saved("Personal details saved.");
}

export async function saveCareerAction(_previous: ActionState, formData: FormData) {
  const { userId, db } = await signedIn(PROFILE_PATH);
  const result = validateCareer(readFormInput(formData));
  if (!result.ok) return invalid(result);
  try {
    await saveCareer(db, userId, result.value);
  } catch (error) {
    return failed("profile.career", error);
  }
  return saved("Career details saved.");
}

export async function saveGoalsAction(_previous: ActionState, formData: FormData) {
  const { userId, db } = await signedIn(PROFILE_PATH);
  const result = validateGoals(readFormInput(formData));
  if (!result.ok) return invalid(result);
  try {
    await saveGoals(db, userId, result.value);
  } catch (error) {
    return failed("profile.goals", error);
  }
  return saved("Goals saved.");
}

// Education, experience, projects, certifications --------------------------------------------

const entryValidators: {
  [Kind in EntryKind]: (input: FormInput) => ValidationResult<EntryValues[Kind], string>;
} = {
  education: validateEducation,
  experience: validateExperience,
  projects: validateProject,
  certifications: validateCertification,
};

const entryLabels: Record<EntryKind, { saved: string; deleted: string; full: string }> = {
  education: {
    saved: "Education saved.",
    deleted: "Education removed.",
    full: `You can add up to ${MAX_ENTRIES_PER_SECTION} education entries.`,
  },
  experience: {
    saved: "Experience saved.",
    deleted: "Experience removed.",
    full: `You can add up to ${MAX_ENTRIES_PER_SECTION} roles.`,
  },
  projects: {
    saved: "Project saved.",
    deleted: "Project removed.",
    full: `You can add up to ${MAX_ENTRIES_PER_SECTION} projects.`,
  },
  certifications: {
    saved: "Certification saved.",
    deleted: "Certification removed.",
    full: `You can add up to ${MAX_ENTRIES_PER_SECTION} certifications.`,
  },
};

function isEntryKind(value: unknown): value is EntryKind {
  return ENTRY_KINDS.includes(value as EntryKind);
}

/** Creates an entry, or updates one when the form carries its id. Bound per section. */
export async function saveEntryAction(
  kind: EntryKind,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isEntryKind(kind)) return { status: "error", message: dataMessages.invalid };
  const { userId, db } = await signedIn(PROFILE_PATH);
  const input = readFormInput(formData);
  const result = entryValidators[kind](input);
  if (!result.ok) return invalid(result);

  const id = input.id;
  try {
    if (typeof id === "string" && id !== "") {
      if (!isUuid(id)) return { status: "error", message: dataMessages.not_found };
      await updateEntry(db, kind, userId, id, result.value);
    } else {
      if ((await countEntries(db, kind, userId)) >= MAX_ENTRIES_PER_SECTION) {
        return { status: "error", message: entryLabels[kind].full, completedAt: Date.now() };
      }
      await createEntry(db, kind, userId, result.value);
    }
  } catch (error) {
    return failed(`profile.${kind}.save`, error);
  }
  return saved(entryLabels[kind].saved);
}

export async function deleteEntryAction(
  kind: EntryKind,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isEntryKind(kind)) return { status: "error", message: dataMessages.invalid };
  const { userId, db } = await signedIn(PROFILE_PATH);
  const id = formData.get("id");
  if (!isUuid(id)) return { status: "error", message: dataMessages.not_found };
  try {
    await deleteEntry(db, kind, userId, id);
  } catch (error) {
    return failed(`profile.${kind}.delete`, error);
  }
  return saved(entryLabels[kind].deleted);
}

// Skills ----------------------------------------------------------------------------------------

export async function addSkillAction(_previous: ActionState, formData: FormData) {
  const { userId, db } = await signedIn(PROFILE_PATH);
  const result = validateSkill(readFormInput(formData));
  if (!result.ok) return invalid(result);
  try {
    const existing = await listSkills(db, userId);
    const name = result.value.name.toLocaleLowerCase("en");
    if (existing.some((skill) => skill.name.toLocaleLowerCase("en") === name)) {
      return invalid({ ok: false, errors: { name: "This skill is already in your profile." } });
    }
    if (existing.length >= MAX_SKILLS) {
      return {
        status: "error",
        message: `You can list up to ${MAX_SKILLS} skills.`,
      } as ActionState;
    }
    await addSkill(db, userId, result.value);
  } catch (error) {
    if (toDataError(error).kind === "conflict") {
      return invalid({ ok: false, errors: { name: "This skill is already in your profile." } });
    }
    return failed("profile.skills.add", error);
  }
  return saved(`${result.value.name} added.`);
}

export async function updateSkillAction(_previous: ActionState, formData: FormData) {
  const { userId, db } = await signedIn(PROFILE_PATH);
  const id = formData.get("id");
  if (!isUuid(id)) return { status: "error", message: dataMessages.not_found } as ActionState;
  const result = validateSkill(readFormInput(formData));
  if (!result.ok) return invalid(result);
  try {
    await updateSkill(db, userId, id, result.value);
  } catch (error) {
    if (toDataError(error).kind === "conflict") {
      return invalid({ ok: false, errors: { name: "Another skill already has this name." } });
    }
    return failed("profile.skills.update", error);
  }
  return saved(`${result.value.name} updated.`);
}

export async function deleteSkillAction(_previous: ActionState, formData: FormData) {
  const { userId, db } = await signedIn(PROFILE_PATH);
  const id = formData.get("id");
  if (!isUuid(id)) return { status: "error", message: dataMessages.not_found } as ActionState;
  try {
    await deleteSkill(db, userId, id);
  } catch (error) {
    return failed("profile.skills.delete", error);
  }
  return saved("Skill removed.");
}

/**
 * Adds skills found in the candidate's resume to their profile. Only names that the stored
 * parse actually contains are accepted, and skills already on the profile are left untouched.
 */
export async function addResumeSkillsAction(_previous: ActionState, formData: FormData) {
  const { userId, db } = await signedIn(RESUME_PATH);
  const resumeId = formData.get("resumeId");
  if (!isUuid(resumeId)) return { status: "error", message: dataMessages.not_found } as ActionState;
  const requested = new Set(
    formData.getAll("skill").filter((value): value is string => typeof value === "string"),
  );

  let added = 0;
  try {
    const parse = await getResumeParse(db, userId, resumeId);
    if (!parse) return { status: "error", message: dataMessages.not_found } as ActionState;
    const existing = new Set(
      (await listSkills(db, userId)).map((skill) => skill.name.toLocaleLowerCase("en")),
    );
    const room = Math.max(0, MAX_SKILLS - existing.size);
    const toAdd = parse.skillNames
      .filter((name) => requested.has(name) && !existing.has(name.toLocaleLowerCase("en")))
      .slice(0, room)
      .map((name) => ({ name, category: categoryForSkill(name) }));
    added = await addSkills(db, userId, toAdd, resumeId);
  } catch (error) {
    return failed("resume.skills.add", error);
  }
  if (added === 0) {
    return {
      status: "success",
      message: "These skills are already in your profile.",
      completedAt: Date.now(),
    } as ActionState;
  }
  return saved(
    added === 1 ? "1 skill added to your profile." : `${added} skills added to your profile.`,
  );
}

// Resume ----------------------------------------------------------------------------------------

export async function deleteResumeAction(_previous: ActionState, formData: FormData) {
  const { userId, db } = await signedIn(RESUME_PATH);
  const id = formData.get("id");
  if (!isUuid(id)) return { status: "error", message: dataMessages.not_found } as ActionState;
  try {
    await deleteResume(db, userId, id);
  } catch (error) {
    logDataError("resume.delete", error);
    return {
      status: "error",
      message:
        toDataError(error).kind === "not_found"
          ? "This resume was already deleted. Refresh the page."
          : "Oscar could not delete your resume. Nothing was removed. Try again.",
      completedAt: Date.now(),
    } as ActionState;
  }
  return saved("Resume deleted.");
}

/** Runs processing again on the stored file, for example after a temporary failure. */
export async function retryResumeProcessingAction(_previous: ActionState, formData: FormData) {
  const { userId, db } = await signedIn(RESUME_PATH);
  const id = formData.get("id");
  if (!isUuid(id)) return { status: "error", message: dataMessages.not_found } as ActionState;
  try {
    const resume = await getResume(db, userId, id);
    if (!resume) return { status: "error", message: dataMessages.not_found } as ActionState;
    if (resume.status !== "failed") {
      return { status: "success", message: "This resume is already processed." } as ActionState;
    }
    await setResumeStatus(db, userId, resume.id, { status: "processing" });
    after(() => reprocessResume(db, userId, resume));
  } catch (error) {
    return failed("resume.retry", error);
  }
  return saved("Processing started again.");
}

// Profile photo ------------------------------------------------------------------------------

export async function removeAvatarAction(_previous: ActionState, _formData: FormData) {
  const { userId, db } = await signedIn(PROFILE_PATH);
  try {
    const previous = await setAvatarPath(db, userId, null);
    if (previous) {
      await removeObjects(db, AVATAR_BUCKET, [previous]).catch((error: unknown) =>
        logDataError("profile.avatar.remove.object", error),
      );
    }
  } catch (error) {
    return failed("profile.avatar.remove", error);
  }
  return saved("Photo removed.");
}
