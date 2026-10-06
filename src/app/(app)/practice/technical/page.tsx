import type { Metadata } from "next";

import { emptyStates } from "@/features/workspace";
import { AreaPage } from "@/features/workspace/server";

export const metadata: Metadata = { title: "Technical practice" };

export default function TechnicalPracticePage() {
  return (
    <AreaPage
      path="/practice/technical"
      eyebrow="Preparation"
      title="Technical practice"
      description="Role-specific technical questions where you practice explaining your reasoning."
      capability="practice"
      emptyState={emptyStates.technical}
    />
  );
}
