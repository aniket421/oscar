import type { Metadata } from "next";
import { Suspense } from "react";

import { Avatar } from "@/components/ui";
import { ContentSkeleton, PageHeader } from "@/features/workspace";
import { getWorkspaceSnapshot } from "@/features/workspace/server";

import styles from "../account.module.css";

export const metadata: Metadata = { title: "Profile" };

function formatDate(iso: string | null): string {
  if (!iso) return "Not available";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

export default function ProfilePage() {
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Who you are to Oscar, and the preferences that shape your interviews."
      />
      <Suspense fallback={<ContentSkeleton label="Loading your profile" />}>
        <ProfileDetails />
      </Suspense>
    </div>
  );
}

async function ProfileDetails() {
  const { profile } = await getWorkspaceSnapshot("/profile");
  const displayName = profile.name ?? profile.email;

  return (
    <>
      <section aria-labelledby="profile-account" className={styles.section}>
        <div className={styles.sectionIntro}>
          <h2 id="profile-account" className={styles.sectionTitle}>
            Account
          </h2>
          <p className={styles.sectionText}>The details you signed up with.</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.identity}>
            <Avatar name={displayName} size="lg" />
            <div>
              <p className={styles.identityName}>{displayName}</p>
              <p className={styles.identityEmail}>{profile.email}</p>
            </div>
          </div>
          <dl className={styles.details}>
            <div>
              <dt>Name</dt>
              <dd>{profile.name ?? "Not provided"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{formatDate(profile.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="profile-preferences" className={styles.section}>
        <div className={styles.sectionIntro}>
          <h2 id="profile-preferences" className={styles.sectionTitle}>
            Interview preferences
          </h2>
          <p className={styles.sectionText}>
            Used to tailor questions to the role you want. You will set these during interview
            setup, which opens in a later update.
          </p>
        </div>
        <dl className={styles.details}>
          <div>
            <dt>Target role</dt>
            <dd>{profile.targetRole ?? "Not set"}</dd>
          </div>
          <div>
            <dt>Experience level</dt>
            <dd>{profile.experienceLevel ?? "Not set"}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
