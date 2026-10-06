import type { Metadata } from "next";
import Link from "next/link";

import { buttonStyles } from "@/components/ui";
import { emptyStates } from "@/features/workspace";
import { AreaPage } from "@/features/workspace/server";

export const metadata: Metadata = { title: "Roadmap" };

export default function RoadmapPage() {
  return (
    <AreaPage
      path="/roadmap"
      eyebrow="Workspace"
      title="Roadmap"
      description="An ordered plan of what to practice next, built from your interview feedback."
      capability="roadmap"
      emptyState={emptyStates.roadmap}
      emptyAction={
        <Link href="/interviews/new" className={buttonStyles({ variant: "outline" })}>
          See what interview setup includes
        </Link>
      }
    />
  );
}
