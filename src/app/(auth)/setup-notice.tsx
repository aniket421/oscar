import { Alert } from "@/components/ui";
import { getSupabaseConfig } from "@/server/supabase/config";

/**
 * Development-only hint when authentication is not configured. Production
 * users see a generic "temporarily unavailable" message from the action instead.
 */
export function SetupNotice() {
  if (process.env.NODE_ENV === "production" || getSupabaseConfig()) return null;
  return (
    <Alert tone="warning" title="Authentication is not configured">
      Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local, then
      restart the dev server. See the README for details.
    </Alert>
  );
}
