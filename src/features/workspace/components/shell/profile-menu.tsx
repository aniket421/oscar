"use client";

import { useRef } from "react";

import { ChevronDownIcon } from "@/components/icons";
import { Avatar, DropdownMenu } from "@/components/ui";
import { authRoutes } from "@/features/auth";

import styles from "./profile-menu.module.css";

export interface ProfileMenuProps {
  /** Display name: the user's name, or their email when no name is set. */
  displayName: string;
  email: string;
  /** Profile photo URL, when the user has one. */
  avatarSrc?: string;
}

/** Account menu: who is signed in, links to Profile and Settings, and Log out. */
export function ProfileMenu({ displayName, email, avatarSrc }: ProfileMenuProps) {
  const logoutForm = useRef<HTMLFormElement>(null);

  return (
    <>
      <DropdownMenu
        label="Account"
        align="end"
        header={
          <div className={styles.identity}>
            <span className={styles.identityName}>{displayName}</span>
            {displayName !== email ? <span className={styles.identityEmail}>{email}</span> : null}
          </div>
        }
        items={[
          { id: "profile", label: "Profile", href: "/profile" },
          { id: "settings", label: "Settings", href: "/settings" },
          { id: "logout", label: "Log out", onSelect: () => logoutForm.current?.requestSubmit() },
        ]}
        trigger={(triggerProps) => (
          <button type="button" className={styles.trigger} {...triggerProps}>
            <span aria-hidden="true">
              <Avatar name={displayName} size="sm" src={avatarSrc} />
            </span>
            <span className={styles.name}>
              <span className="visually-hidden">Account menu for</span> {displayName}
            </span>
            <ChevronDownIcon className={styles.chevron} />
          </button>
        )}
      />
      {/* Logging out is a plain form POST (never a GET) that ends with a full page load. */}
      <form ref={logoutForm} method="post" action={authRoutes.logout} hidden />
    </>
  );
}
