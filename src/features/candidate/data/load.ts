import "server-only";

import { cache } from "react";

import { requireUser, type AuthUser } from "@/features/auth/server";
import { DataAccessError } from "@/server/candidate/errors";
import { getCandidateProfile } from "@/server/candidate/profile-repository";
import {
  getCurrentResume,
  getLatestResumeAnalysis,
  getResumeParse,
} from "@/server/candidate/resume-repository";
import {
  createSupabaseServerClient,
  type ServerSupabaseClient,
} from "@/server/supabase/server-client";
import type { CandidateProfile, Resume, ResumeOverview } from "@/types/candidate";

import { computeProfileCompleteness, type ProfileCompleteness } from "../completeness";

/** The signed-in user's database client for this request. */
export const getCandidateDb = cache(async (): Promise<ServerSupabaseClient> => {
  const db = await createSupabaseServerClient();
  if (!db) throw new DataAccessError("unavailable");
  return db;
});

/** One profile and current-resume read per request, shared by every component that needs them. */
const loadCandidate = cache(async (userId: string) => {
  const db = await getCandidateDb();
  const [profile, resume] = await Promise.all([
    getCandidateProfile(db, userId),
    getCurrentResume(db, userId),
  ]);
  return { profile, resume };
});

export interface ProfilePageData {
  user: AuthUser;
  profile: CandidateProfile;
  resume: Resume | null;
  completeness: ProfileCompleteness;
}

/** Verifies the user (redirecting to login if needed), then loads their profile. */
export async function loadProfilePage(path: string): Promise<ProfilePageData> {
  const user = await requireUser(path);
  const { profile, resume } = await loadCandidate(user.id);
  return { user, profile, resume, completeness: computeProfileCompleteness({ profile, resume }) };
}

export interface ResumePageData {
  user: AuthUser;
  overview: ResumeOverview | null;
  /** Skill names already on the profile, to mark resume skills that were added. */
  profileSkillNames: string[];
  completeness: ProfileCompleteness;
}

/** Verifies the user, then loads their current resume with its parse and analysis. */
export async function loadResumePage(path: string): Promise<ResumePageData> {
  const user = await requireUser(path);
  const { profile, resume } = await loadCandidate(user.id);
  let overview: ResumeOverview | null = null;
  if (resume) {
    const db = await getCandidateDb();
    const [parse, analysis] = await Promise.all([
      getResumeParse(db, user.id, resume.id),
      getLatestResumeAnalysis(db, user.id, resume.id),
    ]);
    overview = { resume, parse, analysis };
  }
  return {
    user,
    overview,
    profileSkillNames: profile.skills.map((skill) => skill.name),
    completeness: computeProfileCompleteness({ profile, resume }),
  };
}
