import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Badge, buttonStyles } from "@/components/ui";
import { ContentSkeleton, interviewSetup, isAvailable, PageHeader } from "@/features/workspace";
import { getWorkspaceSnapshot } from "@/features/workspace/server";

import styles from "./setup.module.css";

export const metadata: Metadata = { title: "Set up an interview" };

/**
 * Placeholder for interview configuration (a later phase). It explains what
 * setup will include and never pretends an interview has started.
 */
export default function InterviewSetupPage() {
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Interviews"
        status={
          isAvailable("interviews") ? undefined : <Badge tone="warning">In development</Badge>
        }
        title={interviewSetup.title}
        description={interviewSetup.description}
      />
      <Suspense fallback={<ContentSkeleton label="Loading interview setup" />}>
        <SetupPreview />
      </Suspense>
    </div>
  );
}

async function SetupPreview() {
  // Verify the session even though nothing user-specific renders yet.
  await getWorkspaceSnapshot("/interviews/new");
  return (
    <>
      <section aria-labelledby="setup-choices" className={styles.region}>
        <h2 id="setup-choices" className={styles.heading}>
          What you will choose
        </h2>
        <dl className={styles.choices}>
          {interviewSetup.choices.map((choice, index) => (
            <div key={choice.label} className={styles.choice}>
              <dt>
                <span className={styles.index} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {choice.label}
              </dt>
              <dd>{choice.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className={styles.footer}>
        <p className={styles.note}>{interviewSetup.note}</p>
        <Link href="/dashboard" className={buttonStyles({ variant: "outline" })}>
          Back to overview
        </Link>
      </div>
    </>
  );
}
