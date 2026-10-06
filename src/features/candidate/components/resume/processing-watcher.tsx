"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const INTERVAL_MS = 2000;
const MAX_CHECKS = 30;

/**
 * While a resume is being processed, refreshes the page every two seconds (for at most a
 * minute) so its status and findings appear without a manual reload.
 */
export function ProcessingWatcher({ resumeId }: { resumeId: string }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let checks = 0;
    const timer = window.setInterval(() => {
      checks += 1;
      if (checks > MAX_CHECKS) {
        window.clearInterval(timer);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [router, resumeId]);

  return gaveUp ? <p>This is taking longer than usual. Refresh the page to check again.</p> : null;
}
