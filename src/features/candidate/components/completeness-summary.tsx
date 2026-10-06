import Link from "next/link";

import { Progress } from "@/components/ui";

import type { ProfileCompleteness } from "../completeness";
import styles from "./completeness-summary.module.css";

export interface CompletenessSummaryProps {
  completeness: ProfileCompleteness;
  /** How many missing items to list. */
  limit?: number;
  headingLevel?: "h2" | "h3";
}

/**
 * Profile completeness as a checklist count with the next steps. It is computed from stored
 * data on every render, and it says plainly that it is not a rating.
 */
export function CompletenessSummary({
  completeness,
  limit = 3,
  headingLevel: Heading = "h2",
}: CompletenessSummaryProps) {
  const { completed, total, percent, missing } = completeness;
  const next = missing.slice(0, limit);

  return (
    <section aria-labelledby="profile-completeness" className={styles.summary}>
      <Heading id="profile-completeness" className={styles.title}>
        Profile completeness
      </Heading>
      <Progress label={`${completed} of ${total} complete`} value={percent} showValue size="sm" />
      <p className={styles.note}>
        Counts what you have added to your profile and resume. It is not a rating of you.
      </p>
      {next.length > 0 ? (
        <div>
          <p className={styles.nextLabel}>Next steps</p>
          <ul className={styles.list}>
            {next.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className={styles.link}>
                  {item.action}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={styles.done}>Your profile has everything Oscar asks for.</p>
      )}
    </section>
  );
}
