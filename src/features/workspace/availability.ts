/**
 * Which workspace capabilities are usable today. Each phase flips its own flag
 * (resume: Phase 4). The UI reads these flags to label areas honestly instead
 * of faking functionality.
 */
export const availability = {
  interviews: false,
  resume: true,
  roadmap: false,
  practice: false,
} as const;

export type Capability = keyof typeof availability;

export function isAvailable(capability: Capability): boolean {
  return availability[capability];
}
