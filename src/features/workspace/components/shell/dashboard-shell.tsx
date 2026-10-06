import type { ReactNode } from "react";

import { AppHeader } from "./app-header";
import styles from "./dashboard-shell.module.css";
import { Sidebar } from "./sidebar";

/**
 * The signed-in application frame: sidebar (wide screens), header, and the
 * page content area. Session reads inside stream behind Suspense boundaries.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a href="#workspace-main" className={styles.skipLink}>
        Skip to content
      </a>
      <Sidebar />
      <div className={styles.column}>
        <AppHeader />
        <main id="workspace-main" tabIndex={-1} className={styles.main}>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </div>
  );
}
