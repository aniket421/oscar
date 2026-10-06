import Link from "next/link";
import { Suspense } from "react";

import { OscarWordmark } from "@/components/oscar";
import { buttonStyles, Skeleton } from "@/components/ui";

import styles from "./app-header.module.css";
import { getAccountSummary } from "../../server";
import { CurrentSection } from "./current-section";
import { MobileNavigation } from "./mobile-navigation";
import { ProfileMenu } from "./profile-menu";

/** Top bar: navigation access on small screens, context, primary action, account menu. */
export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.start}>
        <MobileNavigation />
        <Link href="/dashboard" className={styles.mobileBrand} aria-label="Oscar overview">
          <OscarWordmark />
        </Link>
        <CurrentSection />
      </div>
      <div className={styles.end}>
        <Link
          href="/interviews/new"
          className={buttonStyles({ size: "sm", className: styles.startInterview })}
        >
          Start interview
        </Link>
        <Suspense fallback={<Skeleton shape="circle" className={styles.avatarSkeleton} />}>
          <AccountMenu />
        </Suspense>
      </div>
    </header>
  );
}

async function AccountMenu() {
  const account = await getAccountSummary();
  if (!account) return null;
  return (
    <ProfileMenu
      displayName={account.displayName}
      email={account.email}
      avatarSrc={account.avatarSrc ?? undefined}
    />
  );
}
