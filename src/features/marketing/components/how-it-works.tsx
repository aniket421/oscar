import { steps } from "../content";
import styles from "./how-it-works.module.css";
import { Section } from "./section";

export function HowItWorks() {
  return (
    <Section id="how-it-works" tone="subtle" eyebrow={steps.eyebrow} title={steps.title}>
      <ol className={styles.steps}>
        {steps.items.map((step) => (
          <li key={step.number} className={styles.step}>
            <span className={styles.number} aria-hidden="true">
              {step.number}
            </span>
            <h3 className={styles.title}>
              <span className="visually-hidden">Step {Number(step.number)}:</span> {step.title}
            </h3>
            <p className={styles.body}>{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
