"use client";

import { useState } from "react";

import { Button } from "@/components/ui";

import styles from "../showcase.module.css";

const samples = [
  { className: "motion-fade-in", label: "Fade in", token: "--duration-standard" },
  { className: "motion-scale-in", label: "Scale in", token: "--duration-standard" },
  { className: "motion-rise-in", label: "Rise in", token: "--duration-slow" },
];

export function MotionDemo() {
  const [run, setRun] = useState(0);

  return (
    <div className={styles.stackTight}>
      <div>
        <Button size="sm" variant="outline" onClick={() => setRun((n) => n + 1)}>
          Replay
        </Button>
      </div>
      <div className={styles.motionGrid}>
        {samples.map((sample) => (
          <div
            key={`${sample.className}-${run}`}
            className={`${styles.motionTile} ${sample.className}`}
          >
            <span className="text-label">{sample.label}</span>
            <code className="text-caption text-mono">.{sample.className}</code>
            <code className="text-caption text-mono">{sample.token}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
