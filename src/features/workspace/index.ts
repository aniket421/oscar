// Public API of the workspace feature. Server-only loaders live in `./server`.
export { availability, isAvailable, type Capability } from "./availability";
export { AreaEmptyState } from "./components/area-empty-state";
export { DashboardOverview } from "./components/dashboard/dashboard-overview";
export { InterviewList } from "./components/interview-list";
export { ContentSkeleton, DashboardSkeleton, PageSkeleton } from "./components/skeletons";
export { DashboardShell } from "./components/shell/dashboard-shell";
export { PageHeader, type PageHeaderProps } from "./components/shell/page-header";
export { emptyStates, interviewSetup } from "./content";
export { findNavLocation, isActiveHref, workspaceNavigation } from "./navigation";
export { derivePreparationSteps, type PreparationStep } from "./preparation";
