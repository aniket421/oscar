/**
 * Candidate intelligence domain model (Phase 4): the candidate profile, resumes, what Oscar
 * extracted from them, and the analysis foundation. Storage is described in
 * docs/candidate-intelligence.md; these are the shapes the application works with.
 */
import type { ExperienceLevel, ISODateString } from "./domain";

/** A month, as "YYYY-MM". Resume dates are month precision. */
export type YearMonth = string;

export const EXPERIENCE_LEVELS = [
  "student",
  "entry",
  "mid",
  "senior",
  "lead",
] as const satisfies readonly ExperienceLevel[];

export const WORK_ARRANGEMENTS = ["remote", "hybrid", "onsite"] as const;
export type WorkArrangement = (typeof WORK_ARRANGEMENTS)[number];

export const SKILL_CATEGORIES = [
  "programming",
  "frontend",
  "backend",
  "database",
  "cloud",
  "devops",
  "ai_ml",
  "tools",
  "soft_skills",
] as const;
export type CandidateSkillCategory = (typeof SKILL_CATEGORIES)[number];

/** Where a skill came from: typed by the candidate, or found in their resume and added by them. */
export type SkillSource = "user" | "resume";

export interface CandidateIdentity {
  fullName: string | null;
  headline: string | null;
  location: string | null;
  /** Identifies the current profile photo (used to build its URL); null when there is none. */
  avatarId: string | null;
}

export interface CandidateCareer {
  targetRole: string | null;
  targetIndustry: string | null;
  experienceLevel: ExperienceLevel | null;
  yearsOfExperience: number | null;
  workArrangements: WorkArrangement[];
}

export interface CandidateGoals {
  goalPosition: string | null;
  targetCompanies: string[];
  areasToImprove: string[];
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string | null;
  fieldOfStudy: string | null;
  startDate: YearMonth | null;
  endDate: YearMonth | null;
  grade: string | null;
}

export interface ExperienceEntry {
  id: string;
  company: string;
  title: string;
  startDate: YearMonth | null;
  endDate: YearMonth | null;
  isCurrent: boolean;
  responsibilities: string | null;
  achievements: string | null;
  technologies: string[];
}

export interface ProjectEntry {
  id: string;
  name: string;
  description: string | null;
  role: string | null;
  technologies: string[];
  outcomes: string | null;
  url: string | null;
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string | null;
  issuedOn: YearMonth | null;
  expiresOn: YearMonth | null;
  credentialId: string | null;
  credentialUrl: string | null;
}

export interface CandidateSkill {
  id: string;
  name: string;
  category: CandidateSkillCategory;
  source: SkillSource;
}

/** The repeating profile sections, named after their tables. */
export const ENTRY_KINDS = ["education", "experience", "projects", "certifications"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

/** Everything the candidate has told Oscar about themselves. Every part may be empty. */
export interface CandidateProfile {
  userId: string;
  identity: CandidateIdentity;
  career: CandidateCareer;
  goals: CandidateGoals;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  skills: CandidateSkill[];
}

// Resumes ---------------------------------------------------------------------

export const RESUME_STATUSES = ["uploaded", "processing", "processed", "failed"] as const;
export type ResumeStatus = (typeof RESUME_STATUSES)[number];

export const RESUME_FILE_TYPES = ["pdf", "docx"] as const;
export type ResumeFileType = (typeof RESUME_FILE_TYPES)[number];

/** Why processing failed, as a code. Messages for each code live in the UI layer. */
export const RESUME_PROCESSING_ERRORS = [
  "unreadable",
  "no_text",
  "encrypted",
  "too_many_pages",
  "storage",
  "internal",
] as const;
export type ResumeProcessingError = (typeof RESUME_PROCESSING_ERRORS)[number];

/** An uploaded resume file and its processing state. */
export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  fileType: ResumeFileType;
  /** Bytes. */
  fileSize: number;
  status: ResumeStatus;
  processingError: ResumeProcessingError | null;
  /** Version of the parse output, set when processing succeeds. */
  parsedVersion: number | null;
  uploadedAt: ISODateString;
  processedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export const RESUME_SECTIONS = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "achievements",
] as const;
export type ResumeSection = (typeof RESUME_SECTIONS)[number];

/** What the parser found in a resume. Only fields it can extract reliably; never the full text. */
export interface ResumeParse {
  resumeId: string;
  parserVersion: number;
  email: string | null;
  phone: string | null;
  links: string[];
  summary: string | null;
  detectedSections: ResumeSection[];
  /** Canonical names from Oscar's skills catalog. */
  skillNames: string[];
  wordCount: number;
  /** Known for PDF files; null for DOCX, which has no fixed pages. */
  pageCount: number | null;
}

/**
 * Resume analysis, produced by a future analysis worker (not built in Phase 4). Qualitative
 * only: there are deliberately no numeric scores.
 */
export interface ResumeAnalysis {
  id: string;
  resumeId: string;
  analyzerVersion: number;
  targetRole: string | null;
  strengths: string[];
  missingSkills: string[];
  experienceGaps: string[];
  roleAlignment: string | null;
  qualitySignals: string[];
  recommendations: string[];
  createdAt: ISODateString;
}

/** The current resume with what is known about it. */
export interface ResumeOverview {
  resume: Resume;
  parse: ResumeParse | null;
  analysis: ResumeAnalysis | null;
}
