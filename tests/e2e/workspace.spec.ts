import { expect, test } from "@playwright/test";

import { createUser, logInToWorkspace, resetAuth, testUser, trackConsoleErrors } from "./helpers";

const protectedRoutes = [
  "/dashboard",
  "/interviews",
  "/interviews/new",
  "/resume",
  "/roadmap",
  "/practice/technical",
  "/practice/behavioral",
  "/practice/coding",
  "/profile",
  "/settings",
];

test.beforeEach(async () => {
  await resetAuth();
});

test("main journey: landing, login, dashboard, navigation, profile menu, logout", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "desktop", "Sidebar journey runs on the desktop layout.");
  const assertNoErrors = trackConsoleErrors(page);
  await createUser();

  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL("/login");
  await page.getByLabel("Email").fill(testUser.email);
  await page.getByLabel("Password").fill(testUser.password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome, Test" })).toBeVisible();
  await expect(page.getByText("No interviews yet")).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Workspace" });
  await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");

  for (const [label, path, heading] of [
    ["Interviews", "/interviews", "Interviews"],
    ["Resume", "/resume", "Resume"],
    ["Roadmap", "/roadmap", "Roadmap"],
    ["Technical", "/practice/technical", "Technical practice"],
    ["Behavioral", "/practice/behavioral", "Behavioral practice"],
    ["Coding", "/practice/coding", "Coding practice"],
    ["Profile", "/profile", "Profile"],
    ["Settings", "/settings", "Settings"],
  ] as const) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
  }

  // Profile menu, by keyboard.
  const trigger = page.getByRole("button", { name: "Account menu for Test Candidate" });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Profile" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/profile");
  await expect(page.getByRole("main").getByText(testUser.email).first()).toBeVisible();

  await trigger.click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL("/login?notice=signed_out");
  await expect(page.getByText("You have been logged out")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
  assertNoErrors();
});

test("the start interview action leads to setup without starting an interview", async ({
  page,
}) => {
  await createUser();
  await logInToWorkspace(page);
  await page
    .getByRole("region", { name: "Start a mock interview" })
    .getByRole("link", { name: "Start an interview" })
    .click();
  await expect(page).toHaveURL("/interviews/new");
  await expect(page.getByRole("heading", { level: 1, name: "Set up an interview" })).toBeVisible();
  await expect(page.getByText("No interview has started.")).toBeVisible();
  await expect(page.getByRole("main").locator("form")).toHaveCount(0);
});

test("settings can log the user out", async ({ page, context }) => {
  await createUser();
  await logInToWorkspace(page);
  await page.goto("/settings");
  await page.getByRole("main").getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL("/login?notice=signed_out");
  const sessionCookies = (await context.cookies()).filter((cookie) =>
    /^sb-.+-auth-token/.test(cookie.name),
  );
  expect(sessionCookies).toEqual([]);
});

test.describe("protection", () => {
  for (const path of protectedRoutes) {
    test(`${path} requires a session`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("heading", { level: 1, name: "Log in to Oscar" })).toBeVisible();
    });
  }

  test("the Phase 2 /app address redirects to the dashboard", async ({ page }) => {
    await createUser();
    await logInToWorkspace(page);
    await page.goto("/app");
    await expect(page).toHaveURL("/dashboard");
  });

  test("user data never appears in URLs", async ({ page }) => {
    await createUser();
    await logInToWorkspace(page);
    const visited: string[] = [];
    page.on("framenavigated", (frame) => visited.push(frame.url()));
    for (const path of protectedRoutes) await page.goto(path);
    for (const url of visited) {
      expect(url).not.toContain(encodeURIComponent(testUser.email));
      expect(url).not.toContain(testUser.email);
      expect(url).not.toMatch(/token|access_token|refresh/i);
    }
  });
});

test.describe("responsive workspace", () => {
  for (const width of [1440, 1280, 1024, 768, 430, 390, 375]) {
    test(`dashboard and settings at ${width}px have no horizontal overflow`, async ({ page }) => {
      await createUser();
      await page.setViewportSize({ width, height: 900 });
      await logInToWorkspace(page);
      for (const path of ["/dashboard", "/settings"]) {
        await page.goto(path);
        const [scrollWidth, clientWidth] = await page.evaluate(() => [
          document.documentElement.scrollWidth,
          document.documentElement.clientWidth,
        ]);
        expect(scrollWidth, path).toBeLessThanOrEqual(clientWidth);
      }
      const sidebarVisible = await page
        .getByRole("complementary", { name: "Workspace sidebar" })
        .isVisible();
      expect(sidebarVisible).toBe(width >= 1024);
      await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible({
        visible: width < 1024,
      });
    });
  }
});

test.describe("no client state outlives the session", () => {
  test("the login form keeps no password once the user is signed in", async ({ page }) => {
    await createUser();
    await logInToWorkspace(page);
    await page
      .getByRole("navigation", { name: "Workspace" })
      .getByRole("link", { name: "Resume" })
      .click();
    await expect(page).toHaveURL("/resume");
    const values = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLInputElement>("input[type=password]")].map(
        (input) => input.value,
      ),
    );
    expect(values.every((value) => value === "")).toBe(true);
  });

  test("logout reloads the page, leaving no trace of the user", async ({ page }) => {
    await createUser();
    await logInToWorkspace(page);
    for (const label of ["Profile", "Settings"]) {
      await page
        .getByRole("navigation", { name: "Workspace" })
        .getByRole("link", { name: label })
        .click();
    }
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await page.getByRole("main").getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL("/login?notice=signed_out");
    const html = await page.content();
    expect(html).not.toContain(testUser.email);
    expect(html).not.toContain(testUser.name);
  });

  test("the skip link targets the visible workspace content", async ({ page }) => {
    await createUser();
    await logInToWorkspace(page);
    expect(await page.locator("#workspace-main").count()).toBe(1);
    await page.goto("/dashboard");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#workspace-main$/);
  });
});
