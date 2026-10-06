import Link from "next/link";

import { CheckIcon } from "@/components/icons";
import { Badge } from "@/components/ui";

import type { WorkspaceSnapshot } from "../../data/snapshot";
import { derivePreparationSteps } from "../../preparation";
import { DashboardSection } from "./dashboard-section";
import styles from "./preparation-overview.module.css";

/** The preparation loop with this user's real position in it. */
export function PreparationOverview({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const steps = derivePreparationSteps(snapshot);
  const completed = steps.filter((step) => step.state === "complete").length;
  const anyUnavailable = steps.some((step) => !step.available);

  return (
    <DashboardSection id="preparation" title="Your preparation path">
      <p className={styles.summary}>
        {completed === 0
          ? "You have not started yet. These are the steps Oscar will guide you through."
          : `${completed} of ${steps.length} steps complete.`}
        {anyUnavailable ? " Each step opens as its feature launches." : null}
      </p>
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li key={step.id} className={styles.step} data-state={step.state}>
            <span className={styles.marker} aria-hidden="true">
              {step.state === "complete" ? <CheckIcon size={14} strokeWidth={2.5} /> : index + 1}
            </span>
            <div className={styles.body}>
              <Link href={step.href} className={styles.title}>
                {step.title}
              </Link>
              <p className={styles.description}>{step.description}</p>
            </div>
            <div className={styles.status}>
              {step.state === "complete" ? (
                <Badge tone="success">Complete</Badge>
              ) : (
                <span className={styles.notStarted}>Not started</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </DashboardSection>
  );
}
