import type { Metadata } from "next";
import Link from "next/link";

import { AuthPanel, authRoutes, SignupForm } from "@/features/auth";

import { SetupNotice } from "../setup-notice";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create an Oscar account to start preparing for interviews.",
};

export default function SignupPage() {
  return (
    <AuthPanel
      title="Create your account"
      description="Set up your Oscar account. It takes less than a minute."
      footer={
        <>
          Already have an account? <Link href={authRoutes.login}>Log in</Link>
        </>
      }
    >
      <SetupNotice />
      <SignupForm />
    </AuthPanel>
  );
}
