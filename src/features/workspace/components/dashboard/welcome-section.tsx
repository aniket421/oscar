import type { UserProfile } from "@/types/domain";

import { PageHeader } from "../shell/page-header";

export function firstName(profile: UserProfile): string | null {
  return profile.name?.split(/\s+/)[0] ?? null;
}

/** Greeting and orientation: where the candidate stands. */
export function WelcomeSection({ profile }: { profile: UserProfile }) {
  const name = firstName(profile);
  return (
    <PageHeader
      eyebrow="Overview"
      title={name ? `Welcome, ${name}` : "Welcome to Oscar"}
      description="Here is where your interview preparation stands, and what to do next."
    />
  );
}
