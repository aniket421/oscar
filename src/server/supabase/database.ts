/**
 * Database types for the Supabase client, written to match `supabase/migrations/`. Keep the two in
 * step: a column added in a migration is added here in the same change. (When a Supabase project
 * is linked, `supabase gen types typescript` can generate this file instead.)
 *
 * Literal unions mirror the check constraints, so the database guarantees what the types promise.
 */
import type {
  CandidateSkillCategory,
  ResumeFileType,
  ResumeProcessingError,
  ResumeSection,
  ResumeStatus,
  SkillSource,
  WorkArrangement,
} from "@/types/candidate";
import type { ExperienceLevel } from "@/types/domain";

/** A table whose `Required` columns must be given on insert; every other column has a default or is nullable. */
type Table<Row extends Record<string, unknown>, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

type Timestamps = { created_at: string; updated_at: string };

export type ProfileRow = {
  user_id: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  avatar_path: string | null;
  experience_level: ExperienceLevel | null;
  years_of_experience: number | null;
} & Timestamps;

export type CandidatePreferencesRow = {
  user_id: string;
  target_role: string | null;
  target_industry: string | null;
  work_arrangements: WorkArrangement[];
  goal_position: string | null;
  target_companies: string[];
  areas_to_improve: string[];
} & Timestamps;

export type EducationRow = {
  id: string;
  user_id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  grade: string | null;
} & Timestamps;

export type ExperienceRow = {
  id: string;
  user_id: string;
  company: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  responsibilities: string | null;
  achievements: string | null;
  technologies: string[];
} & Timestamps;

export type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  role: string | null;
  technologies: string[];
  outcomes: string | null;
  url: string | null;
} & Timestamps;

export type CertificationRow = {
  id: string;
  user_id: string;
  name: string;
  issuer: string | null;
  issued_on: string | null;
  expires_on: string | null;
  credential_id: string | null;
  credential_url: string | null;
} & Timestamps;

export type SkillRow = {
  id: string;
  user_id: string;
  name: string;
  category: CandidateSkillCategory;
  source: SkillSource;
  resume_id: string | null;
} & Timestamps;

export type ResumeRow = {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  file_type: ResumeFileType;
  file_size: number;
  status: ResumeStatus;
  processing_error: ResumeProcessingError | null;
  parsed_version: number | null;
  uploaded_at: string;
  processed_at: string | null;
} & Timestamps;

export type ResumeParseRow = {
  resume_id: string;
  user_id: string;
  parser_version: number;
  email: string | null;
  phone: string | null;
  links: string[];
  summary: string | null;
  detected_sections: ResumeSection[];
  skill_names: string[];
  word_count: number;
  page_count: number | null;
} & Timestamps;

export type ResumeAnalysisRow = {
  id: string;
  resume_id: string;
  user_id: string;
  analyzer_version: number;
  target_role: string | null;
  strengths: string[];
  missing_skills: string[];
  experience_gaps: string[];
  role_alignment: string | null;
  quality_signals: string[];
  recommendations: string[];
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "user_id">;
      candidate_preferences: Table<CandidatePreferencesRow, "user_id">;
      education: Table<EducationRow, "user_id" | "institution">;
      experience: Table<ExperienceRow, "user_id" | "company" | "title">;
      projects: Table<ProjectRow, "user_id" | "name">;
      certifications: Table<CertificationRow, "user_id" | "name">;
      skills: Table<SkillRow, "user_id" | "name" | "category">;
      resumes: Table<
        ResumeRow,
        "id" | "user_id" | "file_name" | "storage_path" | "file_type" | "file_size"
      >;
      resume_parses: Table<
        ResumeParseRow,
        "resume_id" | "user_id" | "parser_version" | "word_count"
      >;
      resume_analyses: Table<ResumeAnalysisRow, "resume_id" | "user_id" | "analyzer_version">;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
