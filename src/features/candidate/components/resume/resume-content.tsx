import Link from "next/link";

import { OscarPresence } from "@/components/oscar";
import { EmptyState } from "@/components/ui";
import type { ResumeOverview } from "@/types/candidate";

import type { ProfileCompleteness } from "../../completeness";
import { CompletenessSummary } from "../completeness-summary";
import { CurrentResume } from "./current-resume";
import { ResumeAnalysisPanel } from "./resume-analysis";
import { ResumeFindings } from "./resume-findings";
import styles from "./resume.module.css";
import { ResumeUploader } from "./resume-uploader";

export interface ResumeContentProps {
  overview: ResumeOverview | null;
  profileSkillNames: readonly string[];
  completeness: ProfileCompleteness;
}

function PrivacyNote() {
  return (
    <section aria-labelledby="resume-privacy" className={styles.sideBlock}>
      <h2 id="resume-privacy" className={styles.sideTitle}>
        How Oscar handles your resume
      </h2>
      <ul className={styles.bulletList}>
        <li>Stored privately. Only your account can open it.</li>
        <li>Read on Oscar&apos;s own servers. Not sent to other services.</li>
        <li>The full text is not kept after reading.</li>
        <li>Delete it at any time; everything found in it goes too.</li>
      </ul>
      <p className={styles.footnote}>
        <Link href="/privacy#resumes" className={styles.link}>
          Privacy Policy
        </Link>
      </p>
    </section>
  );
}

/** The resume page body: the current resume (or an upload state), findings, and analysis. */
export function ResumeContent({ overview, profileSkillNames, completeness }: ResumeContentProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        {overview ? (
          <>
            <CurrentResume resume={overview.resume} />
            <ResumeFindings overview={overview} profileSkillNames={profileSkillNames} />
            <ResumeAnalysisPanel status={overview.resume.status} analysis={overview.analysis} />
          </>
        ) : (
          <EmptyState
            size="page"
            headingLevel="h2"
            visual={<OscarPresence size="md" decorative />}
            title="No resume yet"
            description="Upload your resume and Oscar will read it to find your contact details, sections, and skills."
            reason="Interviewers ask about what is on your resume, so your practice should start there too."
            next="Upload a PDF or Word file up to 5 MB. You can replace or delete it at any time."
            action={<ResumeUploader />}
          />
        )}
      </div>
      <div className={styles.side}>
        <div className={styles.sideBlock}>
          <CompletenessSummary completeness={completeness} />
        </div>
        <PrivacyNote />
      </div>
    </div>
  );
}
