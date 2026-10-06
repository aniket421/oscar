import type { WorkspaceSnapshot } from "../../data/snapshot";
import styles from "./dashboard.module.css";
import { PreparationOverview } from "./preparation-overview";
import { RecentInterviews } from "./recent-interviews";
import { ResumeStatus } from "./resume-status";
import { RoadmapPreview } from "./roadmap-preview";
import { SkillProgress } from "./skill-progress";
import { StartInterviewCard } from "./start-interview-card";
import { WelcomeSection } from "./welcome-section";

/** /dashboard: "Where am I in my interview preparation?" Built only from stored data. */
export function DashboardOverview({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  return (
    <div className={styles.layout}>
      <WelcomeSection profile={snapshot.profile} />
      <StartInterviewCard />
      <div className={styles.columns}>
        <div className={styles.column}>
          <PreparationOverview snapshot={snapshot} />
          <RecentInterviews interviews={snapshot.recentInterviews} />
          <SkillProgress practice={snapshot.practice} />
        </div>
        <div className={styles.column}>
          <ResumeStatus resume={snapshot.resume} />
          <RoadmapPreview roadmap={snapshot.roadmap} />
        </div>
      </div>
    </div>
  );
}
