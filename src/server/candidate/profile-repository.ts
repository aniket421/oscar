import "server-only";

import type {
  EntryKind,
  CandidateCareer,
  CandidateGoals,
  CandidateProfile,
  CandidateSkill,
  CandidateSkillCategory,
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  SkillSource,
} from "@/types/candidate";

import type { Database } from "../supabase/database";
import type { ServerSupabaseClient } from "../supabase/server-client";
import { DataAccessError, toDataError } from "./errors";
import {
  avatarIdFromPath,
  fromYearMonth,
  toCertification,
  toEducation,
  toExperience,
  toProject,
  toSkill,
} from "./mappers";

/**
 * Candidate profile storage. Every call runs with the signed-in user's session, so Row Level
 * Security decides what is visible and writable; each query also filters by `userId` so a
 * mistake in calling code cannot widen it.
 */

type Tables = Database["public"]["Tables"];

/** Unwraps a Supabase response, converting provider errors into `DataAccessError`. */
function unwrap<T>(response: { data: T | null; error: unknown; status?: number }): T {
  if (response.error) throw toDataError(response.error, response.status);
  if (response.data === null) throw new DataAccessError("not_found");
  return response.data;
}

export async function getCandidateProfile(
  db: ServerSupabaseClient,
  userId: string,
): Promise<CandidateProfile> {
  const [profile, preferences, education, experience, projects, certifications, skills] =
    await Promise.all([
      db.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      db.from("candidate_preferences").select("*").eq("user_id", userId).maybeSingle(),
      db
        .from("education")
        .select("*")
        .eq("user_id", userId)
        .order("end_date", { ascending: false, nullsFirst: true })
        .order("start_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: true }),
      db
        .from("experience")
        .select("*")
        .eq("user_id", userId)
        .order("is_current", { ascending: false })
        .order("end_date", { ascending: false, nullsFirst: true })
        .order("start_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: true }),
      db
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      db
        .from("certifications")
        .select("*")
        .eq("user_id", userId)
        .order("issued_on", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: true }),
      db.from("skills").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    ]);

  for (const response of [
    profile,
    preferences,
    education,
    experience,
    projects,
    certifications,
    skills,
  ]) {
    if (response.error) throw toDataError(response.error, response.status);
  }

  const p = profile.data;
  const prefs = preferences.data;
  return {
    userId,
    identity: {
      fullName: p?.full_name ?? null,
      headline: p?.headline ?? null,
      location: p?.location ?? null,
      avatarId: avatarIdFromPath(p?.avatar_path ?? null),
    },
    career: {
      targetRole: prefs?.target_role ?? null,
      targetIndustry: prefs?.target_industry ?? null,
      experienceLevel: p?.experience_level ?? null,
      yearsOfExperience: p?.years_of_experience ?? null,
      workArrangements: prefs?.work_arrangements ?? [],
    },
    goals: {
      goalPosition: prefs?.goal_position ?? null,
      targetCompanies: prefs?.target_companies ?? [],
      areasToImprove: prefs?.areas_to_improve ?? [],
    },
    education: (education.data ?? []).map(toEducation),
    experience: (experience.data ?? []).map(toExperience),
    projects: (projects.data ?? []).map(toProject),
    certifications: (certifications.data ?? []).map(toCertification),
    skills: (skills.data ?? []).map(toSkill),
  };
}

/** Name, headline, and photo path: the parts of a profile the app shell shows. */
export async function getProfileIdentity(
  db: ServerSupabaseClient,
  userId: string,
): Promise<{ fullName: string | null; avatarPath: string | null } | null> {
  const response = await db
    .from("profiles")
    .select("full_name, avatar_path")
    .eq("user_id", userId)
    .maybeSingle();
  if (response.error) throw toDataError(response.error, response.status);
  return response.data
    ? { fullName: response.data.full_name, avatarPath: response.data.avatar_path }
    : null;
}

/** The few profile facts the workspace shell and dashboard show. Two small queries. */
export async function getProfileSummary(
  db: ServerSupabaseClient,
  userId: string,
): Promise<{
  fullName: string | null;
  avatarId: string | null;
  experienceLevel: CandidateCareer["experienceLevel"];
  targetRole: string | null;
}> {
  const [profile, preferences] = await Promise.all([
    db
      .from("profiles")
      .select("full_name, avatar_path, experience_level")
      .eq("user_id", userId)
      .maybeSingle(),
    db.from("candidate_preferences").select("target_role").eq("user_id", userId).maybeSingle(),
  ]);
  if (profile.error) throw toDataError(profile.error, profile.status);
  if (preferences.error) throw toDataError(preferences.error, preferences.status);
  return {
    fullName: profile.data?.full_name ?? null,
    avatarId: avatarIdFromPath(profile.data?.avatar_path ?? null),
    experienceLevel: profile.data?.experience_level ?? null,
    targetRole: preferences.data?.target_role ?? null,
  };
}

// Single-row sections (created on first save) ------------------------------------------------

async function upsertProfile(
  db: ServerSupabaseClient,
  values: Tables["profiles"]["Insert"],
): Promise<void> {
  const response = await db.from("profiles").upsert(values, { onConflict: "user_id" });
  if (response.error) throw toDataError(response.error, response.status);
}

async function upsertPreferences(
  db: ServerSupabaseClient,
  values: Tables["candidate_preferences"]["Insert"],
): Promise<void> {
  const response = await db.from("candidate_preferences").upsert(values, { onConflict: "user_id" });
  if (response.error) throw toDataError(response.error, response.status);
}

export async function saveIdentity(
  db: ServerSupabaseClient,
  userId: string,
  identity: { fullName: string | null; headline: string | null; location: string | null },
): Promise<void> {
  await upsertProfile(db, {
    user_id: userId,
    full_name: identity.fullName,
    headline: identity.headline,
    location: identity.location,
  });
}

export async function saveCareer(
  db: ServerSupabaseClient,
  userId: string,
  career: CandidateCareer,
): Promise<void> {
  await upsertProfile(db, {
    user_id: userId,
    experience_level: career.experienceLevel,
    years_of_experience: career.yearsOfExperience,
  });
  await upsertPreferences(db, {
    user_id: userId,
    target_role: career.targetRole,
    target_industry: career.targetIndustry,
    work_arrangements: career.workArrangements,
  });
}

export async function saveGoals(
  db: ServerSupabaseClient,
  userId: string,
  goals: CandidateGoals,
): Promise<void> {
  await upsertPreferences(db, {
    user_id: userId,
    goal_position: goals.goalPosition,
    target_companies: goals.targetCompanies,
    areas_to_improve: goals.areasToImprove,
  });
}

/** Points the profile at a new photo (or none). Returns the previous path so it can be removed. */
export async function setAvatarPath(
  db: ServerSupabaseClient,
  userId: string,
  avatarPath: string | null,
): Promise<string | null> {
  const current = await getProfileIdentity(db, userId);
  await upsertProfile(db, { user_id: userId, avatar_path: avatarPath });
  return current?.avatarPath ?? null;
}

// Repeating entries ---------------------------------------------------------------------------

export { ENTRY_KINDS, type EntryKind } from "@/types/candidate";

/** Most entries a candidate can keep in one section. */
export const MAX_ENTRIES_PER_SECTION = 30;

export interface EntryValues {
  education: Omit<EducationEntry, "id">;
  experience: Omit<ExperienceEntry, "id">;
  projects: Omit<ProjectEntry, "id">;
  certifications: Omit<CertificationEntry, "id">;
}

type EntryColumns = {
  [Kind in EntryKind]: Omit<Tables[Kind]["Insert"], "user_id" | "id" | "created_at" | "updated_at">;
};

function toColumns<Kind extends EntryKind>(
  kind: Kind,
  values: EntryValues[Kind],
): EntryColumns[Kind] {
  switch (kind) {
    case "education": {
      const v = values as EntryValues["education"];
      return {
        institution: v.institution,
        degree: v.degree,
        field_of_study: v.fieldOfStudy,
        start_date: fromYearMonth(v.startDate),
        end_date: fromYearMonth(v.endDate),
        grade: v.grade,
      } satisfies EntryColumns["education"] as EntryColumns[Kind];
    }
    case "experience": {
      const v = values as EntryValues["experience"];
      return {
        company: v.company,
        title: v.title,
        start_date: fromYearMonth(v.startDate),
        end_date: fromYearMonth(v.endDate),
        is_current: v.isCurrent,
        responsibilities: v.responsibilities,
        achievements: v.achievements,
        technologies: v.technologies,
      } satisfies EntryColumns["experience"] as EntryColumns[Kind];
    }
    case "projects": {
      const v = values as EntryValues["projects"];
      return {
        name: v.name,
        description: v.description,
        role: v.role,
        technologies: v.technologies,
        outcomes: v.outcomes,
        url: v.url,
      } satisfies EntryColumns["projects"] as EntryColumns[Kind];
    }
    case "certifications": {
      const v = values as EntryValues["certifications"];
      return {
        name: v.name,
        issuer: v.issuer,
        issued_on: fromYearMonth(v.issuedOn),
        expires_on: fromYearMonth(v.expiresOn),
        credential_id: v.credentialId,
        credential_url: v.credentialUrl,
      } satisfies EntryColumns["certifications"] as EntryColumns[Kind];
    }
  }
}

export async function countEntries(
  db: ServerSupabaseClient,
  kind: EntryKind,
  userId: string,
): Promise<number> {
  const response = await db
    .from(kind)
    .select("id")
    .eq("user_id", userId)
    .limit(MAX_ENTRIES_PER_SECTION + 1);
  if (response.error) throw toDataError(response.error, response.status);
  return response.data.length;
}

export async function createEntry<Kind extends EntryKind>(
  db: ServerSupabaseClient,
  kind: Kind,
  userId: string,
  values: EntryValues[Kind],
): Promise<string> {
  const row = { ...toColumns(kind, values), user_id: userId } as Tables[Kind]["Insert"];
  // The union of table names defeats the client's per-table typing; columns are typed above.
  const table = db.from(kind as "projects");
  const response = await table
    .insert(row as Tables["projects"]["Insert"])
    .select("id")
    .single();
  return unwrap(response).id;
}

export async function updateEntry<Kind extends EntryKind>(
  db: ServerSupabaseClient,
  kind: Kind,
  userId: string,
  id: string,
  values: EntryValues[Kind],
): Promise<void> {
  const columns = toColumns(kind, values) as Tables["projects"]["Update"];
  const response = await db
    .from(kind as "projects")
    .update(columns)
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  if (response.error) throw toDataError(response.error, response.status);
  if (response.data.length === 0) throw new DataAccessError("not_found");
}

export async function deleteEntry(
  db: ServerSupabaseClient,
  kind: EntryKind,
  userId: string,
  id: string,
): Promise<void> {
  const response = await db
    .from(kind as "projects")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  if (response.error) throw toDataError(response.error, response.status);
  if (response.data.length === 0) throw new DataAccessError("not_found");
}

// Skills --------------------------------------------------------------------------------------

/** Most skills one candidate can list. */
export const MAX_SKILLS = 150;

export async function listSkills(
  db: ServerSupabaseClient,
  userId: string,
): Promise<CandidateSkill[]> {
  const response = await db
    .from("skills")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (response.error) throw toDataError(response.error, response.status);
  return response.data.map(toSkill);
}

export async function addSkill(
  db: ServerSupabaseClient,
  userId: string,
  skill: {
    name: string;
    category: CandidateSkillCategory;
    source?: SkillSource;
    resumeId?: string | null;
  },
): Promise<CandidateSkill> {
  const response = await db
    .from("skills")
    .insert({
      user_id: userId,
      name: skill.name,
      category: skill.category,
      source: skill.source ?? "user",
      resume_id: skill.resumeId ?? null,
    })
    .select("*")
    .single();
  return toSkill(unwrap(response));
}

/** Adds several resume skills at once. Callers remove names the candidate already has first. */
export async function addSkills(
  db: ServerSupabaseClient,
  userId: string,
  skills: ReadonlyArray<{ name: string; category: CandidateSkillCategory }>,
  resumeId: string,
): Promise<number> {
  if (skills.length === 0) return 0;
  const response = await db
    .from("skills")
    .insert(
      skills.map((skill) => ({
        user_id: userId,
        name: skill.name,
        category: skill.category,
        source: "resume" as const,
        resume_id: resumeId,
      })),
    )
    .select("id");
  if (response.error) throw toDataError(response.error, response.status);
  return response.data.length;
}

export async function updateSkill(
  db: ServerSupabaseClient,
  userId: string,
  id: string,
  skill: { name: string; category: CandidateSkillCategory },
): Promise<void> {
  const response = await db
    .from("skills")
    .update({ name: skill.name, category: skill.category })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  if (response.error) throw toDataError(response.error, response.status);
  if (response.data.length === 0) throw new DataAccessError("not_found");
}

export async function deleteSkill(
  db: ServerSupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const response = await db.from("skills").delete().eq("id", id).eq("user_id", userId).select("id");
  if (response.error) throw toDataError(response.error, response.status);
  if (response.data.length === 0) throw new DataAccessError("not_found");
}
