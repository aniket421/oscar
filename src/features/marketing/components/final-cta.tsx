import Link from "next/link";

import { Container } from "@/components/layout/container";
import { OscarPresence } from "@/components/oscar";
import { buttonStyles } from "@/components/ui";

import { finalCta } from "../content";
import styles from "./final-cta.module.css";

export function FinalCta() {
  return (
    <section className={styles.section} aria-labelledby="cta-title">
      <Container>
        <div className={styles.panel} data-theme="dark">
          <OscarPresence state="idle" size="lg" decorative />
          <div className={styles.text}>
            <h2 id="cta-title" className="text-h2">
              {finalCta.title}
            </h2>
            <p className={styles.description}>{finalCta.description}</p>
          </div>
          <div className={styles.actions}>
            <Link href="/signup" className={buttonStyles({ size: "lg" })}>
              {finalCta.primary}
            </Link>
            <Link href="/login" className={buttonStyles({ size: "lg", variant: "outline" })}>
              {finalCta.secondary}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
