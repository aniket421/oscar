/**
 * Landing page copy, kept in one place so it can be reviewed and edited
 * without touching layout code.
 *
 * Content rules (docs/design-system.md): describe what Oscar actually does,
 * label anything not yet available, and never invent metrics, testimonials,
 * logos, or results.
 */

export const navigation = [
  { label: "What Oscar does", href: "/#capabilities" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Preview", href: "/#preview" },
  { label: "Features", href: "/#features" },
  { label: "Principles", href: "/#principles" },
] as const;

export const hero = {
  eyebrow: "AI interview coach",
  title: "Practice the interview before it counts.",
  description:
    "Oscar runs realistic mock interviews for the role you are targeting, evaluates each answer against clear criteria, and turns the results into a focused plan to improve.",
  primaryCta: "Start preparing",
  secondaryCta: "See how it works",
  status: "Oscar is in active development. Accounts are open; interview features are being built.",
  statusLink: "See what is coming",
} as const;

export const capabilities = {
  eyebrow: "What Oscar does",
  title: "Built for the whole interview, not just the questions",
  description:
    "Oscar covers the full preparation loop, from your resume to the debrief after each session.",
  status: "In development",
  statusNote: "These capabilities are being built and are not available yet.",
  items: [
    {
      title: "Realistic mock interviews",
      body: "Full sessions paced like the real thing, with follow-up questions that respond to what you actually said.",
    },
    {
      title: "Voice interviews",
      body: "Answer out loud and practice speaking clearly and concisely under time pressure.",
    },
    {
      title: "Video interviews",
      body: "Rehearse on camera with the same structure as a live video round.",
    },
    {
      title: "Technical interviews",
      body: "Work through role-specific technical questions and explain your reasoning as you go.",
    },
    {
      title: "Behavioral interviews",
      body: "Practice structured stories about your experience, your decisions, and their impact.",
    },
    {
      title: "Resume analysis",
      body: "Oscar reads your resume to understand your background and tailor the questions to it.",
    },
    {
      title: "Skill-gap detection",
      body: "Compare your answers and experience with what the role expects, and see where the gaps are.",
    },
    {
      title: "Personalized improvement",
      body: "A focused plan built from your own sessions, not generic interview advice.",
    },
    {
      title: "Interview reports",
      body: "A structured review after each session: what worked, what did not, and why.",
    },
  ],
} as const;

export const steps = {
  eyebrow: "How it works",
  title: "From first session to clear progress",
  items: [
    {
      number: "01",
      title: "Configure",
      body: "Choose the role, your experience level, the interview type, and how you want to practice.",
    },
    {
      number: "02",
      title: "Interview",
      body: "Oscar conducts a realistic interview and asks follow-up questions based on your answers.",
    },
    {
      number: "03",
      title: "Evaluate",
      body: "Oscar analyzes your responses against clear criteria for structure, substance, and delivery.",
    },
    {
      number: "04",
      title: "Improve",
      body: "You get specific, actionable feedback and a personalized path for what to practice next.",
    },
  ],
} as const;

export const preview = {
  eyebrow: "Product preview",
  title: "A first look at the interview screen",
  description:
    "This is a design preview of the interview experience in development. It is illustrative only: no interview is running, and nothing shown is a real result.",
  caption: "Design preview. Illustrative content, not a live interview or a real result.",
  interviewType: "Behavioral interview",
  questionLabel: "Question 2 of 6",
  progress: 33,
  question:
    "Tell me about a time you had to change direction on a project after it had already started.",
  answerLabel: "Example answer",
  answer:
    "In my last role, we were two weeks into building a reporting feature when customer interviews showed the real need was faster exports, not new charts. I paused the work, shared what we had learned with the team, and",
  criteriaTitle: "What Oscar listens for",
  criteria: [
    { label: "Context", detail: "Situation and stakes", covered: true },
    { label: "Your role", detail: "What you personally did", covered: true },
    { label: "Decision", detail: "How and why you changed course", covered: true },
    { label: "Outcome", detail: "What changed as a result", covered: false },
  ],
  coveredLabel: "Covered",
  pendingLabel: "Not yet covered",
} as const;

export const features = {
  eyebrow: "Features",
  title: "Preparation built around how interviews actually work",
  items: [
    {
      icon: "resume",
      title: "Resume Intelligence",
      body: "Oscar reads your resume the way an interviewer would and uses it to shape your practice.",
      points: [
        "Questions drawn from your real experience",
        "Claims that need stronger evidence",
        "Gaps to address before the interview",
      ],
    },
    {
      icon: "practice",
      title: "Interview Practice",
      body: "Full sessions by voice or video, with realistic pacing and follow-up questions.",
      points: ["Voice and video formats", "Adaptive follow-up questions", "Timed answers"],
    },
    {
      icon: "technical",
      title: "Technical Preparation",
      body: "Practice technical questions for your role and explain your reasoning out loud.",
      points: [
        "Role-specific question sets",
        "Focus on reasoning, not just answers",
        "Clear review of what was missing",
      ],
    },
    {
      icon: "behavioral",
      title: "Behavioral Preparation",
      body: "Build clear, structured stories about your experience that hold up to follow-up questions.",
      points: [
        "Guidance on story structure",
        "Coverage of common themes",
        "Feedback on specificity and impact",
      ],
    },
    {
      icon: "feedback",
      title: "Performance Feedback",
      body: "See what worked and what did not, tied to specific moments in your answers.",
      points: [
        "Feedback linked to your own words",
        "Clear criteria, no unexplained scores",
        "Content and delivery reviewed separately",
      ],
    },
    {
      icon: "roadmap",
      title: "Personalized Roadmap",
      body: "Turn feedback into a plan: what to practice next, and in what order.",
      points: [
        "Priorities from your own sessions",
        "Focused practice suggestions",
        "Progress tracked across sessions",
      ],
    },
  ],
} as const;

export type FeatureIcon = (typeof features.items)[number]["icon"];

export const principles = {
  eyebrow: "Our principles",
  title: "Built to be trusted with something that matters",
  description:
    "Oscar is new, so there are no customer stories to show yet. Instead, here is what we hold ourselves to.",
  items: [
    {
      title: "Transparent evaluation",
      body: "Feedback points to what you said and the criteria used to judge it. No unexplained scores.",
    },
    {
      title: "Honest about what is ready",
      body: "Features are labelled as in development until they work. This site shows no testimonials, user counts, or results we cannot verify.",
    },
    {
      title: "Your information has one purpose",
      body: "What you share is used to provide your coaching. The Privacy Policy explains exactly what is collected today.",
    },
    {
      title: "Secure by default",
      body: "Sign-in runs through a dedicated authentication provider. Oscar never stores your password, and session cookies cannot be read by scripts in the page.",
    },
  ],
} as const;

export const finalCta = {
  title: "Start preparing for your next interview.",
  description:
    "Create your account today. Interview practice will appear in your workspace as each feature becomes available.",
  primary: "Create your account",
  secondary: "Log in",
} as const;

export const footer = {
  tagline: "Oscar is an interview preparation and coaching platform.",
  columns: [
    {
      title: "Product",
      links: [
        { label: "What Oscar does", href: "/#capabilities" },
        { label: "How it works", href: "/#how-it-works" },
        { label: "Product preview", href: "/#preview" },
        { label: "Features", href: "/#features" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Our principles", href: "/#principles" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms & Conditions", href: "/terms" },
      ],
    },
  ],
} as const;
