"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useActionState, useEffect, useRef, useState } from "react";

import { OscarStatus } from "@/components/oscar";
import { Alert, Button, buttonStyles, Input } from "@/components/ui";

import { signup, type SignupState } from "../actions";
import { authRoutes } from "../routes";
import { PASSWORD_MIN_LENGTH, validateSignup, type SignupField } from "../validation";
import styles from "./auth-form.module.css";
import { focusFirstInvalid, useFormErrors } from "./use-form-errors";

const fieldOrder: readonly SignupField[] = ["name", "email", "password", "confirmPassword"];
const initialState: SignupState = { status: "idle" };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const { errors, setErrors, clear } = useFormErrors(
    state.status === "error" ? state.fieldErrors : undefined,
  );

  if (state.status === "confirm_email") {
    return <ConfirmEmail email={state.email} />;
  }

  const formMessage = state.status === "error" ? state.message : undefined;
  const isDuplicate = state.status === "error" && state.kind === "duplicate_account";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const result = validateSignup(new FormData(event.currentTarget));
    if (!result.ok) {
      event.preventDefault();
      setErrors(result.errors);
      focusFirstInvalid(event.currentTarget, fieldOrder, result.errors);
    }
  }

  return (
    <form className={styles.form} action={formAction} onSubmit={onSubmit} noValidate>
      {formMessage ? (
        <Alert
          tone="error"
          title={isDuplicate ? "Account already exists" : "Could not create your account"}
          role="alert"
          actions={
            isDuplicate ? (
              <Link
                href={authRoutes.login}
                className={buttonStyles({ variant: "outline", size: "sm" })}
              >
                Log in instead
              </Link>
            ) : undefined
          }
        >
          {formMessage}
        </Alert>
      ) : null}

      <div className={styles.fields}>
        <Input
          name="name"
          label="Name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            clear("name");
          }}
          error={errors.name}
        />
        <Input
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clear("email");
          }}
          error={errors.email}
        />
        <Input
          name="password"
          type="password"
          label="Password"
          description={`At least ${PASSWORD_MIN_LENGTH} characters, including a letter and a number.`}
          autoComplete="new-password"
          required
          onChange={() => clear("password")}
          error={errors.password}
        />
        <Input
          name="confirmPassword"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          required
          onChange={() => clear("confirmPassword")}
          error={errors.confirmPassword}
        />
      </div>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        {pending ? "Creating account" : "Create account"}
      </Button>

      <p className={styles.legal}>
        By creating an account, you agree to the <Link href="/terms">Terms &amp; Conditions</Link>{" "}
        and acknowledge the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </form>
  );
}

function ConfirmEmail({ email }: { email: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // The form is replaced; move focus to the result so keyboard users are not lost.
  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div ref={ref} tabIndex={-1} className={styles.success}>
      <OscarStatus
        state="success"
        live
        title="Check your email"
        description={
          <>
            We sent a confirmation link to <strong>{email}</strong>. Open it to activate your
            account, then log in.
          </>
        }
        actions={
          <Link href={authRoutes.login} className={buttonStyles({ variant: "outline" })}>
            Go to log in
          </Link>
        }
      />
    </div>
  );
}
