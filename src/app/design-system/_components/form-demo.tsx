"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import {
  Alert,
  Button,
  Checkbox,
  Input,
  RadioGroup,
  Select,
  Switch,
  Textarea,
} from "@/components/ui";

import styles from "../showcase.module.css";

const roleOptions = [
  { value: "software", label: "Software engineering" },
  { value: "product", label: "Product management" },
  { value: "design", label: "Design" },
  { value: "data", label: "Data and analytics" },
];

const formatOptions = [
  { value: "voice", label: "Voice", description: "Answer out loud." },
  { value: "video", label: "Video", description: "Camera and microphone." },
  { value: "text", label: "Text", description: "Type your answers.", disabled: true },
];

type Errors = Partial<Record<"email" | "role" | "consent", string>>;

/** Demonstrates labels, descriptions, required fields, and validation errors. */
export function FormDemo() {
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Errors = {};
    const email = String(data.get("email") ?? "");
    if (!email.includes("@")) next.email = "Enter an email address, like name@example.com.";
    if (!data.get("role")) next.role = "Choose a role to continue.";
    if (!data.get("consent")) next.consent = "Confirm to continue.";
    setErrors(next);
    setSubmitted(Object.keys(next).length === 0);
  }

  return (
    <form className={styles.form} noValidate onSubmit={onSubmit}>
      {submitted ? (
        <Alert tone="success" title="Form is valid" role="status">
          Validation passed. Nothing was sent anywhere.
        </Alert>
      ) : null}
      <div className={styles.formGrid}>
        <Input
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          placeholder="name@example.com"
          required
          error={errors.email}
        />
        <Select
          name="role"
          label="Target role"
          placeholder="Select a role"
          options={roleOptions}
          required
          error={errors.role}
        />
        <Input
          name="company"
          label="Target company"
          description="Optional. Used to tailor practice questions."
        />
        <Input name="locked" label="Interview language" value="English" disabled readOnly />
      </div>
      <Textarea
        name="notes"
        label="Focus areas"
        description="What do you want to improve? Two or three sentences is enough."
      />
      <RadioGroup
        name="format"
        legend="Interview format"
        options={formatOptions}
        defaultValue="voice"
        orientation="horizontal"
      />
      <div className={styles.stackTight}>
        <Switch name="feedback" label="Live feedback" description="Show hints while you answer." />
        <Switch label="Record session" description="Unavailable on this device." disabled />
      </div>
      <Checkbox
        name="consent"
        label="I understand my answers are used to generate feedback."
        error={errors.consent}
      />
      <Checkbox label="Disabled option" disabled />
      <div className={styles.row}>
        <Button type="submit">Validate form</Button>
        <Button
          type="reset"
          variant="ghost"
          onClick={() => {
            setErrors({});
            setSubmitted(false);
          }}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}
