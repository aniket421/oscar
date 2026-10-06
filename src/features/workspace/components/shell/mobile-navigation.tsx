"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MenuIcon } from "@/components/icons";
import { OscarWordmark } from "@/components/oscar";
import { buttonStyles, Drawer, IconButton } from "@/components/ui";

import styles from "./mobile-navigation.module.css";
import { NavList } from "./nav-list";

const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Navigation for screens below 1024px: a menu button that opens a modal drawer
 * (focus trapped, Escape closes, focus returns to the button).
 */
export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  // If the window grows past the breakpoint, the sidebar takes over.
  useEffect(() => {
    if (!open) return;
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => {
      if (query.matches) setOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className={styles.mobile}>
      <IconButton
        label="Open menu"
        icon={<MenuIcon size={20} />}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      />
      <Drawer
        open={open}
        onOpenChange={setOpen}
        label="Workspace navigation"
        header={
          <Link
            href="/dashboard"
            className={styles.brand}
            onClick={close}
            aria-label="Oscar overview"
          >
            <OscarWordmark />
          </Link>
        }
      >
        <nav aria-label="Workspace" className={styles.nav}>
          <NavList onNavigate={close} />
        </nav>
        <Link
          href="/interviews/new"
          className={buttonStyles({ fullWidth: true, className: styles.start })}
          onClick={close}
        >
          Start an interview
        </Link>
      </Drawer>
    </div>
  );
}
