/**
 * Profile completeness, derived only from what the candidate has stored. Nothing here is a
 * rating of the candidate: it is a checklist of what Oscar knows and what is still missing.
 * See docs/candidate-intelligence.md, section 8.
 */
import type { CandidateProfile, Resume } from "@/types/candidate";

export type CompletenessItemId =
  | "name"
  | "headline"
  | "targetRole"
  | "experienceLevel"
  | "education"
  | "experience"
  | "projects"
  | "skills"
  | "goals"
  | "resume";

export interface CompletenessItem {
  id: CompletenessItemId;
  /** What this item covers, for the checklist. */
  label: string;
  /** The next step when it is missing, phrased as an instruction. */
  action: string;
  /** Where the candidate can complete it. */
  href: string;
  done: boolean;
}

export interface ProfileCompleteness {
  items: CompletenessItem[];
  completed: number;
  total: number;
  /** Whole percent, rounded down so 100 only appears when everything is done. */
  percent: number;
  missing: CompletenessItem[];
}

/** Skills needed before the skills item counts as complete. */
export const MIN_SKILLS = 3;

export interface CompletenessInput {
  profile: CandidateProfile;
  /** The current resume, if any. A failed upload still needs a working resume. */
  resume: Resume | null;
}

export function computeProfileCompleteness({
  profile,
  resume,
}: CompletenessInput): ProfileCompleteness {
  const items: CompletenessItem[] = [
    {
      id: "name",
      label: "Name",
      action: "Add your name",
      href: "/profile#personal",
      done: Boolean(profile.identity.fullName),
    },
    {
      id: "headline",
      label: "Headline",
      action: "Add a headline",
      href: "/profile#personal",
      done: Boolean(profile.identity.headline),
    },
    {
      id: "targetRole",
      label: "Target role",
      action: "Add your target role",
      href: "/profile#career",
      done: Boolean(profile.career.targetRole),
    },
    {
      id: "experienceLevel",
      label: "Experience level",
      action: "Add your experience level",
      href: "/profile#career",
      done: profile.career.experienceLevel !== null,
    },
    {
      id: "education",
      label: "Education",
      action: "Add your education",
      href: "/profile#education",
      done: profile.education.length > 0,
    },
    {
      id: "experience",
      label: "Work experience",
      action: "Add your work experience",
      href: "/profile#experience",
      done: profile.experience.length > 0,
    },
    {
      id: "projects",
      label: "Projects",
      action: "Add your latest project",
      href: "/profile#projects",
      done: profile.projects.length > 0,
    },
    {
      id: "skills",
      label: "Skills",
      action: `Add at least ${MIN_SKILLS} skills`,
      href: "/profile#skills",
      done: profile.skills.length >= MIN_SKILLS,
    },
    {
      id: "goals",
      label: "Goals",
      action: "Add an area you want to improve",
      href: "/profile#goals",
      done: profile.goals.areasToImprove.length > 0,
    },
    {
      id: "resume",
      label: "Resume",
      action: "Upload a resume",
      href: "/resume",
      done: resume !== null && resume.status !== "failed",
    },
  ];

  const completed = items.filter((item) => item.done).length;
  return {
    items,
    completed,
    total: items.length,
    percent: Math.floor((completed / items.length) * 100),
    missing: items.filter((item) => !item.done),
  };
}

/** A profile with nothing stored yet: the honest starting point for a new candidate. */
export function emptyCandidateProfile(userId: string): CandidateProfile {
  return {
    userId,
    identity: { fullName: null, headline: null, location: null, avatarId: null },
    career: {
      targetRole: null,
      targetIndustry: null,
      experienceLevel: null,
      yearsOfExperience: null,
      workArrangements: [],
    },
    goals: { goalPosition: null, targetCompanies: [], areasToImprove: [] },
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    skills: [],
  };
}
