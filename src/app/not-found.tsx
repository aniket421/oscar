import type { Metadata } from "next";
import Link from "next/link";

import { OscarStatus, OscarWordmark } from "@/components/oscar";
import { buttonStyles } from "@/components/ui";

import styles from "./not-found.module.css";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Oscar home">
          <OscarWordmark />
        </Link>
      </header>
      <main className={styles.main}>
        <h1 className="visually-hidden">Page not found</h1>
        <OscarStatus
          state="idle"
          title="This page does not exist"
          description="The link may be out of date, or the address may have a typo."
          actions={
            <>
              <Link href="/" className={buttonStyles()}>
                Go to the home page
              </Link>
              <Link href="/dashboard" className={buttonStyles({ variant: "outline" })}>
                Open your workspace
              </Link>
            </>
          }
        />
      </main>
    </div>
  );
}
