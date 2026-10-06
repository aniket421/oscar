import type { Metadata } from "next";

import { emptyStates } from "@/features/workspace";
import { AreaPage } from "@/features/workspace/server";

export const metadata: Metadata = { title: "Coding practice" };

export default function CodingPracticePage() {
  return (
    <AreaPage
      path="/practice/coding"
      eyebrow="Preparation"
      title="Coding practice"
      description="Coding problems you solve while talking through your approach."
      capability="practice"
      emptyState={emptyStates.coding}
    />
  );
}
