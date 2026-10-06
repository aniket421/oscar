"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { CloseIcon, MenuIcon } from "@/components/icons";
import { IconButton } from "@/components/ui";

import styles from "./site-header.module.css";

interface MobileNavProps {
  items: ReadonlyArray<{ label: string; href: string }>;
}

/** Disclosure menu for narrow screens. Escape closes it and returns focus to the toggle. */
export function MobileNav({ items }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        document.getElementById(toggleId)?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, toggleId]);

  return (
    <div className={styles.mobile}>
      <IconButton
        id={toggleId}
        label={open ? "Close menu" : "Open menu"}
        icon={open ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      />
      <nav id={panelId} aria-label="Mobile" className={styles.panel} hidden={!open}>
        <ul className={styles.panelList}>
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={styles.panelLink} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            </li>
          ))}
          <li className={styles.panelDivider}>
            <Link href="/login" className={styles.panelLink} onClick={() => setOpen(false)}>
              Log in
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
