import { expect, test } from "@playwright/test";

import { createUser, logInToWorkspace, resetAuth } from "./helpers";

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile navigation runs on the phone layout.");
  await resetAuth();
  await createUser();
});

test("mobile navigation drawer traps focus, closes with Escape, and navigates", async ({
  page,
}) => {
  await logInToWorkspace(page);

  const toggle = page.getByRole("button", { name: "Open menu" });
  await toggle.click();
  const drawer = page.getByRole("dialog", { name: "Workspace navigation" });
  await expect(drawer).toBeVisible();

  // Tab moves through the drawer only; the page behind is inert.
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    const outside = await page.evaluate(() => {
      const element = document.activeElement;
      return element !== null && element !== document.body && !element.closest("dialog");
    });
    expect(outside).toBe(false);
  }

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(toggle).toBeFocused();

  await toggle.click();
  await drawer.getByRole("link", { name: "Roadmap" }).click();
  await expect(page).toHaveURL("/roadmap");
  await expect(drawer).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Roadmap" })).toBeVisible();
});

test("profile menu works on a phone", async ({ page }) => {
  await logInToWorkspace(page);
  await page.getByRole("button", { name: /Account menu for/ }).click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page).toHaveURL("/settings");
  const [scrollWidth, clientWidth] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
