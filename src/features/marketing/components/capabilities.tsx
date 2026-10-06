import { Badge } from "@/components/ui";

import { capabilities } from "../content";
import styles from "./capabilities.module.css";
import { Section } from "./section";

export function Capabilities() {
  return (
    <Section
      id="capabilities"
      eyebrow={capabilities.eyebrow}
      title={capabilities.title}
      description={capabilities.description}
      actions={
        <p className={styles.status}>
          <Badge tone="warning">{capabilities.status}</Badge>
          <span>{capabilities.statusNote}</span>
        </p>
      }
    >
      <ul className={styles.grid}>
        {capabilities.items.map((item) => (
          <li key={item.title} className={styles.item}>
            <h3 className={styles.title}>{item.title}</h3>
            <p className={styles.body}>{item.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
