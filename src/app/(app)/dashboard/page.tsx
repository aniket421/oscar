import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardOverview, DashboardSkeleton } from "@/features/workspace";
import { getWorkspaceSnapshot } from "@/features/workspace/server";

export const metadata: Metadata = { title: "Overview" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const snapshot = await getWorkspaceSnapshot("/dashboard");
  return <DashboardOverview snapshot={snapshot} />;
}
