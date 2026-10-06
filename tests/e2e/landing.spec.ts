import { expect, test } from "@playwright/test";

import { trackConsoleErrors } from "./helpers";

test.describe("landing page", () => {
  test("loads with a clear headline and calls to action", async ({ page }) => {
    const assertNoErrors = trackConsoleErrors(page);
    await page.goto("/");
    await expect(page).toHaveTitle(/Oscar/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Practice the interview before it counts.",
    );
    await expect(page.getByRole("link", { name: "Start preparing" })).toHaveAttribute(
      "href",
      "/signup",
    );
    await expect(page.getByText("Oscar is in active development.")).toBeVisible();
    assertNoErrors();
  });

  test("navigates to sections from the header", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    await nav.getByRole("link", { name: "How it works" }).click();
    await expect(page).toHaveURL(/#how-it-works$/);
    await expect(
      page.getByRole("heading", { name: "From first session to clear progress" }),
    ).toBeInViewport();
  });

  test("routes calls to action to the auth pages", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Get started" }).click();
    await expect(page).toHaveURL("/signup");
    await expect(
      page.getByRole("heading", { level: 1, name: "Create your account" }),
    ).toBeVisible();

    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Log in" }).click();
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("heading", { level: 1, name: "Log in to Oscar" })).toBeVisible();
  });

  test("labels the interview preview as illustrative and keeps it non-interactive", async ({
    page,
  }) => {
    await page.goto("/#preview");
    await expect(page.getByText("Design preview. Illustrative content")).toBeVisible();
    const pauseInPreview = page.locator("#preview [inert]").getByText("Pause", { exact: true });
    await expect(pauseInPreview).toBeVisible();
    await expect(page.locator("#preview").getByRole("button")).toHaveCount(0);
  });

  test("shows no testimonials, logos, or invented statistics", async ({ page }) => {
    await page.goto("/");
    const main = page.locator("main");
    await expect(main.locator("blockquote")).toHaveCount(0);
    await expect(main.locator("img")).toHaveCount(0);
    const text = (await main.innerText()).toLowerCase();
    for (const phrase of ["trusted by", "users worldwide", "success rate", "join thousands"]) {
      expect(text).not.toContain(phrase);
    }
    expect(text).not.toMatch(/\d+\s?%|\d+k\+|\d{2,}\+ (users|candidates|companies)/);
  });

  test("footer links reach the legal and contact pages", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await footer.getByRole("link", { name: "Privacy Policy" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
    await page.getByRole("contentinfo").getByRole("link", { name: "Terms & Conditions" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Terms & Conditions" })).toBeVisible();
    await page.getByRole("contentinfo").getByRole("link", { name: "Contact" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeVisible();
  });
});

test.describe("legal pages", () => {
  for (const [path, title] of [
    ["/privacy", "Privacy Policy"],
    ["/terms", "Terms & Conditions"],
  ] as const) {
    test(`${path} loads and describes Oscar accurately`, async ({ page }) => {
      const assertNoErrors = trackConsoleErrors(page);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(
        page.getByText(/interview preparation and coaching platform/).first(),
      ).toBeVisible();
      await expect(page.getByText(/Last updated/)).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Contents" })).toBeVisible();
      assertNoErrors();
    });
  }
});
