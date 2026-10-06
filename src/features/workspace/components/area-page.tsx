import type { ReactNode } from "react";
import { Suspense } from "react";

import { OscarPresence } from "@/components/oscar";
import { Badge } from "@/components/ui";

import { isAvailable, type Capability } from "../availability";
import type { EmptyStateCopy } from "../content";
import { getWorkspaceSnapshot } from "../server";
import { AreaEmptyState } from "./area-empty-state";
import styles from "./area-page.module.css";
import { PageHeader } from "./shell/page-header";
import { ContentSkeleton } from "./skeletons";

interface AreaPageProps {
  /** The page's own path, used as the return destination if the session must be renewed. */
  path: string;
  eyebrow: string;
  title: string;
  description: string;
  capability: Capability;
  emptyState: EmptyStateCopy;
  emptyAction?: ReactNode;
}

/**
 * A workspace area whose feature arrives in a later phase: static header, then
 * a verified content region with a designed empty state. When the feature ships,
 * the area renders the user's data here instead.
 */
export function AreaPage(props: AreaPageProps) {
  const { eyebrow, title, description, capability } = props;
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        status={isAvailable(capability) ? undefined : <Badge>Available later</Badge>}
      />
      <section aria-label={title} className={styles.region}>
        <Suspense fallback={<ContentSkeleton label={`Loading ${title.toLowerCase()}`} />}>
          <AreaContent {...props} />
        </Suspense>
      </section>
    </div>
  );
}

async function AreaContent({ path, emptyState, emptyAction }: AreaPageProps) {
  // Verify the session before rendering anything inside the signed-in area.
  await getWorkspaceSnapshot(path);
  return (
    <AreaEmptyState
      size="page"
      headingLevel="h2"
      copy={emptyState}
      visual={<OscarPresence size="md" decorative />}
      action={emptyAction}
    />
  );
}
