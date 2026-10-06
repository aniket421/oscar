import type { ReactNode } from "react";

import type { AuthUser } from "@/features/auth/server";
import type { CandidateCareer, CandidateGoals, CandidateProfile } from "@/types/candidate";

import type { ProfileCompleteness } from "../../completeness";
import { experienceLevelLabels, formatDate, workArrangementLabels } from "../../format";
import { CompletenessSummary } from "../completeness-summary";
import { AvatarEditor } from "./avatar-editor";
import {
  CertificationsSection,
  EducationSection,
  ExperienceSection,
  ProjectsSection,
} from "./entry-sections";
import styles from "./profile.module.css";
import { EditableSection } from "./section-editor";
import { CareerForm, GoalsForm, IdentityForm } from "./section-forms";
import { SkillsSection } from "./skills-editor";

const sections = [
  { id: "personal", label: "Personal" },
  { id: "career", label: "Career" },
  { id: "education", label: "Education" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "certifications", label: "Certifications" },
  { id: "goals", label: "Goals" },
] as const;

function Details({ rows }: { rows: ReadonlyArray<{ label: string; value: ReactNode }> }) {
  return (
    <dl className={styles.details}>
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function missing(text = "Not added") {
  return <span className={styles.notSet}>{text}</span>;
}

function CareerView({ career }: { career: CandidateCareer }) {
  return (
    <Details
      rows={[
        { label: "Target role", value: career.targetRole ?? missing() },
        { label: "Target industry", value: career.targetIndustry ?? missing() },
        {
          label: "Experience level",
          value: career.experienceLevel ? experienceLevelLabels[career.experienceLevel] : missing(),
        },
        {
          label: "Years of experience",
          value: career.yearsOfExperience ?? missing(),
        },
        {
          label: "Preferred work type",
          value:
            career.workArrangements.length > 0
              ? career.workArrangements.map((value) => workArrangementLabels[value]).join(", ")
              : missing(),
        },
      ]}
    />
  );
}

function GoalsView({ goals }: { goals: CandidateGoals }) {
  return (
    <Details
      rows={[
        { label: "Working toward", value: goals.goalPosition ?? missing() },
        {
          label: "Target companies or industries",
          value: goals.targetCompanies.length > 0 ? goals.targetCompanies.join(", ") : missing(),
        },
        {
          label: "Areas to improve",
          value:
            goals.areasToImprove.length > 0 ? (
              <ul className={styles.inlineList}>
                {goals.areasToImprove.map((area) => (
                  <li key={area}>{area}</li>
                ))}
              </ul>
            ) : (
              missing()
            ),
        },
      ]}
    />
  );
}

export interface ProfileContentProps {
  user: AuthUser;
  profile: CandidateProfile;
  completeness: ProfileCompleteness;
}

/** The profile page body: completeness, then one section per part of the profile. */
export function ProfileContent({ user, profile, completeness }: ProfileContentProps) {
  const { identity } = profile;
  const displayName = identity.fullName ?? user.name ?? user.email;

  return (
    <>
      <div className={styles.overview}>
        <CompletenessSummary completeness={completeness} limit={4} />
        <nav aria-label="Profile sections" className={styles.sectionNav}>
          <ul>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <EditableSection
        id="personal"
        title="Personal"
        description="How you appear in Oscar. Only you can see your profile."
        editLabel="personal details"
        view={
          <>
            <AvatarEditor name={displayName} avatarId={identity.avatarId} />
            <Details
              rows={[
                { label: "Full name", value: identity.fullName ?? missing() },
                { label: "Headline", value: identity.headline ?? missing() },
                { label: "Location", value: identity.location ?? missing() },
                { label: "Email", value: user.email },
                {
                  label: "Member since",
                  value: formatDate(user.createdAt) ?? missing("Not available"),
                },
              ]}
            />
          </>
        }
        form={<IdentityForm identity={{ ...identity, fullName: identity.fullName ?? user.name }} />}
      />

      <EditableSection
        id="career"
        title="Career"
        description="The role you are preparing for and where you are today."
        editLabel="career details"
        view={<CareerView career={profile.career} />}
        form={<CareerForm career={profile.career} />}
      />

      <EducationSection entries={profile.education} />
      <ExperienceSection entries={profile.experience} />
      <ProjectsSection entries={profile.projects} />
      <SkillsSection skills={profile.skills} />
      <CertificationsSection entries={profile.certifications} />

      <EditableSection
        id="goals"
        title="Goals"
        description="Where you want to go, and what you want to practice."
        editLabel="goals"
        view={<GoalsView goals={profile.goals} />}
        form={<GoalsForm goals={profile.goals} />}
      />
    </>
  );
}
