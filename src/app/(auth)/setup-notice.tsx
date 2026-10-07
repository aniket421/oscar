import { Alert } from "@/components/ui";
import { resolveSupabaseSetup } from "@/server/supabase/config";

/**
 * Development-only hint when Supabase cannot be used. Production users see a
 * generic "temporarily unavailable" message from the action instead.
 */
export function SetupNotice() {
  if (process.env.NODE_ENV === "production") return null;
  const setup = resolveSupabaseSetup();
  switch (setup.status) {
    case "ready":
      return null;
    case "missing":
      return (
        <Alert tone="warning" title="Authentication is not configured">
          Set {setup.names.join(" and ")} in .env.local, then restart the dev server. See the README
          for details.
        </Alert>
      );
    case "invalid-url":
      return (
        <Alert tone="warning" title="Authentication is not configured">
          {setup.name} is not a valid URL. Use the project URL from the Supabase dashboard, which
          starts with https://, then restart the dev server.
        </Alert>
      );
    case "unsafe-key":
      return (
        <Alert tone="warning" title="Authentication is turned off">
          {setup.name} holds a key Oscar will not use. Secret and service-role keys bypass Row Level
          Security, so put the project&apos;s publishable key there instead, then restart the dev
          server.
        </Alert>
      );
  }
}
