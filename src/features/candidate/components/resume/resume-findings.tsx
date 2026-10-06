import Link from "next/link";

import type { ResumeOverview } from "@/types/candidate";

import { joinParts, resumeSectionLabels } from "../../format";
import styles from "./resume.module.css";
import { ResumeSkillsForm } from "./resume-skills-form";

function linkLabel(href: string): string {
  try {
    const url = new URL(href);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return href;
  }
}

export interface ResumeFindingsProps {
  overview: ResumeOverview;
  profileSkillNames: readonly string[];
}

/**
 * What the parser extracted, labelled as coming from the resume. Shown for review only:
 * nothing here changes the profile unless the candidate adds skills themselves.
 */
export function ResumeFindings({ overview, profileSkillNames }: ResumeFindingsProps) {
  const { resume, parse } = overview;

  return (
    <section aria-labelledby="resume-findings" className={styles.block}>
      <div className={styles.blockHeading}>
        <h2 id="resume-findings" className={styles.blockTitle}>
          What Oscar found
        </h2>
        <p className={styles.blockText}>
          Read automatically from your resume. Check it before relying on it; your profile only
          changes when you choose.
        </p>
      </div>

      {!parse ? (
        <p className={styles.placeholder}>
          {resume.status === "failed"
            ? "Nothing was extracted from this file."
            : "Findings will appear after processing."}
        </p>
      ) : (
        <>
          <dl className={styles.facts}>
            <div>
              <dt>Email</dt>
              <dd>{parse.email ?? <span className={styles.notFound}>Not found</span>}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{parse.phone ?? <span className={styles.notFound}>Not found</span>}</dd>
            </div>
            <div>
              <dt>Links</dt>
              <dd>
                {parse.links.length > 0 ? (
                  <ul className={styles.plainList}>
                    {parse.links.map((link) => (
                      <li key={link}>
                        <a href={link} rel="noopener noreferrer nofollow" className={styles.link}>
                          {linkLabel(link)}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className={styles.notFound}>None found</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Sections</dt>
              <dd>
                {parse.detectedSections.length > 0 ? (
                  parse.detectedSections.map((section) => resumeSectionLabels[section]).join(", ")
                ) : (
                  <span className={styles.notFound}>No standard headings found</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Length</dt>
              <dd>
                {joinParts([
                  parse.pageCount !== null
                    ? `${parse.pageCount} ${parse.pageCount === 1 ? "page" : "pages"}`
                    : null,
                  `${parse.wordCount.toLocaleString("en-US")} words`,
                ])}
              </dd>
            </div>
          </dl>

          {parse.summary ? (
            <div className={styles.subsection}>
              <h3 className={styles.subTitle}>Summary</h3>
              <blockquote className={styles.quote}>{parse.summary}</blockquote>
            </div>
          ) : null}

          <div className={styles.subsection}>
            <h3 className={styles.subTitle}>Skills mentioned</h3>
            {parse.skillNames.length > 0 ? (
              <ResumeSkillsForm
                resumeId={resume.id}
                skillNames={parse.skillNames}
                profileSkillNames={profileSkillNames}
              />
            ) : (
              <p className={styles.placeholder}>
                Oscar did not recognize any skills from its catalog. You can add skills to your
                profile yourself.
              </p>
            )}
          </div>

          <p className={styles.footnote}>
            Oscar does not extract work history, education, projects, or certifications yet.{" "}
            <Link href="/profile" className={styles.link}>
              Add them to your profile
            </Link>{" "}
            so practice can use them.
          </p>
        </>
      )}
    </section>
  );
}
