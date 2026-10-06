import Link from "next/link";

import { ArrowRightIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { buttonStyles } from "@/components/ui";

import { hero } from "../content";
import styles from "./hero.module.css";
import { OscarStage } from "./oscar-stage";

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <Container>
        <div className={styles.grid}>
          <div className={styles.copy}>
            <p className={`text-overline ${styles.eyebrow}`}>{hero.eyebrow}</p>
            <h1 id="hero-title" className={`text-display ${styles.title}`}>
              {hero.title}
            </h1>
            <p className={styles.description}>{hero.description}</p>
            <div className={styles.actions}>
              <Link
                href="/signup"
                className={buttonStyles({ size: "lg" })}
                aria-describedby="hero-status"
              >
                {hero.primaryCta}
                <ArrowRightIcon />
              </Link>
              <Link
                href="/#how-it-works"
                className={buttonStyles({ size: "lg", variant: "outline" })}
              >
                {hero.secondaryCta}
              </Link>
            </div>
            <p id="hero-status" className={styles.status}>
              <span className={styles.statusDot} aria-hidden="true" />
              <span>
                {hero.status}{" "}
                <Link href="/#capabilities" className={styles.statusLink}>
                  {hero.statusLink}
                </Link>
              </span>
            </p>
          </div>
          <OscarStage />
        </div>
      </Container>
    </section>
  );
}
