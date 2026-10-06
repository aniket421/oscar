import { expect, test } from "@playwright/test";

import {
  createUser,
  expireSessions,
  logIn,
  resetAuth,
  testUser,
  trackConsoleErrors,
} from "./helpers";

test.beforeEach(async () => {
  await resetAuth();
});

test.describe("login", () => {
  test("validates in the browser before submitting", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Enter your email address.")).toBeVisible();
    await expect(page.getByText("Enter your password.")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeFocused();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");

    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
  });

  test("handles invalid credentials without revealing details", async ({ page }) => {
    const assertNoErrors = trackConsoleErrors(page);
    await createUser();
    await logIn(page, testUser.email, "wrong-password-1");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "The email or password is incorrect.",
    );
    await expect(page).toHaveURL("/login");
    await expect(page.getByLabel("Email")).toHaveValue(testUser.email);
    await expect(page.getByLabel("Password")).toHaveValue("");
    assertNoErrors();
  });

  test("explains an authentication service outage", async ({ page }) => {
    await logIn(page, "outage@example.test", "anything-123");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "We could not reach the sign-in service.",
    );
    await expect(page.getByRole("main").getByRole("alert")).not.toContainText(
      /503|unexpected_failure|Service unavailable/,
    );
  });

  test("signs in and lands in the protected workspace", async ({ page, context }) => {
    const assertNoErrors = trackConsoleErrors(page);
    await createUser();
    await logIn(page);
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Welcome, Test" })).toBeVisible();
    await page.getByRole("button", { name: /Account menu for/ }).click();
    await expect(page.getByRole("menu", { name: "Account" })).toBeVisible();
    await expect(page.getByText(testUser.email)).toBeVisible();

    const sessionCookies = (await context.cookies()).filter((cookie) =>
      cookie.name.startsWith("sb-"),
    );
    expect(sessionCookies.length).toBeGreaterThan(0);
    for (const cookie of sessionCookies) {
      expect(cookie.httpOnly, `${cookie.name} is httpOnly`).toBe(true);
      expect(cookie.sameSite).toBe("Lax");
    }
    assertNoErrors();
  });

  test("returns to the requested page after logging in", async ({ page }) => {
    await createUser();
    await page.goto("/interviews?from=email");
    await expect(page).toHaveURL(/\/login\?next=%2Finterviews%3Ffrom%3Demail$/);
    await page.getByLabel("Email").fill(testUser.email);
    await page.getByLabel("Password").fill(testUser.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/interviews?from=email");
  });

  test("ignores off-site redirect targets", async ({ page }) => {
    await createUser();
    await page.goto("/login?next=https://evil.example/steal");
    await page.getByLabel("Email").fill(testUser.email);
    await page.getByLabel("Password").fill(testUser.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/dashboard");
  });
});

test.describe("signup", () => {
  test("validates every field", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter your name.")).toBeVisible();
    await expect(page.getByText("Enter your email address.")).toBeVisible();
    await expect(page.getByText("Create a password.")).toBeVisible();
    await expect(page.getByText("Confirm your password.")).toBeVisible();
    await expect(page.getByLabel("Name")).toBeFocused();

    await page.getByLabel("Name").fill("Test Candidate");
    await page.getByLabel("Email").fill("candidate@example.test");
    await page.getByLabel(/^Password/).fill("short");
    await page.getByLabel("Confirm password").fill("different");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
    await expect(page.getByText("Passwords do not match.")).toBeVisible();
    await expect(page.getByLabel(/^Password/)).toBeFocused();
  });

  test("creates an account and signs the user in", async ({ page }) => {
    const assertNoErrors = trackConsoleErrors(page);
    await page.goto("/signup");
    await page.getByLabel("Name").fill("Test Candidate");
    await page.getByLabel("Email").fill("new.candidate@example.test");
    await page.getByLabel(/^Password/).fill("practice-2026");
    await page.getByLabel("Confirm password").fill("practice-2026");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Welcome, Test" })).toBeVisible();
    assertNoErrors();
  });

  test("reports a duplicate account with a way forward", async ({ page }) => {
    await createUser();
    await page.goto("/signup");
    await page.getByLabel("Name").fill("Test Candidate");
    await page.getByLabel("Email").fill(testUser.email);
    await page.getByLabel(/^Password/).fill("practice-2026");
    await page.getByLabel("Confirm password").fill("practice-2026");
    await page.getByRole("button", { name: "Create account" }).click();
    const alert = page.getByRole("main").getByRole("alert");
    await expect(alert).toContainText("An account with this email already exists.");
    await alert.getByRole("link", { name: "Log in instead" }).click();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("protected routes and sessions", () => {
  test("blocks unauthenticated visitors", async ({ page }) => {
    const response = await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /Welcome,/ })).toHaveCount(0);
  });

  test("keeps signed-in users away from login and signup", async ({ page }) => {
    await createUser();
    await logIn(page);
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/login");
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/signup");
    await expect(page).toHaveURL("/dashboard");
  });

  test("logs out and protects the workspace again", async ({ page, context }) => {
    await createUser();
    await logIn(page);
    await expect(page).toHaveURL("/dashboard");
    await page.getByRole("button", { name: /Account menu for/ }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL("/login?notice=signed_out");
    await expect(page.getByText("You have been logged out")).toBeVisible();
    const sessionCookies = (await context.cookies()).filter((cookie) =>
      /^sb-.+-auth-token/.test(cookie.name),
    );
    expect(sessionCookies).toEqual([]);
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
  });

  test("handles an expired session", async ({ page }) => {
    await createUser();
    await logIn(page);
    await expect(page).toHaveURL("/dashboard");
    await expireSessions();
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login?notice=session_expired");
    await expect(page.getByText("Your session has expired")).toBeVisible();
  });
});
