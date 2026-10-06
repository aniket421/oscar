"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useActionState, useState } from "react";

import { Alert, Button, Input } from "@/components/ui";

import { login, type LoginState } from "../actions";
import type { AuthNotice } from "../routes";
import { validateLogin, type LoginField } from "../validation";
import { AuthNoticeAlert } from "./auth-notice";
import styles from "./auth-form.module.css";
import { focusFirstInvalid, useFormErrors } from "./use-form-errors";

const fieldOrder: readonly LoginField[] = ["email", "password"];
const initialState: LoginState = { status: "idle" };

export interface LoginFormProps {
  /** Validated in-app path to return to after logging in. */
  next?: string;
  notice?: AuthNotice;
}

export function LoginForm({ next, notice }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [email, setEmail] = useState("");
  const { errors, setErrors, clear } = useFormErrors(
    state.status === "error" ? state.fieldErrors : undefined,
  );
  const formMessage = state.status === "error" ? state.message : undefined;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const result = validateLogin(new FormData(event.currentTarget));
    if (!result.ok) {
      event.preventDefault();
      setErrors(result.errors);
      focusFirstInvalid(event.currentTarget, fieldOrder, result.errors);
    }
  }

  return (
    <form className={styles.form} action={formAction} onSubmit={onSubmit} noValidate>
      {notice && !formMessage ? <AuthNoticeAlert notice={notice} /> : null}
      {formMessage ? (
        <Alert tone="error" title="Could not log in" role="alert">
          {formMessage}
        </Alert>
      ) : null}

      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className={styles.fields}>
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
          autoComplete="current-password"
          required
          onChange={() => clear("password")}
          error={errors.password}
        />
      </div>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        {pending ? "Logging in" : "Log in"}
      </Button>

      <p className={styles.legal}>
        By continuing, you agree to the <Link href="/terms">Terms &amp; Conditions</Link> and
        acknowledge the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </form>
  );
}
