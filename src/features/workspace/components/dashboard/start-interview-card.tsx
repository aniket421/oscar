import Link from "next/link";

import { ArrowRightIcon } from "@/components/icons";
import { OscarPresence } from "@/components/oscar";
import { buttonStyles } from "@/components/ui";

import { isAvailable } from "../../availability";
import styles from "./start-interview-card.module.css";

/** The workspace's primary action. Leads to interview setup; never starts anything by itself. */
export function StartInterviewCard() {
  const ready = isAvailable("interviews");
  return (
    <section className={styles.card} data-theme="dark" aria-labelledby="start-interview-title">
      <OscarPresence state="idle" size="lg" decorative className={styles.presence} />
      <div className={styles.text}>
        <h2 id="start-interview-title" className={styles.title}>
          Start a mock interview
        </h2>
        <p className={styles.description}>
          Choose a role, level, and format, then practice with Oscar.
          {ready ? null : " Interview setup is being built; you can see what it will include."}
        </p>
      </div>
      <Link
        href="/interviews/new"
        className={buttonStyles({ size: "lg", className: styles.action })}
      >
        Start an interview
        <ArrowRightIcon />
      </Link>
    </section>
  );
}
