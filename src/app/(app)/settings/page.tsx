import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LogoutButton } from "@/features/auth";
import { ContentSkeleton, PageHeader } from "@/features/workspace";
import { getWorkspaceSnapshot } from "@/features/workspace/server";

import styles from "../account.module.css";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your account, session, and privacy."
      />
      <Suspense fallback={<ContentSkeleton label="Loading your settings" />}>
        <SettingsSections />
      </Suspense>
    </div>
  );
}

async function SettingsSections() {
  const { profile } = await getWorkspaceSnapshot("/settings");

  return (
    <>
      <section aria-labelledby="settings-account" className={styles.section}>
        <div className={styles.sectionIntro}>
          <h2 id="settings-account" className={styles.sectionTitle}>
            Account
          </h2>
          <p className={styles.sectionText}>
            Changing your email or password from here is not available yet. To delete your account
            and its information, <Link href="/contact">contact us</Link>.
          </p>
        </div>
        <dl className={styles.details}>
          <div>
            <dt>Email</dt>
            <dd>{profile.email}</dd>
          </div>
          <div>
            <dt>Sign-in method</dt>
            <dd>Email and password</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="settings-session" className={styles.section}>
        <div className={styles.sectionIntro}>
          <h2 id="settings-session" className={styles.sectionTitle}>
            Session
          </h2>
          <p className={styles.sectionText}>Log out of Oscar on this device.</p>
        </div>
        <div className={styles.sectionBody}>
          <LogoutButton />
        </div>
      </section>

      <section aria-labelledby="settings-privacy" className={styles.section}>
        <div className={styles.sectionIntro}>
          <h2 id="settings-privacy" className={styles.sectionTitle}>
            Privacy
          </h2>
          <p className={styles.sectionText}>How your information is collected and used.</p>
        </div>
        <ul className={styles.links}>
          <li>
            <Link href="/privacy">Privacy Policy</Link>
          </li>
          <li>
            <Link href="/terms">Terms &amp; Conditions</Link>
          </li>
        </ul>
      </section>
    </>
  );
}
