import type { Metadata } from "next";
import { Suspense } from "react";

import { ResumeContent } from "@/features/candidate";
import { loadResumePage } from "@/features/candidate/server";
import { ContentSkeleton, PageHeader } from "@/features/workspace";

import styles from "../account.module.css";

export const metadata: Metadata = { title: "Resume" };

export default function ResumePage() {
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Workspace"
        title="Resume"
        description="Your resume, what Oscar found in it, and what your profile still needs."
      />
      <Suspense fallback={<ContentSkeleton label="Loading your resume" />}>
        <ResumeData />
      </Suspense>
    </div>
  );
}

async function ResumeData() {
  // Verifies the session (redirecting to login if needed) before loading anything.
  const { overview, profileSkillNames, completeness } = await loadResumePage("/resume");
  return (
    <ResumeContent
      overview={overview}
      profileSkillNames={profileSkillNames}
      completeness={completeness}
    />
  );
}
