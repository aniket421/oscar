import { DashboardShell } from "@/features/workspace";

/** Signed-in area. Every page inside verifies the user itself (see docs/architecture.md). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
