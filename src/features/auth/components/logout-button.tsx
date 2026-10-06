"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui";

import { logout } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" loading={pending}>
      Log out
    </Button>
  );
}

/** A real form so logging out works without JavaScript and cannot be triggered by a GET. */
export function LogoutButton() {
  return (
    <form action={logout}>
      <SubmitButton />
    </form>
  );
}
