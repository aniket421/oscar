import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfileContent } from "@/features/candidate";
import { loadProfilePage } from "@/features/candidate/server";
import { ContentSkeleton, PageHeader } from "@/features/workspace";

import styles from "../account.module.css";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="What Oscar knows about you. Everything here is yours to add, change, or remove, and nothing is filled in for you."
      />
      <Suspense fallback={<ContentSkeleton label="Loading your profile" />}>
        <ProfileData />
      </Suspense>
    </div>
  );
}

async function ProfileData() {
  // Verifies the session (redirecting to login if needed) before loading anything.
  const { user, profile, completeness } = await loadProfilePage("/profile");
  return <ProfileContent user={user} profile={profile} completeness={completeness} />;
}
