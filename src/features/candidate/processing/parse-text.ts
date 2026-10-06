/**
 * Deterministic resume parsing over plain text. Pure functions only: no I/O, no randomness, no
 * external services. It extracts only what can be found reliably (contact details, links, the
 * summary, which sections exist, and skills from Oscar's catalog); work history and other
 * structured entries are left to a future model-assisted stage.
 * See docs/candidate-intelligence.md, section 6.
 */
import { RESUME_SECTIONS, type ResumeSection } from "@/types/candidate";

import { skillsCatalog, type CatalogSkill } from "../skills-catalog";
import { normalizeUrl } from "../validation";

/** Bumped whenever the output of this parser changes, so stored results can be recomputed. */
export const PARSER_VERSION = 1;

/** Below this many words a file is treated as having no readable text (for example a scan). */
export const MIN_WORDS = 10;

export const SUMMARY_MAX_LENGTH = 600;
const HEADER_MAX_LINES = 20;
const MAX_LINKS = 10;
const MAX_SKILLS = 100;
const HEADING_MAX_LENGTH = 48;

export interface ParsedResumeText {
  email: string | null;
  phone: string | null;
  links: string[];
  summary: string | null;
  detectedSections: ResumeSection[];
  skillNames: string[];
  wordCount: number;
}

const headingPhrases: Record<ResumeSection, readonly string[]> = {
  summary: [
    "summary",
    "professional summary",
    "career summary",
    "profile",
    "professional profile",
    "personal profile",
    "about",
    "about me",
    "objective",
    "career objective",
  ],
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "relevant experience",
    "employment",
    "employment history",
    "work history",
    "career history",
  ],
  education: ["education", "academic background", "education and training"],
  skills: [
    "skills",
    "technical skills",
    "core skills",
    "key skills",
    "skills and tools",
    "skills and technologies",
    "technologies",
    "tech stack",
    "tools and technologies",
    "core competencies",
    "competencies",
  ],
  projects: [
    "projects",
    "personal projects",
    "selected projects",
    "key projects",
    "side projects",
    "academic projects",
  ],
  certifications: [
    "certifications",
    "certificates",
    "licenses and certifications",
    "certifications and licenses",
    "courses and certifications",
  ],
  achievements: [
    "achievements",
    "key achievements",
    "accomplishments",
    "awards",
    "honors",
    "honours",
    "awards and honors",
    "awards and honours",
  ],
};

const headingLookup = new Map<string, ResumeSection>();
for (const section of RESUME_SECTIONS) {
  for (const phrase of headingPhrases[section]) headingLookup.set(phrase, section);
}

/** Recognizes a section heading line ("WORK EXPERIENCE", "Skills:", "Education & Training"). */
export function headingSection(line: string): ResumeSection | null {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.length > HEADING_MAX_LENGTH) return null;
  const key = trimmed
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return headingLookup.get(key) ?? null;
}

interface Segment {
  section: ResumeSection | null;
  lines: string[];
}

/** Splits text into the header (before any heading) and one segment per heading. */
export function segmentResume(text: string): Segment[] {
  const segments: Segment[] = [{ section: null, lines: [] }];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    const section = headingSection(line);
    if (section) segments.push({ section, lines: [] });
    else if (line !== "") segments[segments.length - 1]?.lines.push(line);
  }
  return segments;
}

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/i;
const PHONE_PATTERN = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d{2,5}(?:[\s.-]\d{2,5}){1,4}/g;
const DATE_LIKE =
  /^(?:19|20)\d{2}[\s./-]+\d{1,2}(?:[\s./-]+\d{1,4})?$|^\d{1,2}[\s./-]+\d{1,2}[\s./-]+(?:19|20)\d{2}$/;
