"use client";

import { CheckboxGroup, Input, Select, Textarea } from "@/components/ui";
import {
  WORK_ARRANGEMENTS,
  type CandidateCareer,
  type CandidateGoals,
  type CandidateIdentity,
} from "@/types/candidate";

import { saveCareerAction, saveGoalsAction, saveIdentityAction } from "../../actions";
import { experienceLevelOptions, workArrangementLabels } from "../../format";
import {
  limits,
  validateCareer,
  validateGoals,
  validateIdentity,
  type CareerField,
  type GoalsField,
  type IdentityField,
} from "../../validation";
import styles from "./profile.module.css";
import { ProfileForm } from "./profile-form";

const identityFields: readonly IdentityField[] = ["fullName", "headline", "location"];

export function IdentityForm({ identity }: { identity: CandidateIdentity }) {
  return (
    <ProfileForm
      label="Personal details"
      action={saveIdentityAction}
      validate={validateIdentity}
      fieldOrder={identityFields}
    >
      {({ errors, clear }) => (
        <>
          <Input
            name="fullName"
            label="Full name"
            autoComplete="name"
            maxLength={limits.name}
            defaultValue={identity.fullName ?? ""}
            error={errors.fullName}
            onChange={() => clear("fullName")}
          />
          <Input
            name="headline"
            label="Headline"
            description="One line about you, like “Backend engineer focused on payments”."
            maxLength={limits.headline}
            defaultValue={identity.headline ?? ""}
            error={errors.headline}
            onChange={() => clear("headline")}
          />
          <Input
            name="location"
            label="Location"
            description="City and country, if you want to share it."
            autoComplete="address-level2"
            maxLength={limits.location}
            defaultValue={identity.location ?? ""}
            error={errors.location}
            onChange={() => clear("location")}
          />
        </>
      )}
    </ProfileForm>
  );
}

const careerFields: readonly CareerField[] = [
  "targetRole",
  "targetIndustry",
  "experienceLevel",
  "yearsOfExperience",
  "workArrangements",
];

export function CareerForm({ career }: { career: CandidateCareer }) {
  return (
    <ProfileForm
      label="Career details"
      action={saveCareerAction}
      validate={validateCareer}
      fieldOrder={careerFields}
    >
      {({ errors, clear }) => (
        <>
          <Input
            name="targetRole"
            label="Target role"
            description="The role you are preparing to interview for."
            maxLength={limits.role}
            defaultValue={career.targetRole ?? ""}
            error={errors.targetRole}
            onChange={() => clear("targetRole")}
          />
          <Input
            name="targetIndustry"
            label="Target industry"
            maxLength={limits.industry}
            defaultValue={career.targetIndustry ?? ""}
            error={errors.targetIndustry}
            onChange={() => clear("targetIndustry")}
          />
          <div className={styles.fieldRow}>
            <Select
              name="experienceLevel"
              label="Experience level"
              placeholder="Not set"
              options={experienceLevelOptions}
              defaultValue={career.experienceLevel ?? ""}
              error={errors.experienceLevel}
              onChange={() => clear("experienceLevel")}
            />
            <Input
              name="yearsOfExperience"
              label="Years of experience"
              type="number"
              inputMode="numeric"
              min={0}
              max={limits.yearsOfExperience}
              step={1}
              defaultValue={career.yearsOfExperience ?? ""}
              error={errors.yearsOfExperience}
              onChange={() => clear("yearsOfExperience")}
            />
          </div>
          <CheckboxGroup
            legend="Preferred work type"
            name="workArrangements"
            orientation="horizontal"
            options={WORK_ARRANGEMENTS.map((value) => ({
              value,
              label: workArrangementLabels[value],
            }))}
            defaultValue={career.workArrangements}
            error={errors.workArrangements}
            onChange={() => clear("workArrangements")}
          />
        </>
      )}
    </ProfileForm>
  );
}

const goalsFields: readonly GoalsField[] = ["goalPosition", "targetCompanies", "areasToImprove"];

export function GoalsForm({ goals }: { goals: CandidateGoals }) {
  return (
    <ProfileForm
      label="Goals"
      action={saveGoalsAction}
      validate={validateGoals}
      fieldOrder={goalsFields}
    >
      {({ errors, clear }) => (
        <>
          <Input
            name="goalPosition"
            label="Position you are working toward"
            description="Where you want to be next, if different from your target role."
            maxLength={limits.role}
            defaultValue={goals.goalPosition ?? ""}
            error={errors.goalPosition}
            onChange={() => clear("goalPosition")}
          />
          <Textarea
            name="targetCompanies"
            label="Target companies or industries"
            description={`Separate with commas or new lines. Up to ${limits.companies}.`}
            rows={2}
            defaultValue={goals.targetCompanies.join(", ")}
            error={errors.targetCompanies}
            onChange={() => clear("targetCompanies")}
          />
          <Textarea
            name="areasToImprove"
            label="Areas to improve"
            description={`What you want to get better at, like “system design” or “telling stories about conflict”. One per line, up to ${limits.improvements}.`}
            rows={3}
            defaultValue={goals.areasToImprove.join("\n")}
            error={errors.areasToImprove}
            onChange={() => clear("areasToImprove")}
          />
        </>
      )}
    </ProfileForm>
  );
}
