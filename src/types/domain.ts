/**
 * Domain model for Oscar's workspace. These types describe data that later
 * phases will store and produce; Phase 3 only defines their shape.
 *
 * Deliberately absent: numeric scores and ratings. The evaluation model is an
 * open decision (docs/architecture.md), so no score fields exist yet.
 */

/** ISO 8601 timestamp, as stored and serialized. */
export type ISODateString = string;

export type ExperienceLevel = "student" | "entry" | "mid" | "senior" | "lead";

/** The signed-in person, as the workspace sees them. */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  createdAt: ISODateString | null;
  /** Interview preferences, collected during interview setup in a later phase. */
  targetRole: string | null;
  experienceLevel: ExperienceLevel | null;
}

export type InterviewType = "behavioral" | "technical" | "coding" | "mixed";
export type InterviewFormat = "voice" | "video" | "text";
export type InterviewStatus = "draft" | "in_progress" | "completed" | "abandoned";

/** What the candidate chooses before an interview starts. */
export interface InterviewConfig {
  role: string;
  experienceLevel: ExperienceLevel;
  type: InterviewType;
  format: InterviewFormat;
  questionCount: number;
}

/** One mock interview, from setup to completion. */
export interface Interview {
  id: string;
  userId: string;
  config: InterviewConfig;
  status: InterviewStatus;
  createdAt: ISODateString;
  completedAt: ISODateString | null;
}

/** One question and the candidate's answer within a session. */
export interface InterviewTurn {
  id: string;
  question: string;
  answerTranscript: string | null;
  askedAt: ISODateString;
}

/** A live run of an interview (an interview may be resumed in more than one session). */
export interface InterviewSession {
  id: string;
  interviewId: string;
  startedAt: ISODateString;
  endedAt: ISODateString | null;
  turns: readonly InterviewTurn[];
}

export type ResumeStatus = "processing" | "ready" | "failed";

/** An uploaded resume. Parsed content and analysis are later-phase concerns. */
export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  uploadedAt: ISODateString;
  status: ResumeStatus;
}

export type SkillCategory = "technical" | "behavioral" | "communication" | "coding";

/** A skill Oscar can give feedback on. */
export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
}

export type RoadmapStepStatus = "todo" | "in_progress" | "done";

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  skillId: string | null;
  status: RoadmapStepStatus;
}

/** An ordered improvement plan built from a candidate's sessions. */
export interface Roadmap {
  id: string;
  userId: string;
  generatedAt: ISODateString;
  steps: readonly RoadmapStep[];
}

export type PracticeKind = "technical" | "behavioral" | "coding";

/** Focused practice outside a full mock interview. */
export interface PracticeSession {
  id: string;
  userId: string;
  kind: PracticeKind;
  skillIds: readonly string[];
  startedAt: ISODateString;
  completedAt: ISODateString | null;
}
