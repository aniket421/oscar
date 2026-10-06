import Link from "next/link";
import type { ReactNode } from "react";

import { OscarPresence, OscarWordmark } from "@/components/oscar";

import styles from "./auth-shell.module.css";

/** Split layout for authentication pages: brand panel on wide screens, form column always. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.brand} data-theme="dark" aria-label="About Oscar">
        <Link href="/" className={styles.brandLink} aria-label="Oscar home">
          <OscarWordmark />
        </Link>
        <div className={styles.brandStage}>
          <OscarPresence state="listening" size="xl" decorative />
          <p className={styles.brandLine}>Practice the interview before it counts.</p>
        </div>
        <p className={styles.brandFootnote}>
          Oscar is an interview preparation and coaching platform.
        </p>
      </aside>

      <div className={styles.column}>
        <header className={styles.mobileHeader}>
          <Link href="/" aria-label="Oscar home">
            <OscarWordmark />
          </Link>
        </header>
        <main className={styles.main}>{children}</main>
        <footer className={styles.footer}>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
        </footer>
      </div>
    </div>
  );
}

interface AuthPanelProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthPanel({ title, description, children, footer }: AuthPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h1 className="text-h2">{title}</h1>
        <p className="text-body text-muted">{description}</p>
      </div>
      {children}
      {footer ? <p className={styles.panelFooter}>{footer}</p> : null}
    </div>
  );
}
