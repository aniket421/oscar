import type { ResumeAnalysis, ResumeStatus } from "@/types/candidate";

import styles from "./resume.module.css";

const plannedContents = [
  "Strengths your resume shows clearly",
  "Skills your target role asks for that your resume does not mention",
  "How your experience lines up with the role",
  "Specific suggestions to improve it",
];

function AnalysisList({ title, items }: { title: string; items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <div className={styles.subsection}>
      <h3 className={styles.subTitle}>{title}</h3>
      <ul className={styles.bulletList}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The analysis area. Analysis is not built yet, so it explains what will appear and when;
 * nothing is invented in its place. Stored analyses (none exist yet) render as plain lists,
 * without scores.
 */
export function ResumeAnalysisPanel({
  status,
  analysis,
}: {
  status: ResumeStatus;
  analysis: ResumeAnalysis | null;
}) {
  return (
    <section aria-labelledby="resume-analysis" className={styles.block}>
      <h2 id="resume-analysis" className={styles.blockTitle}>
        Resume analysis
      </h2>
      {analysis ? (
        <>
          {analysis.roleAlignment ? (
            <p className={styles.blockText}>{analysis.roleAlignment}</p>
          ) : null}
          <AnalysisList title="Strengths" items={analysis.strengths} />
          <AnalysisList title="Skills to add for your target role" items={analysis.missingSkills} />
          <AnalysisList title="Experience gaps" items={analysis.experienceGaps} />
          <AnalysisList title="Quality" items={analysis.qualitySignals} />
          <AnalysisList title="Recommendations" items={analysis.recommendations} />
        </>
      ) : status === "uploaded" || status === "processing" ? (
        <p className={styles.placeholder}>Analysis will appear after processing.</p>
      ) : status === "failed" ? (
        <p className={styles.placeholder}>Analysis needs a resume Oscar can read.</p>
      ) : (
        <div className={styles.analysisPending}>
          <p className={styles.placeholder}>
            Resume analysis is in development. When it is ready, it will appear here with:
          </p>
          <ul className={styles.bulletList}>
            {plannedContents.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={styles.footnote}>Nothing is shown here until it is based on your resume.</p>
        </div>
      )}
    </section>
  );
}
