"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";

import styles from "./avatar.module.css";

export interface AvatarProps {
  /** Person's name: used for the accessible name and the initials fallback. */
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== undefined && failedSrc !== src;

  return (
    <span className={cn(styles.avatar, styles[size], className)} role="img" aria-label={name}>
      {showImage ? (
        // A plain <img> keeps Avatar usable with any image source (user uploads,
        // auth providers) without per-host next/image configuration.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className={styles.image} onError={() => setFailedSrc(src)} />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </span>
  );
}
