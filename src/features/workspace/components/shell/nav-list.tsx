"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";

import { cn } from "@/lib/cn";

import { isAvailable } from "../../availability";
import { isActiveHref, workspaceNavigation } from "../../navigation";
import { NavIcon } from "./nav-icon";
import styles from "./nav-list.module.css";

interface NavListProps {
  /** Called after a link is chosen (the mobile drawer closes itself). */
  onNavigate?: () => void;
}

/** Grouped workspace links. The current page is marked with `aria-current="page"`. */
export function NavList({ onNavigate }: NavListProps) {
  const pathname = usePathname();
  const idPrefix = useId();

  return (
    <div className={styles.groups}>
      {workspaceNavigation.map((group) => {
        const labelId = `${idPrefix}-${group.label}`;
        const later = group.capability !== undefined && !isAvailable(group.capability);
        return (
          <div key={group.label} className={styles.group}>
            <p id={labelId} className={styles.groupLabel}>
              {group.label}
              {later ? " " : null}
              {later ? <span className={styles.later}>Later</span> : null}
            </p>
            <ul className={styles.list} aria-labelledby={labelId}>
              {group.items.map((item) => {
                const active = isActiveHref(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(styles.link, active && styles.active)}
                      aria-current={active ? "page" : undefined}
                      onClick={onNavigate}
                    >
                      <NavIcon name={item.icon} size={18} className={styles.icon} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