const URL_PATTERN =
  /\bhttps?:\/\/[^\s<>()"']+|\b(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com|medium\.com|stackoverflow\.com)\/[^\s<>()"',;]+/gi;

function firstEmail(lines: readonly string[]): string | null {
  for (const line of lines) {
    const match = EMAIL_PATTERN.exec(line);
    if (match && match[0].length <= 254) return match[0].toLowerCase();
  }
  return null;
}

function firstPhone(lines: readonly string[]): string | null {
  for (const line of lines) {
    // Skip lines that are clearly addresses of the web or mail, which contain digit runs.
    const searchable = line.replace(URL_PATTERN, " ").replace(EMAIL_PATTERN, " ");
    for (const match of searchable.matchAll(PHONE_PATTERN)) {
      const candidate = match[0].trim();
      const digits = candidate.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15) continue;
      if (DATE_LIKE.test(candidate)) continue;
      return candidate.slice(0, 40);
    }
  }
  return null;
}

function links(lines: readonly string[]): string[] {
  const found: string[] = [];
  for (const line of lines) {
    for (const match of line.matchAll(URL_PATTERN)) {
      const url = normalizeUrl(match[0].replace(/[.,;:]+$/, ""));
      if (url && url !== "invalid" && !found.includes(url)) found.push(url);
      if (found.length >= MAX_LINKS) return found;
    }
  }
  return found;
}

function summarize(lines: readonly string[]): string | null {
  const text = lines.join(" ").replace(/\s+/g, " ").trim();
  if (text === "") return null;
  if (text.length <= SUMMARY_MAX_LENGTH) return text;
  const cut = text.slice(0, SUMMARY_MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > SUMMARY_MAX_LENGTH / 2 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches a term as a whole token: not glued to letters, digits, or symbols like + and #. */
function termPattern(term: string, caseSensitive: boolean): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}+#.])${escapeRegExp(term)}(?![\\p{L}\\p{N}+#]|\\.[\\p{L}\\p{N}])`,
    caseSensitive ? "u" : "iu",
  );
}

interface CompiledSkill {
  skill: CatalogSkill;
  anywhere: RegExp[];
  skillsSectionOnly: RegExp[];
}

const compiledCatalog: CompiledSkill[] = skillsCatalog.map((skill) => {
  const name = termPattern(skill.name, skill.exactCase === true);
  const aliases = (skill.aliases ?? []).map((alias) => termPattern(alias, false));
  return skill.skillsSectionOnly
    ? { skill, anywhere: aliases, skillsSectionOnly: [name] }
    : { skill, anywhere: [name, ...aliases], skillsSectionOnly: [] };
});

/** Catalog skills mentioned in the text, in order of first mention. */
export function findSkills(text: string, skillsSectionText: string): string[] {
  const found: Array<{ name: string; index: number }> = [];
  for (const { skill, anywhere, skillsSectionOnly } of compiledCatalog) {
    let index = Number.POSITIVE_INFINITY;
    for (const pattern of anywhere) {
      const match = pattern.exec(text);
      if (match) index = Math.min(index, match.index);
    }
    for (const pattern of skillsSectionOnly) {
      // Counted only when the skills section mentions it; ordered by its first mention overall.
      if (pattern.test(skillsSectionText)) {
        index = Math.min(index, pattern.exec(text)?.index ?? text.length);
      }
    }
    if (Number.isFinite(index)) found.push({ name: skill.name, index });
  }
  return found
    .sort((a, b) => a.index - b.index)
    .slice(0, MAX_SKILLS)
    .map((entry) => entry.name);
}

export function countWords(text: string): number {
  return text.match(/\S+/g)?.length ?? 0;
}

/** Normalizes extracted text: unified line endings, no control characters, no blank runs. */
export function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export function parseResumeText(rawText: string): ParsedResumeText {
  const text = normalizeExtractedText(rawText);
  const segments = segmentResume(text);
  const header = (segments[0]?.lines ?? []).slice(0, HEADER_MAX_LINES);
  const contactLines = segments.length > 1 ? header : text.split("\n").slice(0, HEADER_MAX_LINES);

  const detectedSections = RESUME_SECTIONS.filter((section) =>
    segments.some((segment) => segment.section === section),
  );
  const linesOf = (section: ResumeSection) =>
    segments.filter((segment) => segment.section === section).flatMap((segment) => segment.lines);

  return {
    email: firstEmail(contactLines),
    phone: firstPhone(contactLines),
    links: links(contactLines),
    summary: summarize(linesOf("summary")),
    detectedSections,
    skillNames: findSkills(text, linesOf("skills").join("\n")),
    wordCount: countWords(text),
  };
}
