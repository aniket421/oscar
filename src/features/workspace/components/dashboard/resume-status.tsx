import Link from "next/link";

import { DocumentIcon } from "@/components/icons";
import { Badge } from "@/components/ui";
import type { Resume } from "@/types/domain";

import { emptyStates } from "../../content";
import { AreaEmptyState } from "../area-empty-state";
import { DashboardSection } from "./dashboard-section";
import styles from "./side-panels.module.css";

const statusLabels: Record<
  Resume["status"],
  { label: string; tone: "neutral" | "success" | "error" }
> = {
  processing: { label: "Processing", tone: "neutral" },
  ready: { label: "Ready", tone: "success" },
  failed: { label: "Could not be read", tone: "error" },
};

export function ResumeStatus({ resume }: { resume: Resume | null }) {
  return (
    <DashboardSection
      id="resume-status"
      title="Resume"
      link={resume ? { href: "/resume", label: "Manage" } : undefined}
    >
      {resume ? (
        <div className={styles.resume}>
          <span className={styles.fileName}>{resume.fileName}</span>
          <Badge tone={statusLabels[resume.status].tone}>{statusLabels[resume.status].label}</Badge>
        </div>
      ) : (
        <AreaEmptyState
          copy={emptyStates.resume}
          visual={<DocumentIcon size={20} />}
          action={
            <Link href="/resume" className={styles.textLink}>
              About resume analysis
            </Link>
          }
        />
      )}
    </DashboardSection>
  );
}
