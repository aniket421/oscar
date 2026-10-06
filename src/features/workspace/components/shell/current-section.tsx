"use client";

import { usePathname } from "next/navigation";

import { findNavLocation } from "../../navigation";
import styles from "./app-header.module.css";

/** Context line in the header: which group and area the user is in. */
export function CurrentSection() {
  const location = findNavLocation(usePathname());
  if (!location) return null;
  return (
    <p className={styles.context}>
      <span>{location.group.label}</span>
      <span aria-hidden="true" className={styles.separator}>
        /
      </span>
      <span className={styles.contextCurrent}>{location.item.label}</span>
    </p>
  );
}
