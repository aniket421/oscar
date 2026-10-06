import type { Metadata } from "next";
import { Suspense } from "react";

import { OscarStatus } from "@/components/oscar";
import { Heading, Text } from "@/components/ui";
import { requireUser } from "@/features/auth/server";

import styles from "./workspace.module.css";

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};

/**
 * Protected placeholder for the signed-in area. The dashboard is a later phase;
 * this page exists to prove the session and route protection end to end.
 */
export default function WorkspacePage() {
  return (
    <Suspense fallback={<OscarStatus state="thinking" title="Loading your workspace" live />}>
      <Workspace />
    </Suspense>
  );
}

async function Workspace() {
  const user = await requireUser("/app");
  const greeting = user.name ? `Welcome, ${user.name.split(" ")[0]}` : "Welcome to Oscar";

  return (
    <div className={styles.workspace}>
      <div className={styles.intro}>
        <Text variant="overline" className={styles.eyebrow}>
          Signed in
        </Text>
        <Heading as="h1" size="h1">
          {greeting}
        </Heading>
        <Text variant="lead">You are signed in as {user.email}. This is your Oscar workspace.</Text>
      </div>
      <div className={styles.status}>
        <OscarStatus
          state="idle"
          title="Your workspace is being built"
          description="Oscar is in active development. Interview practice, resume analysis, and reports will appear here once each one is ready to use."
        />
      </div>
    </div>
  );
}
