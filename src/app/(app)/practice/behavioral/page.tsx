import type { Metadata } from "next";

import { emptyStates } from "@/features/workspace";
import { AreaPage } from "@/features/workspace/server";

export const metadata: Metadata = { title: "Behavioral practice" };

export default function BehavioralPracticePage() {
  return (
    <AreaPage
      path="/practice/behavioral"
      eyebrow="Preparation"
      title="Behavioral practice"
      description="Structured stories about your experience, decisions, and their impact."
      capability="practice"
      emptyState={emptyStates.behavioral}
    />
  );
}
