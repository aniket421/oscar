import { PageSkeleton } from "@/features/workspace";

/** Shown while a workspace page's server content is on its way. */
export default function WorkspaceLoading() {
  return <PageSkeleton label="Loading" />;
}
