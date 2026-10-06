import Link from "next/link";

import { OscarWordmark } from "@/components/oscar";
import { buttonStyles } from "@/components/ui";

import { navigation } from "../content";
import { MobileNav } from "./mobile-nav";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="Oscar home">
          <OscarWordmark />
        </Link>

        <nav aria-label="Main" className={styles.nav}>
          <ul className={styles.navList}>
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.navLink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <Link
            href="/login"
            className={buttonStyles({ variant: "ghost", size: "sm", className: styles.login })}
          >
            Log in
          </Link>
          <Link href="/signup" className={buttonStyles({ size: "sm" })}>
            Get started
          </Link>
          <MobileNav items={navigation} />
        </div>
      </div>
    </header>
  );
}
