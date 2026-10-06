import Link from "next/link";

import type { PracticeKind } from "@/types/domain";

import { isAvailable } from "../../availability";
import type { WorkspaceSnapshot } from "../../data/snapshot";
import { DashboardSection } from "./dashboard-section";
import styles from "./skill-progress.module.css";

const areas: Array<{ kind: PracticeKind; label: string; href: string; detail: string }> = [
  {
    kind: "technical",
    label: "Technical",
    href: "/practice/technical",
    detail: "Reasoning through role-specific questions",
  },
  {
    kind: "behavioral",
    label: "Behavioral",
    href: "/practice/behavioral",
    detail: "Structured stories about your experience",
  },
  {
    kind: "coding",
    label: "Coding",
    href: "/practice/coding",
    detail: "Solving problems while explaining your approach",
  },
];

/** Practice activity per skill area, counted from stored sessions only. */
export function SkillProgress({ practice }: { practice: WorkspaceSnapshot["practice"] }) {
  const available = isAvailable("practice");
  return (
    <DashboardSection id="skill-development" title="Skill development">
      <p className={styles.intro}>
        Skill development shows how much you have practiced each kind of question, so you can see
        where to focus. {available ? null : "Practice opens in a later update."}
      </p>
      <ul className={styles.list}>
        {areas.map((area) => {
          const completed = practice[area.kind].filter((session) => session.completedAt).length;
          return (
            <li key={area.kind} className={styles.row}>
              <div className={styles.text}>
                <Link href={area.href} className={styles.label}>
                  {area.label}
                </Link>
                <span className={styles.detail}>{area.detail}</span>
              </div>
              <div className={styles.status}>
                {completed > 0 ? (
                  <span className={styles.count}>
                    {completed} {completed === 1 ? "session" : "sessions"}
                  </span>
                ) : (
                  <span className={styles.none}>No practice yet</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </DashboardSection>
  );
}
