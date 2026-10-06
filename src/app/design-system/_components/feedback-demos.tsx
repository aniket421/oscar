"use client";

import { useState } from "react";

import { Button, Progress, Skeleton } from "@/components/ui";

import styles from "../showcase.module.css";
import { Demo } from "./showcase-section";

export function FeedbackDemos() {
  const [progress, setProgress] = useState(40);
  const [loading, setLoading] = useState(true);

  return (
    <div className={styles.stack}>
      <Demo title="Progress">
        <div className={styles.stackTight}>
          <Progress label="Determinate" value={progress} showValue />
          <div className={styles.row}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setProgress((v) => Math.max(0, v - 20))}
            >
              Decrease
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setProgress((v) => Math.min(100, v + 20))}
            >
              Increase
            </Button>
          </div>
          <Progress label="Indeterminate" />
          <Progress label="Small" value={70} size="sm" />
        </div>
      </Demo>
      <Demo title="Skeleton loading">
        <div className={styles.stackTight}>
          <Button size="sm" variant="outline" onClick={() => setLoading((v) => !v)}>
            {loading ? "Show content" : "Show loading state"}
          </Button>
          <div aria-busy={loading} aria-live="polite" className={styles.skeletonCard}>
            {loading ? (
              <>
                <span className="visually-hidden">Loading content</span>
                <div className={styles.row}>
                  <Skeleton shape="circle" />
                  <div className={styles.grow}>
                    <Skeleton width="40%" />
                    <Skeleton width="65%" className={styles.mtSmall} />
                  </div>
                </div>
                <Skeleton shape="block" />
              </>
            ) : (
              <p className="text-small">
                Content replaces the skeleton in place, with the same footprint, so the layout does
                not shift.
              </p>
            )}
          </div>
        </div>
      </Demo>
    </div>
  );
}
