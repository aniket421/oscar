import type { Metadata } from "next";

import { Terms } from "@/features/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms for using Oscar, an interview preparation and coaching platform.",
};

export default function TermsPage() {
  return <Terms />;
}
