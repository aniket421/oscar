import type { Metadata } from "next";

import { PrivacyPolicy } from "@/features/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Oscar collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
