import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Test fixture helpers. They talk to the mock auth server, never to a real provider. */
const MOCK_AUTH_URL = "http://127.0.0.1:54329";

export async function resetAuth() {
  await fetch(`${MOCK_AUTH_URL}/__test/reset`, { method: "POST" });
}

export async function expireSessions() {
  await fetch(`${MOCK_AUTH_URL}/__test/expire-sessions`, { method: "POST" });
}

export const testUser = {
  name: "Test Candidate",
  email: "candidate@example.test",
  password: "practice-2026",
};

export async function createUser(user = testUser) {
  await fetch(`${MOCK_AUTH_URL}/__test/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
}

export async function logIn(page: Page, email = testUser.email, password = testUser.password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

/** Collects console errors and failed page errors so each test can assert none occurred. */
export function trackConsoleErrors(page: Page): () => void {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return () => expect(errors, "console errors").toEqual([]);
}
