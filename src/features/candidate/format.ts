/**
 * Labels and formatting for candidate data. Shared by server and client components; no data
 * access and no request-time APIs.
 */
import type {
  ResumeProcessingError,
  ResumeSection,
  ResumeStatus,
  WorkArrangement,
  YearMonth,
} from "@/types/candidate";
import type { ExperienceLevel } from "@/types/domain";

export const experienceLevelLabels: Record<ExperienceLevel, string> = {
  student: "Student",
  entry: "Entry level",
  mid: "Mid level",
  senior: "Senior",
  lead: "Lead or principal",
};

export const experienceLevelOptions = (Object.keys(experienceLevelLabels) as ExperienceLevel[]).map(
  (value) => ({ value, label: experienceLevelLabels[value] }),
);

export const workArrangementLabels: Record<WorkArrangement, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export const resumeSectionLabels: Record<ResumeSection, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  achievements: "Achievements",
};

export const resumeStatusLabels: Record<
  ResumeStatus,
  { label: string; tone: "neutral" | "info" | "success" | "error" }
> = {
  uploaded: { label: "Uploaded", tone: "neutral" },
  processing: { label: "Processing", tone: "info" },
  processed: { label: "Processed", tone: "success" },
  failed: { label: "Could not be read", tone: "error" },
};

/** What the candidate is told for each processing failure. Plain language, with a way forward. */
export const processingErrorMessages: Record<ResumeProcessingError, string> = {
  unreadable:
    "Oscar could not read this file. Export your resume again as a PDF or Word file and upload it.",
  no_text:
    "Oscar could not find any text in this file. If it is a scanned image, upload a text-based PDF or Word file instead.",
  encrypted: "This file is password protected. Remove the password and upload it again.",
  too_many_pages: "This file has more than 30 pages. Upload a shorter resume.",
  storage: "Oscar could not open the stored file. Upload your resume again.",
  internal: "Something went wrong while reading your resume. Try again, or upload it again.",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2024-06" as "Jun 2024". */
export function formatMonth(month: YearMonth | null): string | null {
  if (!month) return null;
  const [year, monthNumber] = month.split("-");
  const name = MONTHS[Number(monthNumber) - 1];
  return name && year ? `${name} ${year}` : null;
}

/** A date range in words: "Mar 2021 to present", "Sep 2014 to Jun 2018", "From Mar 2021". */
export function formatPeriod(
  start: YearMonth | null,
  end: YearMonth | null,
  current = false,
): string | null {
  const from = formatMonth(start);
  const to = current ? "present" : formatMonth(end);
  if (from && to) return `${from} to ${to}`;
  if (from) return `From ${from}`;
  if (to) return current ? "Current" : `Until ${to}`;
  return null;
}

/** A timestamp as a readable date in UTC ("6 October 2026"), stable across server and client. */
export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

/** Joins non-empty parts with a middle dot: "Engineer · Lisbon". */
export function joinParts(parts: ReadonlyArray<string | null | undefined | false>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" · ");
}
