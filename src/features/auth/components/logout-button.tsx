"use client";

import { useState } from "react";

import { Button } from "@/components/ui";

import { authRoutes } from "../routes";

/**
 * A plain form POST to the logout endpoint. It works without JavaScript, can
 * never be triggered by a GET, and ends with a full page load.
 */
export function LogoutButton() {
  const [pending, setPending] = useState(false);
  return (
    <form method="post" action={authRoutes.logout} onSubmit={() => setPending(true)}>
      <Button type="submit" variant="outline" size="sm" loading={pending}>
        Log out
      </Button>
    </form>
  );
}
