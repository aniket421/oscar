import Link from "next/link";

import { MicrophoneIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui";
import type { Interview } from "@/types/domain";

import { emptyStates } from "../../content";
import { AreaEmptyState } from "../area-empty-state";
import { InterviewList } from "../interview-list";
import { DashboardSection } from "./dashboard-section";

export function RecentInterviews({ interviews }: { interviews: readonly Interview[] }) {
  return (
    <DashboardSection
      id="recent-interviews"
      title="Recent interviews"
      link={interviews.length > 0 ? { href: "/interviews", label: "View all" } : undefined}
    >
      {interviews.length > 0 ? (
        <InterviewList interviews={interviews} />
      ) : (
        <AreaEmptyState
          copy={emptyStates.interviews}
          visual={<MicrophoneIcon size={20} />}
          action={
            <Link
              href="/interviews/new"
              className={buttonStyles({ variant: "outline", size: "sm" })}
            >
              Start an interview
            </Link>
          }
        />
      )}
    </DashboardSection>
  );
}
