import Link from "next/link";

import { RouteIcon } from "@/components/icons";
import type { Roadmap } from "@/types/domain";

import { emptyStates } from "../../content";
import { AreaEmptyState } from "../area-empty-state";
import { DashboardSection } from "./dashboard-section";
import styles from "./side-panels.module.css";

const PREVIEW_STEPS = 3;

export function RoadmapPreview({ roadmap }: { roadmap: Roadmap | null }) {
  return (
    <DashboardSection
      id="roadmap-preview"
      title="Roadmap"
      link={roadmap ? { href: "/roadmap", label: "Open roadmap" } : undefined}
    >
      {roadmap && roadmap.steps.length > 0 ? (
        <ol className={styles.steps}>
          {roadmap.steps.slice(0, PREVIEW_STEPS).map((step) => (
            <li key={step.id}>
              <span className={styles.stepTitle}>{step.title}</span>
              <span className={styles.stepState}>{step.status === "done" ? "Done" : "To do"}</span>
            </li>
          ))}
        </ol>
      ) : (
        <AreaEmptyState
          copy={emptyStates.roadmap}
          visual={<RouteIcon size={20} />}
          action={
            <Link href="/roadmap" className={styles.textLink}>
              About your roadmap
            </Link>
          }
        />
      )}
    </DashboardSection>
  );
}
