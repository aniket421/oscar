import type { Metadata } from "next";

import { emptyStates } from "@/features/workspace";
import { AreaPage } from "@/features/workspace/server";

export const metadata: Metadata = { title: "Resume" };

export default function ResumePage() {
  return (
    <AreaPage
      path="/resume"
      eyebrow="Workspace"
      title="Resume"
      description="The resume Oscar uses to tailor your interview questions."
      capability="resume"
      emptyState={emptyStates.resume}
    />
  );
}
