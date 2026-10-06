import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  AuthFormSkeleton,
  AuthPanel,
  authRoutes,
  LoginForm,
  parseNotice,
  safeRedirectPath,
} from "@/features/auth";

import { SetupNotice } from "../setup-notice";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Oscar account.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthPanel
      title="Log in to Oscar"
      description="Welcome back. Pick up your preparation where you left off."
      footer={
        <>
          New to Oscar? <Link href={authRoutes.signup}>Create an account</Link>
        </>
      }
    >
      <SetupNotice />
      <Suspense fallback={<AuthFormSkeleton fields={2} />}>
        <LoginFormWithParams searchParams={searchParams} />
      </Suspense>
    </AuthPanel>
  );
}

async function LoginFormWithParams({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return (
    <LoginForm
      next={safeRedirectPath(first(params.next))}
      notice={parseNotice(first(params.notice))}
    />
  );
}
