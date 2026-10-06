import { expect, test, type Page } from "@playwright/test";

import { trackConsoleErrors } from "./helpers";

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test.describe("responsive layout", () => {
  for (const path of ["/", "/login", "/signup", "/privacy", "/terms", "/contact"]) {
    test(`${path} has no horizontal overflow`, async ({ page }) => {
      const assertNoErrors = trackConsoleErrors(page);
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
      assertNoErrors();
    });
  }

  test("mobile menu opens, navigates, and closes with Escape", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The menu toggle only shows on narrow screens.");
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();

    const menu = page.getByRole("navigation", { name: "Mobile" });
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();

    await page.getByRole("button", { name: "Open menu" }).click();
    await menu.getByRole("link", { name: "Features" }).click();
    await expect(page).toHaveURL(/#features$/);
    await expect(menu).toBeHidden();
  });
});
