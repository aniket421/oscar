/**
 * Validation for every candidate profile form. The same functions run in the browser (instant
 * feedback) and in Server Actions (authoritative). Database check constraints repeat the same
 * limits, so invalid data is rejected even if a caller skips this layer.
 *
 * Validators take raw form input (strings) and return either a normalized value or field errors
 * written for the candidate.
 */
import {
  EXPERIENCE_LEVELS,
  SKILL_CATEGORIES,
  WORK_ARRANGEMENTS,
  type CandidateCareer,
  type CandidateGoals,
  type CandidateIdentity,
  type CandidateSkillCategory,
  type CertificationEntry,
  type EducationEntry,
  type ExperienceEntry,
  type ProjectEntry,
  type WorkArrangement,
  type YearMonth,
} from "@/types/candidate";
import type { ExperienceLevel } from "@/types/domain";

// Input -------------------------------------------------------------------------------------

/** Raw form values: one string per field, or several for repeated fields (checkbox groups). */
export type FormInput = Readonly<Record<string, string | readonly string[] | undefined>>;

/** Reads a FormData into `FormInput`, keeping repeated fields as lists. Files are ignored. */
export function readFormInput(formData: FormData): FormInput {
  const input: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    const existing = input[key];
    if (existing === undefined) input[key] = value;
    else input[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  return input;
}

function single(input: FormInput, name: string): string {
  const value = input[name];
  if (typeof value === "string") return value;
  return value?.[0] ?? "";
}

function multiple(input: FormInput, name: string): string[] {
  const value = input[name];
  if (value === undefined) return [];
  return typeof value === "string" ? [value] : [...value];
}

// Results -----------------------------------------------------------------------------------

export type FieldErrors<Field extends string = string> = Partial<Record<Field, string>>;

export type ValidationResult<Value, Field extends string = string> =
  { ok: true; value: Value } | { ok: false; errors: FieldErrors<Field> };

/** Collects field errors while values are read, then produces the result. */
class Collector<Field extends string> {
  readonly errors: FieldErrors<Field> = {};

  fail(field: Field, message: string): null {
    if (!this.errors[field]) this.errors[field] = message;
    return null;
  }

  result<Value>(value: Value): ValidationResult<Value, Field> {
    return Object.keys(this.errors).length > 0
      ? { ok: false, errors: this.errors }
      : { ok: true, value };
  }
}

// Limits ------------------------------------------------------------------------------------

export const limits = {
  name: 120,
  headline: 160,
  location: 120,
  role: 120,
  industry: 120,
  organization: 160,
  degree: 160,
  grade: 40,
  longText: 2000,
  url: 2048,
  credentialId: 120,
  skill: 60,
  technology: 60,
  technologies: 30,
  company: 80,
  companies: 20,
  improvement: 120,
  improvements: 12,
  yearsOfExperience: 60,
} as const;

const MIN_YEAR = 1950;
const MAX_YEAR = 2100;

// Field readers -----------------------------------------------------------------------------

// Control characters other than tab and newline never belong in profile text.
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** One-line text: trimmed, inner whitespace collapsed. Empty becomes null. */
export function normalizeLine(value: string): string | null {
  const cleaned = value.replace(CONTROL_CHARACTERS, "").replace(/\s+/g, " ").trim();
  return cleaned === "" ? null : cleaned;
}

/** Multi-line text: line endings normalized, outer whitespace and blank runs trimmed. */
export function normalizeText(value: string): string | null {
  const cleaned = value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARACTERS, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned === "" ? null : cleaned;
}

/** A list typed as comma- or line-separated text. Duplicates (ignoring case) are dropped. */
export function normalizeList(value: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of value.split(/[,\n]/)) {
    const item = normalizeLine(part);
    if (!item) continue;
    const key = item.toLocaleLowerCase("en");
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

function optionalLine<F extends string>(
  collector: Collector<F>,
  field: F,
  raw: string,
  max: number,
): string | null {
  const value = normalizeLine(raw);
  if (value && value.length > max) return collector.fail(field, `Use ${max} characters or fewer.`);
  return value;
}

function requiredLine<F extends string>(
  collector: Collector<F>,
  field: F,
  raw: string,
  max: number,
  missing: string,
): string {
  const value = optionalLine(collector, field, raw, max);
  if (value === null && !collector.errors[field]) collector.fail(field, missing);
  return value ?? "";
}

function optionalText<F extends string>(
  collector: Collector<F>,
  field: F,
  raw: string,
  max: number,
): string | null {
  const value = normalizeText(raw);
  if (value && value.length > max) return collector.fail(field, `Use ${max} characters or fewer.`);
  return value;
}

function list<F extends string>(
  collector: Collector<F>,
  field: F,
  raw: string,
  maxItems: number,
  maxLength: number,
): string[] {
  const items = normalizeList(raw);
  if (items.length > maxItems) {
    collector.fail(field, `List up to ${maxItems} items.`);
    return [];
  }
  if (items.some((item) => item.length > maxLength)) {
    collector.fail(field, `Keep each item to ${maxLength} characters or fewer.`);
    return [];
  }
  return items;
}

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

/** Parses "YYYY-MM" (what `<input type="month">` submits). Empty becomes null. */
export function parseYearMonth(raw: string): YearMonth | null | "invalid" {
  const value = raw.trim();
  if (value === "") return null;
  const match = MONTH_PATTERN.exec(value);
  if (!match) return "invalid";
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12) return "invalid";
  return value;
}

function month<F extends string>(collector: Collector<F>, field: F, raw: string): YearMonth | null {
  const value = parseYearMonth(raw);
  if (value === "invalid") {
    return collector.fail(
      field,
      `Enter a month between ${MIN_YEAR} and ${MAX_YEAR}, like 2024-06.`,
    );
  }
  return value;
}

function ordered<F extends string>(
  collector: Collector<F>,
  field: F,
  start: YearMonth | null,
  end: YearMonth | null,
  message: string,
) {
  if (start && end && end < start) collector.fail(field, message);
}

/**
 * An optional web address. A missing scheme gets https://; only http and https are accepted,
 * so values such as `javascript:` can never be stored or rendered as links.
 */
export function normalizeUrl(raw: string): string | null | "invalid" {
  const value = raw.trim();
  if (value === "") return null;
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return "invalid";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "invalid";
  if (!url.hostname.includes(".") || /\s/.test(candidate)) return "invalid";
  const normalized = url.toString();
  return normalized.length > limits.url ? "invalid" : normalized;
}

function url<F extends string>(collector: Collector<F>, field: F, raw: string): string | null {
  const value = normalizeUrl(raw);
  if (value === "invalid")
    return collector.fail(field, "Enter a web address, like https://example.com.");
  return value;
}

function oneOf<T extends string, F extends string>(
  collector: Collector<F>,
  field: F,
  raw: string,
  options: readonly T[],
  message: string,
): T | null {
  const value = raw.trim();
  if (value === "") return null;
  return (options as readonly string[]).includes(value)
    ? (value as T)
    : collector.fail(field, message);
}

// Sections ----------------------------------------------------------------------------------

export type IdentityInput = Pick<CandidateIdentity, "fullName" | "headline" | "location">;
export type IdentityField = keyof IdentityInput;

export function validateIdentity(input: FormInput): ValidationResult<IdentityInput, IdentityField> {
  const c = new Collector<IdentityField>();
  return c.result({
    fullName: optionalLine(c, "fullName", single(input, "fullName"), limits.name),
    headline: optionalLine(c, "headline", single(input, "headline"), limits.headline),
    location: optionalLine(c, "location", single(input, "location"), limits.location),
  });
}

export type CareerField = keyof CandidateCareer;

export function validateCareer(input: FormInput): ValidationResult<CandidateCareer, CareerField> {
  const c = new Collector<CareerField>();

  const yearsRaw = single(input, "yearsOfExperience").trim();
  let yearsOfExperience: number | null = null;
  if (yearsRaw !== "") {
    const years = Number(yearsRaw);
    if (!Number.isInteger(years) || years < 0 || years > limits.yearsOfExperience) {
      c.fail("yearsOfExperience", `Enter a whole number from 0 to ${limits.yearsOfExperience}.`);
    } else {
      yearsOfExperience = years;
    }
  }

  const arrangements = multiple(input, "workArrangements");
  const workArrangements = WORK_ARRANGEMENTS.filter((option) => arrangements.includes(option));
  if (arrangements.some((value) => !(WORK_ARRANGEMENTS as readonly string[]).includes(value))) {
    c.fail("workArrangements", "Choose from remote, hybrid, or on-site.");
  }

  return c.result({
    targetRole: optionalLine(c, "targetRole", single(input, "targetRole"), limits.role),
    targetIndustry: optionalLine(
      c,
      "targetIndustry",
      single(input, "targetIndustry"),
      limits.industry,
    ),
    experienceLevel: oneOf<ExperienceLevel, CareerField>(
      c,
      "experienceLevel",
      single(input, "experienceLevel"),
      EXPERIENCE_LEVELS,
      "Choose an experience level from the list.",
    ),
    yearsOfExperience,
    workArrangements: workArrangements satisfies WorkArrangement[],
  });
}

export type GoalsField = keyof CandidateGoals;

export function validateGoals(input: FormInput): ValidationResult<CandidateGoals, GoalsField> {
  const c = new Collector<GoalsField>();
  return c.result({
    goalPosition: optionalLine(c, "goalPosition", single(input, "goalPosition"), limits.role),
    targetCompanies: list(
      c,
      "targetCompanies",
      single(input, "targetCompanies"),
      limits.companies,
      limits.company,
    ),
    areasToImprove: list(
      c,
      "areasToImprove",
      single(input, "areasToImprove"),
      limits.improvements,
      limits.improvement,
    ),
  });
}

export type EducationInput = Omit<EducationEntry, "id">;
export type EducationField = keyof EducationInput;

export function validateEducation(
  input: FormInput,
): ValidationResult<EducationInput, EducationField> {
  const c = new Collector<EducationField>();
  const startDate = month(c, "startDate", single(input, "startDate"));
  const endDate = month(c, "endDate", single(input, "endDate"));
  ordered(c, "endDate", startDate, endDate, "The end date must be after the start date.");
  return c.result({
    institution: requiredLine(
      c,
      "institution",
      single(input, "institution"),
      limits.organization,
      "Enter the school or institution.",
    ),
    degree: optionalLine(c, "degree", single(input, "degree"), limits.degree),
    fieldOfStudy: optionalLine(c, "fieldOfStudy", single(input, "fieldOfStudy"), limits.degree),
    startDate,
    endDate,
    grade: optionalLine(c, "grade", single(input, "grade"), limits.grade),
  });
}

export type ExperienceInput = Omit<ExperienceEntry, "id">;
export type ExperienceField = keyof ExperienceInput;

export function validateExperience(
  input: FormInput,
): ValidationResult<ExperienceInput, ExperienceField> {
  const c = new Collector<ExperienceField>();
  const isCurrent = single(input, "isCurrent") === "on" || single(input, "isCurrent") === "true";
  const startDate = month(c, "startDate", single(input, "startDate"));
  // A current role has no end date; one typed before ticking "I work here now" is not kept.
  const endDate = isCurrent ? null : month(c, "endDate", single(input, "endDate"));
  ordered(c, "endDate", startDate, endDate, "The end date must be after the start date.");
  return c.result({
    company: requiredLine(
      c,
      "company",
      single(input, "company"),
      limits.organization,
      "Enter the company or organization.",
    ),
    title: requiredLine(
      c,
      "title",
      single(input, "title"),
      limits.organization,
      "Enter your job title.",
    ),
    startDate,
    endDate,
    isCurrent,
    responsibilities: optionalText(
      c,
      "responsibilities",
      single(input, "responsibilities"),
      limits.longText,
    ),
    achievements: optionalText(c, "achievements", single(input, "achievements"), limits.longText),
    technologies: list(
      c,
      "technologies",
      single(input, "technologies"),
      limits.technologies,
      limits.technology,
    ),
  });
}

export type ProjectInput = Omit<ProjectEntry, "id">;
export type ProjectField = keyof ProjectInput;

export function validateProject(input: FormInput): ValidationResult<ProjectInput, ProjectField> {
  const c = new Collector<ProjectField>();
  return c.result({
    name: requiredLine(
      c,
      "name",
      single(input, "name"),
      limits.organization,
      "Enter the project name.",
    ),
    description: optionalText(c, "description", single(input, "description"), limits.longText),
    role: optionalLine(c, "role", single(input, "role"), limits.role),
    technologies: list(
      c,
      "technologies",
      single(input, "technologies"),
      limits.technologies,
      limits.technology,
    ),
    outcomes: optionalText(c, "outcomes", single(input, "outcomes"), limits.longText),
    url: url(c, "url", single(input, "url")),
  });
}

export type CertificationInput = Omit<CertificationEntry, "id">;
export type CertificationField = keyof CertificationInput;

export function validateCertification(
  input: FormInput,
): ValidationResult<CertificationInput, CertificationField> {
  const c = new Collector<CertificationField>();
  const issuedOn = month(c, "issuedOn", single(input, "issuedOn"));
  const expiresOn = month(c, "expiresOn", single(input, "expiresOn"));
  ordered(c, "expiresOn", issuedOn, expiresOn, "The expiry date must be after the issue date.");
  return c.result({
    name: requiredLine(
      c,
      "name",
      single(input, "name"),
      limits.organization,
      "Enter the certification name.",
    ),
    issuer: optionalLine(c, "issuer", single(input, "issuer"), limits.organization),
    issuedOn,
    expiresOn,
    credentialId: optionalLine(
      c,
      "credentialId",
      single(input, "credentialId"),
      limits.credentialId,
    ),
    credentialUrl: url(c, "credentialUrl", single(input, "credentialUrl")),
  });
}

export interface SkillInput {
  name: string;
  category: CandidateSkillCategory;
}
export type SkillField = keyof SkillInput;

export function validateSkill(input: FormInput): ValidationResult<SkillInput, SkillField> {
  const c = new Collector<SkillField>();
  const name = requiredLine(c, "name", single(input, "name"), limits.skill, "Enter a skill.");
  const category = oneOf<CandidateSkillCategory, SkillField>(
    c,
    "category",
    single(input, "category"),
    SKILL_CATEGORIES,
    "Choose a category from the list.",
  );
  if (category === null && !c.errors.category) c.fail("category", "Choose a category.");
  return c.result({ name, category: category ?? "tools" });
}

/** Ids come from forms too; anything that is not a UUID is rejected before reaching the database. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
