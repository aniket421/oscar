import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { OscarPresence } from "@/components/oscar";
import { buttonStyles } from "@/components/ui";
import {
  AreaEmptyState,
  ContentSkeleton,
  emptyStates,
  InterviewList,
  PageHeader,
} from "@/features/workspace";
import { getWorkspaceSnapshot } from "@/features/workspace/server";

import styles from "./interviews.module.css";

export const metadata: Metadata = { title: "Interviews" };

export default function InterviewsPage() {
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Workspace"
        title="Interviews"
        description="Your mock interviews and the reports that follow each one."
        actions={
          <Link href="/interviews/new" className={buttonStyles()}>
            Start an interview
          </Link>
        }
      />
      <section aria-label="Interview history" className={styles.region}>
        <Suspense fallback={<ContentSkeleton label="Loading your interviews" />}>
          <InterviewHistory />
        </Suspense>
      </section>
    </div>
  );
}

async function InterviewHistory() {
  const { recentInterviews } = await getWorkspaceSnapshot("/interviews");
  if (recentInterviews.length > 0) return <InterviewList interviews={recentInterviews} />;
  return (
    <AreaEmptyState
      size="page"
      headingLevel="h2"
      copy={emptyStates.interviews}
      visual={<OscarPresence size="md" decorative />}
      action={
        <Link href="/interviews/new" className={buttonStyles({ variant: "outline" })}>
          See what interview setup includes
        </Link>
      }
    />
  );
}
