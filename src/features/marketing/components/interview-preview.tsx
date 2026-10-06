import { MicrophoneIcon } from "@/components/icons";
import { OscarPresence } from "@/components/oscar";
import { Badge, buttonStyles, Progress } from "@/components/ui";
import { cn } from "@/lib/cn";

import { preview } from "../content";
import styles from "./interview-preview.module.css";
import { Section } from "./section";

/**
 * Visual preview of the future interview screen. The mock UI is `inert`: it is
 * a picture, not a working interface, so it cannot be focused or operated, and
 * assistive technology gets the text summary instead.
 */
export function InterviewPreview() {
  return (
    <Section
      id="preview"
      eyebrow={preview.eyebrow}
      title={preview.title}
      description={preview.description}
    >
      <figure className={styles.figure}>
        <div className={styles.frame} data-theme="dark" inert>
          <div className={styles.topBar}>
            <div className={styles.session}>
              <span className={styles.sessionType}>{preview.interviewType}</span>
              <Badge tone="accent">Preview</Badge>
            </div>
            <div className={styles.progress}>
              <Progress label={preview.questionLabel} value={preview.progress} size="sm" />
            </div>
          </div>

          <div className={styles.body}>
            <div className={styles.main}>
              <div className={styles.speaker}>
                <OscarPresence state="speaking" size="lg" decorative />
                <div className={styles.speakerText}>
                  <span className={styles.speakerName}>Oscar</span>
                  <p className={styles.question}>{preview.question}</p>
                </div>
              </div>

              <div className={styles.answer}>
                <span className={styles.answerLabel}>{preview.answerLabel}</span>
                <p className={styles.answerText}>
                  {preview.answer}
                  <span className={styles.caret} />
                </p>
              </div>
            </div>

            <aside className={styles.rail}>
              <h3 className={styles.railTitle}>{preview.criteriaTitle}</h3>
              <ul className={styles.criteria}>
                {preview.criteria.map((item) => (
                  <li
                    key={item.label}
                    className={styles.criterion}
                    data-covered={item.covered || undefined}
                  >
                    <span className={styles.indicator} />
                    <span className={styles.criterionText}>
                      <span className={styles.criterionLabel}>{item.label}</span>
                      <span className={styles.criterionDetail}>{item.detail}</span>
                    </span>
                    <span className={styles.criterionState}>
                      {item.covered ? preview.coveredLabel : preview.pendingLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          <div className={styles.controls}>
            <span className={styles.mic}>
              <MicrophoneIcon size={18} />
            </span>
            <span className={buttonStyles({ variant: "outline", size: "sm" })}>Pause</span>
            <span className={cn(buttonStyles({ size: "sm" }), styles.finish)}>Finish answer</span>
          </div>
        </div>
        <figcaption className={styles.caption}>
          {preview.caption}
          <span className="visually-hidden">
            {" "}
            The preview shows Oscar asking: {preview.question} Below it is an example answer being
            transcribed, interview progress at {preview.questionLabel.toLowerCase()}, and the
            criteria Oscar listens for: {preview.criteria.map((item) => item.label).join(", ")}.
          </span>
        </figcaption>
      </figure>
    </Section>
  );
}
