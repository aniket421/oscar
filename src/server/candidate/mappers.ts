import "server-only";

import type {
  CandidateSkill,
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  Resume,
  ResumeAnalysis,
  ResumeParse,
  YearMonth,
} from "@/types/candidate";

import type {
  CertificationRow,
  EducationRow,
  ExperienceRow,
  ProjectRow,
  ResumeAnalysisRow,
  ResumeParseRow,
  ResumeRow,
  SkillRow,
} from "../supabase/database";

/** "2024-06-01" (a date column) to "2024-06". */
export function toYearMonth(date: string | null): YearMonth | null {
  return date ? date.slice(0, 7) : null;
}

/** "2024-06" to "2024-06-01": dates are stored as the first day of their month. */
export function fromYearMonth(month: YearMonth | null): string | null {
  return month ? `${month}-01` : null;
}

const AVATAR_ID = /\/avatar\/([0-9a-f-]{36})\.(?:png|jpg|webp)$/;

/** The avatar's id within its storage path, used as a cache-busting version in its URL. */
export function avatarIdFromPath(path: string | null): string | null {
  return path ? (AVATAR_ID.exec(path)?.[1] ?? null) : null;
}

export function toEducation(row: EducationRow): EducationEntry {
  return {
    id: row.id,
    institution: row.institution,
    degree: row.degree,
    fieldOfStudy: row.field_of_study,
    startDate: toYearMonth(row.start_date),
    endDate: toYearMonth(row.end_date),
    grade: row.grade,
  };
}

export function toExperience(row: ExperienceRow): ExperienceEntry {
  return {
    id: row.id,
    company: row.company,
    title: row.title,
    startDate: toYearMonth(row.start_date),
    endDate: toYearMonth(row.end_date),
    isCurrent: row.is_current,
    responsibilities: row.responsibilities,
    achievements: row.achievements,
    technologies: row.technologies,
  };
}

export function toProject(row: ProjectRow): ProjectEntry {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    role: row.role,
    technologies: row.technologies,
    outcomes: row.outcomes,
    url: row.url,
  };
}

export function toCertification(row: CertificationRow): CertificationEntry {
  return {
    id: row.id,
    name: row.name,
    issuer: row.issuer,
    issuedOn: toYearMonth(row.issued_on),
    expiresOn: toYearMonth(row.expires_on),
    credentialId: row.credential_id,
    credentialUrl: row.credential_url,
  };
}

export function toSkill(row: SkillRow): CandidateSkill {
  return { id: row.id, name: row.name, category: row.category, source: row.source };
}

export function toResume(row: ResumeRow): Resume {
  return {
    id: row.id,
    userId: row.user_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    status: row.status,
    processingError: row.processing_error,
    parsedVersion: row.parsed_version,
    uploadedAt: row.uploaded_at,
    processedAt: row.processed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toResumeParse(row: ResumeParseRow): ResumeParse {
  return {
    resumeId: row.resume_id,
    parserVersion: row.parser_version,
    email: row.email,
    phone: row.phone,
    links: row.links,
    summary: row.summary,
    detectedSections: row.detected_sections,
    skillNames: row.skill_names,
    wordCount: row.word_count,
    pageCount: row.page_count,
  };
}

export function toResumeAnalysis(row: ResumeAnalysisRow): ResumeAnalysis {
  return {
    id: row.id,
    resumeId: row.resume_id,
    analyzerVersion: row.analyzer_version,
    targetRole: row.target_role,
    strengths: row.strengths,
    missingSkills: row.missing_skills,
    experienceGaps: row.experience_gaps,
    roleAlignment: row.role_alignment,
    qualitySignals: row.quality_signals,
    recommendations: row.recommendations,
    createdAt: row.created_at,
  };
}
