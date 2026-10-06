import { readEnv } from "@/lib/env";

/**
 * Public contact address, configured per deployment (CONTACT_EMAIL). Read at
 * build time on the server; never hard-coded so no placeholder address ships.
 */
export function getContactEmail(): string | undefined {
  const email = readEnv("CONTACT_EMAIL");
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}
