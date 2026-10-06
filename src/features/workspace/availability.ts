/**
 * Which workspace capabilities are usable today. Phase 3 builds the shell only,
 * so everything is unavailable; each later phase flips its own flag. The UI
 * reads these flags to label areas honestly instead of faking functionality.
 */
export const availability = {
  interviews: false,
  resume: false,
  roadmap: false,
  practice: false,
} as const;

export type Capability = keyof typeof availability;

export function isAvailable(capability: Capability): boolean {
  return availability[capability];
}
