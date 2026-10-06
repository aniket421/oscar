/**
 * Workspace copy, kept in one place for review. Empty states follow one rule:
 * say what the area is, why it matters, and what the user can do next.
 * Nothing here may imply data or features that do not exist.
 */

export interface EmptyStateCopy {
  title: string;
  description: string;
  reason: string;
  next: string;
}

export const emptyStates = {
  interviews: {
    title: "No interviews yet",
    description: "Your completed mock interviews and their reports will be listed here.",
    reason: "Reviewing past sessions is how you see what is improving and what still needs work.",
    next: "Your first interview will appear here after you complete it.",
  },
  resume: {
    title: "No resume added",
    description:
      "Oscar will use your resume to tailor interview questions to your real experience.",
    reason: "Interviewers ask about what is on your resume, so your practice should too.",
    next: "Resume upload arrives in a later update. Nothing is needed from you yet.",
  },
  roadmap: {
    title: "No roadmap yet",
    description:
      "Your roadmap will turn interview feedback into an ordered plan of what to practice next.",
    reason: "A plan keeps your practice focused on the gaps that matter most for your target role.",
    next: "Your roadmap is built from your interview results, so it starts after your first interview.",
  },
  technical: {
    title: "No technical practice yet",
    description:
      "Technical practice will cover role-specific questions where you explain your reasoning out loud.",
    reason: "Technical rounds test how you think through a problem, not only what you know.",
    next: "Technical practice opens in a later update and will appear here.",
  },
  behavioral: {
    title: "No behavioral practice yet",
    description:
      "Behavioral practice will help you build clear, structured stories about your experience.",
    reason: "Strong stories with specific details are what make behavioral answers convincing.",
    next: "Behavioral practice opens in a later update and will appear here.",
  },
  coding: {
    title: "No coding practice yet",
    description: "Coding practice will let you solve problems and talk through your approach.",
    reason:
      "Explaining your approach while you code is a skill of its own, and it improves with practice.",
    next: "Coding practice opens in a later update and will appear here.",
  },
} as const satisfies Record<string, EmptyStateCopy>;

export const interviewSetup = {
  title: "Set up an interview",
  description: "Interview setup is being built. Here is what you will choose when it opens.",
  choices: [
    {
      label: "Role",
      detail: "The job you are preparing for, such as product designer or backend engineer.",
    },
    {
      label: "Experience level",
      detail: "From student to lead, so questions match the seniority of the role.",
    },
    { label: "Interview type", detail: "Behavioral, technical, coding, or a mix of all three." },
    { label: "Format", detail: "Answer by voice or on video, with realistic pacing." },
  ],
  note: "No interview has started. When setup opens, this page will let you configure and begin a session.",
} as const;
