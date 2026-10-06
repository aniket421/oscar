import type { Interview } from "@/types/domain";

import styles from "./interview-list.module.css";

const typeLabels: Record<Interview["config"]["type"], string> = {
  behavioral: "Behavioral",
  technical: "Technical",
  coding: "Coding",
  mixed: "Mixed",
};

const statusLabels: Record<Interview["status"], string> = {
  draft: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Ended early",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

/** Stored interviews, newest first. Renders only real records. */
export function InterviewList({ interviews }: { interviews: readonly Interview[] }) {
  return (
    <ul className={styles.list}>
      {interviews.map((interview) => (
        <li key={interview.id} className={styles.row}>
          <div className={styles.text}>
            <span className={styles.role}>{interview.config.role}</span>
            <span className={styles.meta}>
              {typeLabels[interview.config.type]} ·{" "}
              <time dateTime={interview.createdAt}>{formatDate(interview.createdAt)}</time>
            </span>
          </div>
          <span className={styles.status}>{statusLabels[interview.status]}</span>
        </li>
      ))}
    </ul>
  );
}
