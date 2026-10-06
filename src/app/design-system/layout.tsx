import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

/** Development-only QA playground. Returns 404 in production builds. */
export default function DesignSystemLayout({ children }: LayoutProps<"/design-system">) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <ToastProvider>{children}</ToastProvider>;
}
