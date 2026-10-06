import Link from "next/link";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { OscarWordmark } from "@/components/oscar";
import { LogoutButton } from "@/features/auth";
import { getCurrentUser } from "@/features/auth/server";

import styles from "./app-shell.module.css";

/** Signed-in area shell. Session reads stream in behind Suspense boundaries. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Container>
          <div className={styles.headerInner}>
            <Link href="/app" className={styles.home} aria-label="Oscar workspace">
              <OscarWordmark />
            </Link>
            <Suspense fallback={null}>
              <AccountControls />
            </Suspense>
          </div>
        </Container>
      </header>
      <Container as="main" id="main" className={styles.main}>
        {children}
      </Container>
    </div>
  );
}

async function AccountControls() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className={styles.account}>
      <span className={styles.email} title={user.email}>
        {user.email}
      </span>
      <LogoutButton />
    </div>
  );
}
