"use client";

import { useState } from "react";

import { Checkbox, Input, Textarea } from "@/components/ui";
import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
} from "@/types/candidate";

import { saveEntryAction } from "../../actions";
import { formatMonth, formatPeriod, joinParts } from "../../format";
import {
  limits,
  validateCertification,
  validateEducation,
  validateExperience,
  validateProject,
  type CertificationField,
  type EducationField,
  type ExperienceField,
  type ProjectField,
} from "../../validation";
import { EntryList } from "./entry-list";
import styles from "./profile.module.css";
import { ProfileForm } from "./profile-form";

const monthHint = "Month and year, like 2024-06.";

/** Hidden id field when editing an existing entry. */
function idField(entry: { id: string } | null) {
  return entry ? { id: entry.id } : undefined;
}

function lines(text: string | null): string[] {
  return text
    ? text
        .split("\n")
        .map((line) => line.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean)
    : [];
}

function ExternalLink({ href }: { href: string }) {
  let label = href;
  try {
    const url = new URL(href);
    label = `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    // Stored URLs are validated; fall back to the raw value just in case.
  }
  return (
    <a href={href} className={styles.link} rel="noopener noreferrer nofollow">
      {label}
    </a>
  );
}

function TechnologyList({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <p className={styles.entryMeta}>
      <span className="visually-hidden">Technologies:</span> {items.join(", ")}
    </p>
  );
}

// Education -----------------------------------------------------------------------------------

const educationFields: readonly EducationField[] = [
  "institution",
  "degree",
  "fieldOfStudy",
  "startDate",
  "endDate",
  "grade",
];

function EducationForm({ entry }: { entry: EducationEntry | null }) {
  return (
    <ProfileForm
      label={entry ? `Edit ${entry.institution}` : "Add education"}
      action={saveEntryAction.bind(null, "education")}
      validate={validateEducation}
      fieldOrder={educationFields}
      hidden={idField(entry)}
    >
      {({ errors, clear }) => (
        <>
          <Input
            name="institution"
            label="School or institution"
            required
            maxLength={limits.organization}
            defaultValue={entry?.institution ?? ""}
            error={errors.institution}
            onChange={() => clear("institution")}
          />
          <div className={styles.fieldRow}>
            <Input
              name="degree"
              label="Degree"
              maxLength={limits.degree}
              defaultValue={entry?.degree ?? ""}
              error={errors.degree}
              onChange={() => clear("degree")}
            />
            <Input
              name="fieldOfStudy"
              label="Field of study"
              maxLength={limits.degree}
              defaultValue={entry?.fieldOfStudy ?? ""}
              error={errors.fieldOfStudy}
              onChange={() => clear("fieldOfStudy")}
            />
          </div>
          <div className={styles.fieldRow}>
            <Input
              name="startDate"
              label="Start"
              type="month"
              placeholder="YYYY-MM"
              description={monthHint}
              defaultValue={entry?.startDate ?? ""}
              error={errors.startDate}
              onChange={() => clear("startDate")}
            />
            <Input
              name="endDate"
              label="End"
              type="month"
              placeholder="YYYY-MM"
              description="Or expected end."
              defaultValue={entry?.endDate ?? ""}
              error={errors.endDate}
              onChange={() => clear("endDate")}
            />
          </div>
          <Input
            name="grade"
            label="Grade"
            description="Optional, like “First class” or “3.8 GPA”."
            maxLength={limits.grade}
            defaultValue={entry?.grade ?? ""}
            error={errors.grade}
            onChange={() => clear("grade")}
          />
        </>
      )}
    </ProfileForm>
  );
}

export function EducationSection({ entries }: { entries: readonly EducationEntry[] }) {
  return (
    <EntryList
      id="education"
      kind="education"
      title="Education"
      description="Degrees, courses, and programs."
      noun="education"
      entries={entries}
      name={(entry) => entry.institution}
      emptyText="No education added yet."
      renderForm={(entry) => <EducationForm entry={entry} />}
      renderEntry={(entry) => (
        <>
          <h3 className={styles.entryTitle}>
            {joinParts([entry.degree, entry.fieldOfStudy]) || entry.institution}
          </h3>
          {entry.degree || entry.fieldOfStudy ? (
            <p className={styles.entrySubtitle}>{entry.institution}</p>
          ) : null}
          <p className={styles.entryMeta}>
            {joinParts([formatPeriod(entry.startDate, entry.endDate), entry.grade])}
          </p>
        </>
      )}
    />
  );
}

// Experience ----------------------------------------------------------------------------------

const experienceFields: readonly ExperienceField[] = [
  "company",
  "title",
  "startDate",
  "endDate",
  "isCurrent",
  "responsibilities",
  "achievements",
  "technologies",
];

function ExperienceForm({ entry }: { entry: ExperienceEntry | null }) {
  const [isCurrent, setIsCurrent] = useState(entry?.isCurrent ?? false);
  return (
    <ProfileForm
      label={entry ? `Edit ${entry.title} at ${entry.company}` : "Add a role"}
      action={saveEntryAction.bind(null, "experience")}
      validate={validateExperience}
      fieldOrder={experienceFields}
      hidden={idField(entry)}
    >
      {({ errors, clear }) => (
        <>
          <div className={styles.fieldRow}>
            <Input
              name="title"
              label="Job title"
              required
              maxLength={limits.organization}
              defaultValue={entry?.title ?? ""}
              error={errors.title}
              onChange={() => clear("title")}
            />
            <Input
              name="company"
              label="Company or organization"
              required
              maxLength={limits.organization}
              defaultValue={entry?.company ?? ""}
              error={errors.company}
              onChange={() => clear("company")}
            />
          </div>
          <div className={styles.fieldRow}>
            <Input
              name="startDate"
              label="Start"
              type="month"
              placeholder="YYYY-MM"
              description={monthHint}
              defaultValue={entry?.startDate ?? ""}
              error={errors.startDate}
              onChange={() => clear("startDate")}
            />
            <Input
              name="endDate"
              label="End"
              type="month"
              placeholder="YYYY-MM"
              description={isCurrent ? "Not needed for a current role." : monthHint}
              disabled={isCurrent}
              defaultValue={entry?.endDate ?? ""}
              error={errors.endDate}
              onChange={() => clear("endDate")}
            />
          </div>
          <Checkbox
            name="isCurrent"
            label="I currently work here"
            checked={isCurrent}
            onChange={(event) => {
              setIsCurrent(event.target.checked);
              clear("endDate");
            }}
          />
          <Textarea
            name="responsibilities"
            label="Responsibilities"
            description="What you were responsible for."
            rows={3}
            maxLength={limits.longText}
            defaultValue={entry?.responsibilities ?? ""}
            error={errors.responsibilities}
            onChange={() => clear("responsibilities")}
          />
          <Textarea
            name="achievements"
            label="Achievements"
            description="One per line. Results you are proud of, with numbers where you have them."
            rows={3}
            maxLength={limits.longText}
            defaultValue={entry?.achievements ?? ""}
            error={errors.achievements}
            onChange={() => clear("achievements")}
          />
          <Input
            name="technologies"
            label="Technologies"
            description="Separate with commas."
            defaultValue={entry?.technologies.join(", ") ?? ""}
            error={errors.technologies}
            onChange={() => clear("technologies")}
          />
        </>
      )}
    </ProfileForm>
  );
}

export function ExperienceSection({ entries }: { entries: readonly ExperienceEntry[] }) {
  return (
    <EntryList
      id="experience"
      kind="experience"
      title="Experience"
      description="Roles you have held, most recent first."
      noun="role"
      entries={entries}
      name={(entry) => `${entry.title} at ${entry.company}`}
      emptyText="No work experience added yet."
      renderForm={(entry) => <ExperienceForm entry={entry} />}
      renderEntry={(entry) => {
        const achievements = lines(entry.achievements);
        return (
          <>
            <h3 className={styles.entryTitle}>{entry.title}</h3>
            <p className={styles.entrySubtitle}>{entry.company}</p>
            {formatPeriod(entry.startDate, entry.endDate, entry.isCurrent) ? (
              <p className={styles.entryMeta}>
                {formatPeriod(entry.startDate, entry.endDate, entry.isCurrent)}
              </p>
            ) : null}
            {entry.responsibilities ? (
              <p className={styles.entryText}>{entry.responsibilities}</p>
            ) : null}
            {achievements.length > 0 ? (
              <ul className={styles.entryBullets} aria-label="Achievements">
                {achievements.map((achievement) => (
                  <li key={achievement}>{achievement}</li>
                ))}
              </ul>
            ) : null}
            <TechnologyList items={entry.technologies} />
          </>
        );
      }}
    />
  );
}

// Projects ------------------------------------------------------------------------------------

const projectFields: readonly ProjectField[] = [
  "name",
  "role",
  "description",
  "outcomes",
  "technologies",
  "url",
];

function ProjectForm({ entry }: { entry: ProjectEntry | null }) {
  return (
    <ProfileForm
      label={entry ? `Edit ${entry.name}` : "Add a project"}
      action={saveEntryAction.bind(null, "projects")}
      validate={validateProject}
      fieldOrder={projectFields}
      hidden={idField(entry)}
    >
      {({ errors, clear }) => (
        <>
          <div className={styles.fieldRow}>
            <Input
              name="name"
              label="Project name"
              required
              maxLength={limits.organization}
              defaultValue={entry?.name ?? ""}
              error={errors.name}
              onChange={() => clear("name")}
            />
            <Input
              name="role"
              label="Your role"
              maxLength={limits.role}
              defaultValue={entry?.role ?? ""}
              error={errors.role}
              onChange={() => clear("role")}
            />
          </div>
          <Textarea
            name="description"
            label="Description"
            description="What it is and the problem it solves."
            rows={3}
            maxLength={limits.longText}
            defaultValue={entry?.description ?? ""}
            error={errors.description}
            onChange={() => clear("description")}
          />
          <Textarea
            name="outcomes"
            label="Outcomes"
            description="What changed because of it."
            rows={2}
            maxLength={limits.longText}
            defaultValue={entry?.outcomes ?? ""}
            error={errors.outcomes}
            onChange={() => clear("outcomes")}
          />
          <Input
            name="technologies"
            label="Technologies"
            description="Separate with commas."
            defaultValue={entry?.technologies.join(", ") ?? ""}
            error={errors.technologies}
            onChange={() => clear("technologies")}
          />
          <Input
            name="url"
            label="Link"
            type="url"
            inputMode="url"
            placeholder="https://"
            description="A demo, repository, or write-up."
            defaultValue={entry?.url ?? ""}
            error={errors.url}
            onChange={() => clear("url")}
          />
        </>
      )}
    </ProfileForm>
  );
}

export function ProjectsSection({ entries }: { entries: readonly ProjectEntry[] }) {
  return (
    <EntryList
      id="projects"
      kind="projects"
      title="Projects"
      description="Work you can talk about in detail: personal, academic, or professional."
      noun="project"
      entries={entries}
      name={(entry) => entry.name}
      emptyText="No projects added yet."
      renderForm={(entry) => <ProjectForm entry={entry} />}
      renderEntry={(entry) => (
        <>
          <h3 className={styles.entryTitle}>{entry.name}</h3>
          {entry.role ? <p className={styles.entrySubtitle}>{entry.role}</p> : null}
          {entry.description ? <p className={styles.entryText}>{entry.description}</p> : null}
          {entry.outcomes ? (
            <p className={styles.entryText}>
              <span className={styles.inlineLabel}>Outcomes.</span> {entry.outcomes}
            </p>
          ) : null}
          <TechnologyList items={entry.technologies} />
          {entry.url ? (
            <p className={styles.entryMeta}>
              <ExternalLink href={entry.url} />
            </p>
          ) : null}
        </>
      )}
    />
  );
}

// Certifications ------------------------------------------------------------------------------

const certificationFields: readonly CertificationField[] = [
  "name",
  "issuer",
  "issuedOn",
  "expiresOn",
  "credentialId",
  "credentialUrl",
];

function CertificationForm({ entry }: { entry: CertificationEntry | null }) {
  return (
    <ProfileForm
      label={entry ? `Edit ${entry.name}` : "Add a certification"}
      action={saveEntryAction.bind(null, "certifications")}
      validate={validateCertification}
      fieldOrder={certificationFields}
      hidden={idField(entry)}
    >
      {({ errors, clear }) => (
        <>
          <div className={styles.fieldRow}>
            <Input
              name="name"
              label="Certification"
              required
              maxLength={limits.organization}
              defaultValue={entry?.name ?? ""}
              error={errors.name}
              onChange={() => clear("name")}
            />
            <Input
              name="issuer"
              label="Issued by"
              maxLength={limits.organization}
              defaultValue={entry?.issuer ?? ""}
              error={errors.issuer}
              onChange={() => clear("issuer")}
            />
          </div>
          <div className={styles.fieldRow}>
            <Input
              name="issuedOn"
              label="Issued"
              type="month"
              placeholder="YYYY-MM"
              description={monthHint}
              defaultValue={entry?.issuedOn ?? ""}
              error={errors.issuedOn}
              onChange={() => clear("issuedOn")}
            />
            <Input
              name="expiresOn"
              label="Expires"
              type="month"
              placeholder="YYYY-MM"
              description="Leave empty if it does not expire."
              defaultValue={entry?.expiresOn ?? ""}
              error={errors.expiresOn}
              onChange={() => clear("expiresOn")}
            />
          </div>
          <div className={styles.fieldRow}>
            <Input
              name="credentialId"
              label="Credential ID"
              maxLength={limits.credentialId}
              defaultValue={entry?.credentialId ?? ""}
              error={errors.credentialId}
              onChange={() => clear("credentialId")}
            />
            <Input
              name="credentialUrl"
              label="Credential link"
              type="url"
              inputMode="url"
              placeholder="https://"
              defaultValue={entry?.credentialUrl ?? ""}
              error={errors.credentialUrl}
              onChange={() => clear("credentialUrl")}
            />
          </div>
        </>
      )}
    </ProfileForm>
  );
}

export function CertificationsSection({ entries }: { entries: readonly CertificationEntry[] }) {
  return (
    <EntryList
      id="certifications"
      kind="certifications"
      title="Certifications"
      description="Optional. Licenses and certificates relevant to your target role."
      noun="certification"
      entries={entries}
      name={(entry) => entry.name}
      emptyText="No certifications added. They are optional."
      renderForm={(entry) => <CertificationForm entry={entry} />}
      renderEntry={(entry) => (
        <>
          <h3 className={styles.entryTitle}>{entry.name}</h3>
          {entry.issuer ? <p className={styles.entrySubtitle}>{entry.issuer}</p> : null}
          {entry.issuedOn || entry.expiresOn || entry.credentialId ? (
            <p className={styles.entryMeta}>
              {joinParts([
                entry.issuedOn ? `Issued ${formatMonth(entry.issuedOn)}` : null,
                entry.expiresOn ? `Expires ${formatMonth(entry.expiresOn)}` : null,
                entry.credentialId ? `ID ${entry.credentialId}` : null,
              ])}
            </p>
          ) : null}
          {entry.credentialUrl ? (
            <p className={styles.entryMeta}>
              <ExternalLink href={entry.credentialUrl} />
            </p>
          ) : null}
        </>
      )}
    />
  );
}
