import type { WorkspaceSnapshot } from "./data/snapshot";
import { isAvailable, type Capability } from "./availability";

export type StepState = "complete" | "not_started";

export interface PreparationStep {
  id: "resume" | "interview" | "feedback" | "roadmap";
  title: string;
  description: string;
  href: string;
  capability: Capability;
  state: StepState;
  available: boolean;
}

/**
 * The candidate's position in Oscar's preparation loop, derived only from
 * stored data. With no data, every step is honestly "not started".
 */
export function derivePreparationSteps(snapshot: WorkspaceSnapshot): PreparationStep[] {
  const completedInterview = snapshot.recentInterviews.some(
    (interview) => interview.status === "completed",
  );

  const steps: Array<Omit<PreparationStep, "available">> = [
    {
      id: "resume",
      title: "Add your resume",
      description: "So questions reflect your real experience.",
      href: "/resume",
      capability: "resume",
      // A resume counts once it is stored and not rejected by processing.
      state: snapshot.resume && snapshot.resume.status !== "failed" ? "complete" : "not_started",
    },
    {
      id: "interview",
      title: "Complete a mock interview",
      description: "A realistic session for the role you want.",
      href: "/interviews/new",
      capability: "interviews",
      state: completedInterview ? "complete" : "not_started",
    },
    {
      id: "feedback",
      title: "Review your feedback",
      description: "See what worked and what to change.",
      href: "/interviews",
      capability: "interviews",
      state: completedInterview ? "complete" : "not_started",
    },
    {
      id: "roadmap",
      title: "Follow your roadmap",
      description: "Practice the gaps that matter most.",
      href: "/roadmap",
      capability: "roadmap",
      state: snapshot.roadmap ? "complete" : "not_started",
    },
  ];

  return steps.map((step) => ({ ...step, available: isAvailable(step.capability) }));
}
