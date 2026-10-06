import type { ComponentType } from "react";

import {
  CheckIcon,
  CodeIcon,
  ConversationIcon,
  DocumentIcon,
  FeedbackIcon,
  MicrophoneIcon,
  RouteIcon,
  type IconProps,
} from "@/components/icons";

import { features, type FeatureIcon } from "../content";
import styles from "./feature-grid.module.css";
import { Section } from "./section";

const icons: Record<FeatureIcon, ComponentType<IconProps>> = {
  resume: DocumentIcon,
  practice: MicrophoneIcon,
  technical: CodeIcon,
  behavioral: ConversationIcon,
  feedback: FeedbackIcon,
  roadmap: RouteIcon,
};

export function FeatureGrid() {
  return (
    <Section id="features" eyebrow={features.eyebrow} title={features.title}>
      <ul className={styles.grid}>
        {features.items.map((feature) => {
          const Icon = icons[feature.icon];
          return (
            <li key={feature.title} className={styles.card}>
              <span className={styles.icon}>
                <Icon size={20} />
              </span>
              <h3 className={styles.title}>{feature.title}</h3>
              <p className={styles.body}>{feature.body}</p>
              <ul className={styles.points}>
                {feature.points.map((point) => (
                  <li key={point}>
                    <CheckIcon size={16} className={styles.check} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
