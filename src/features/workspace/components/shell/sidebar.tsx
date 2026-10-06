import Link from "next/link";

import { OscarWordmark } from "@/components/oscar";

import { NavList } from "./nav-list";
import styles from "./sidebar.module.css";

/** Persistent navigation for wide screens (1024px and up). */
export function Sidebar() {
  return (
    <aside className={styles.sidebar} aria-label="Workspace sidebar">
      <div className={styles.inner}>
        <Link href="/dashboard" className={styles.brand} aria-label="Oscar overview">
          <OscarWordmark />
        </Link>
        <nav aria-label="Workspace" className={styles.nav}>
          <NavList />
        </nav>
        <p className={styles.note}>
          Oscar is in active development. New areas open here as they launch.
        </p>
      </div>
    </aside>
  );
}
