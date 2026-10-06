import { cacheLife } from "next/cache";
import Link from "next/link";

import { OscarWordmark } from "@/components/oscar";

import { footer } from "../content";
import styles from "./site-footer.module.css";

/** Cached so the static shell can include the current year without a request-time read. */
async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link href="/" className={styles.brandLink} aria-label="Oscar home">
            <OscarWordmark />
          </Link>
          <p className={styles.tagline}>{footer.tagline}</p>
        </div>

        <nav aria-label="Footer" className={styles.columns}>
          {footer.columns.map((column) => (
            <div key={column.title} className={styles.column}>
              <h2 className={styles.columnTitle}>{column.title}</h2>
              <ul className={styles.links}>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={styles.link}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className={styles.bottom}>
        <p>
          &copy; <CopyrightYear /> Oscar. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
