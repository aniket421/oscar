import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { buildDocx, buildPdf, executableBytes } from "../fixtures/resume-files";
import {
  createUser,
  logInToWorkspace,
  otherUser,
  resetAuth,
  testUser,
  trackConsoleErrors,
} from "./helpers";

/*
 * Phase 4 browser flow: profile editing and persistence, resume upload, processing, private
 * access, replace, delete, logout, and isolation between two accounts. Data goes through the
 * mock Supabase project, whose Data and Storage APIs enforce the real RLS policies.
 */

const pdf = {
  name: "jordan-resume.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from(buildPdf()),
};
const docx = {
  name: "jordan-resume.docx",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  buffer: Buffer.from(buildDocx()),
};
const executable = {
  name: "setup.exe",
  mimeType: "application/x-msdownload",
  buffer: Buffer.from(executableBytes()),
};

test.beforeEach(async () => {
  await resetAuth();
  await createUser(testUser);
  await createUser(otherUser);
});

function section(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

/** Chooses a file the way a person does: through the "Choose file" button's file picker. */
async function uploadResume(page: Page, file: typeof pdf) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose file" }).click();
  await (await chooser).setFiles(file);
}

test("profile: add details, save, refresh, and keep them", async ({ page }) => {
  const assertNoConsoleErrors = trackConsoleErrors(page);
  await logInToWorkspace(page);
  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
  await expect(page.getByText("0 of 10 complete")).toBeVisible();

  // Personal details: the form opens with focus inside, saves, and returns focus to Edit.
  const personal = section(page, "Personal");
  await personal.getByRole("button", { name: "Edit personal details" }).click();
  await expect(personal.getByLabel("Full name")).toBeFocused();
  await expect(personal.getByLabel("Full name")).toHaveValue(testUser.name);
  await personal.getByLabel("Headline").fill("Backend engineer focused on payments");
  await personal.getByLabel("Location").fill("Lisbon, Portugal");
  await personal.getByRole("button", { name: "Save" }).click();
  await expect(personal.getByText("Personal details saved.")).toBeVisible();
  await expect(personal.getByRole("button", { name: "Edit personal details" })).toBeFocused();

  // Career, with a select, a number, and a checkbox group.
  const career = section(page, "Career");
  await career.getByRole("button", { name: "Edit career details" }).click();
  await career.getByLabel("Target role").fill("Senior backend engineer");
  await career.getByLabel("Experience level").selectOption("senior");
  await career.getByLabel("Years of experience").fill("7");
  await career.getByLabel("Remote").check();
  await career.getByRole("button", { name: "Save" }).click();
  await expect(career.getByRole("status")).toHaveText("Career details saved.");

  // Server-side validation messages surface in the browser too (validated before sending).
  const education = section(page, "Education");
  await education.getByRole("button", { name: "Add education" }).click();
  await education.getByRole("button", { name: "Save" }).click();
  await expect(education.getByText("Enter the school or institution.")).toBeVisible();
  await expect(education.getByLabel("School or institution")).toBeFocused();
  await education.getByLabel("School or institution").fill("Example University");
  await education.getByLabel("Degree").fill("BSc");
  await education.getByLabel("Start").fill("2014-09");
  await education.getByLabel("End").fill("2018-06");
  await education.getByRole("button", { name: "Save" }).click();
  await expect(education.getByRole("status")).toHaveText("Education saved.");
  await expect(education.getByText("Sep 2014 to Jun 2018")).toBeVisible();

  // Experience: add, edit, and remove after confirming.
  const experience = section(page, "Experience");
  await experience.getByRole("button", { name: "Add role" }).click();
  await experience.getByLabel("Job title").fill("Engineer");
  await experience.getByLabel("Company or organization").fill("Example Labs");
  await experience.getByLabel("Start").fill("2021-03");
  await experience.getByLabel("I currently work here").check();
  await experience.getByRole("button", { name: "Save" }).click();
  await expect(experience.getByText("Mar 2021 to present")).toBeVisible();
  await experience.getByRole("button", { name: "Edit Engineer at Example Labs" }).click();
  await experience.getByLabel("Job title").fill("Senior engineer");
  await experience.getByRole("button", { name: "Save" }).click();
  await expect(experience.getByRole("heading", { name: "Senior engineer" })).toBeVisible();

  // Skills: the category is suggested from the catalog; duplicates are refused.
  const skills = section(page, "Skills");
  await skills.getByLabel("Skill", { exact: true }).fill("TypeScript");
  await expect(skills.getByLabel("Category")).toHaveValue("programming");
  await skills.getByRole("button", { name: "Add skill" }).click();
  await expect(skills.getByRole("status")).toHaveText("TypeScript added.");
  await skills.getByLabel("Skill", { exact: true }).fill("typescript");
  await skills.getByRole("button", { name: "Add skill" }).click();
  await expect(skills.getByText("This skill is already in your profile.")).toBeVisible();
  await expect(skills.getByLabel("Skill", { exact: true })).toHaveValue("typescript");

  // Refresh: everything was stored, and completeness follows the data.
  await page.reload();
  await expect(
    section(page, "Personal").getByText("Backend engineer focused on payments"),
  ).toBeVisible();
  await expect(section(page, "Career").getByText("Senior backend engineer")).toBeVisible();
  await expect(section(page, "Career").getByText("Remote")).toBeVisible();
  await expect(
    section(page, "Experience").getByRole("heading", { name: "Senior engineer" }),
  ).toBeVisible();
  await expect(
    section(page, "Skills").getByRole("button", { name: "Edit TypeScript" }),
  ).toBeVisible();
  await expect(page.getByText("6 of 10 complete")).toBeVisible();

  // Removing an entry asks first.
  await section(page, "Experience")
    .getByRole("button", { name: "Remove Senior engineer at Example Labs" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Remove Senior engineer at Example Labs?" });
  await dialog.getByRole("button", { name: "Remove" }).click();
  await expect(
    section(page, "Experience").getByText("No work experience added yet."),
  ).toBeVisible();

  assertNoConsoleErrors();
});

test("resume: upload, process, private access, replace, and delete", async ({
  page,
  browser,
  baseURL,
}) => {
  const assertNoConsoleErrors = trackConsoleErrors(page);
  await logInToWorkspace(page);
  await page.goto("/resume");
  await expect(page.getByRole("heading", { name: "No resume yet" })).toBeVisible();
  await expect(page.getByText("Analysis will appear after processing")).toHaveCount(0);

  // An executable is refused before it is sent, with a clear message.
  await uploadResume(page, executable);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Upload a PDF or Word (.docx) file.",
  );

  // A real PDF uploads, then is processed on the server.
  await uploadResume(page, pdf);
  const current = section(page, "Current resume");
  await expect(current.getByText("jordan-resume.pdf")).toBeVisible();
  await expect(current.getByRole("status")).toContainText(/Uploaded|Processing|Processed/);
  await expect(current.getByText("Processed")).toBeVisible({ timeout: 15_000 });

  const findings = section(page, "What Oscar found");
  await expect(findings.getByText("jordan.example@example.test")).toBeVisible();
  await expect(
    findings.getByText("Summary, Experience, Education, Skills, Projects"),
  ).toBeVisible();
  await expect(section(page, "Resume analysis")).toContainText("Resume analysis is in development");

  // Resume skills are added only when asked, and marked as coming from the resume.
  await findings.getByLabel("Communication").uncheck();
  await findings.getByRole("button", { name: "Add 8 skills to profile" }).click();
  await expect(findings.getByText("8 skills added to your profile.")).toBeVisible();
  await page.goto("/profile");
  const skills = section(page, "Skills");
  await expect(skills.getByRole("button", { name: "Edit Docker" })).toBeVisible();
  await expect(skills.getByText("From resume").first()).toBeVisible();
  await expect(skills.getByRole("button", { name: "Edit Communication" })).toHaveCount(0);

  // The dashboard reflects the stored resume.
  await page.goto("/dashboard");
  await expect(section(page, "Resume")).toContainText("jordan-resume.pdf");
  await expect(section(page, "Resume")).toContainText("Processed");

  // Private access: the owner downloads through Oscar; no storage address reaches the page.
  await page.goto("/resume");
  const html = await page.content();
  expect(html).not.toContain("127.0.0.1:54329");
  expect(html).not.toContain("storage/v1");
  const download = await page.request.get("/resume/file");
  expect(download.status()).toBe(200);
  expect(download.headers()["cache-control"]).toBe("private, no-store");
  expect(download.headers()["content-disposition"]).toContain("jordan-resume.pdf");
  expect(
    Buffer.from(await download.body())
      .subarray(0, 5)
      .toString(),
  ).toBe("%PDF-");

  // Without a session: the file redirects to login, and uploads are refused.
  const anonymous = await browser.newContext({ baseURL });
  const signedOut = await anonymous.request.get("/resume/file", { maxRedirects: 0 });
  expect(signedOut.status()).toBe(307);
  expect(signedOut.headers().location).toContain("/login");
  const anonymousUpload = await anonymous.request.post("/resume/upload", {
    headers: { origin: baseURL! },
    multipart: { file: pdf },
  });
  expect(anonymousUpload.status()).toBe(401);
  await anonymous.close();

  // Replace with a Word document; the previous file is removed.
  await current.getByRole("button", { name: "Replace" }).click();
  await uploadResume(page, docx);
  await expect(current.getByText("jordan-resume.docx")).toBeVisible();
  await expect(current.getByText("Processed")).toBeVisible({ timeout: 15_000 });
  await expect(current.getByText("jordan-resume.pdf")).toHaveCount(0);

  // Delete, after confirming.
  await current.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete your resume?" });
  await dialog.getByRole("button", { name: "Delete resume" }).click();
  await expect(page.getByRole("heading", { name: "No resume yet" })).toBeVisible();
  expect((await page.request.get("/resume/file")).status()).toBe(404);

  assertNoConsoleErrors();
});

test("a failed resume explains what went wrong", async ({ page }) => {
  await logInToWorkspace(page);
  await page.goto("/resume");
  await uploadResume(page, { ...pdf, name: "scan.pdf", buffer: Buffer.from(buildPdf(["Scan"])) });
  const current = section(page, "Current resume");
  await expect(current.getByText("Could not be read")).toBeVisible({ timeout: 15_000 });
  await expect(current).toContainText("Oscar could not find any text in this file.");
  await expect(section(page, "Resume analysis")).toContainText(
    "Analysis needs a resume Oscar can read.",
  );
});

test("two accounts never see each other's profile or resume", async ({
  page,
  browser,
  baseURL,
}) => {
  // Account A adds a headline and a resume.
  await logInToWorkspace(page);
  await page.goto("/profile");
  const personal = section(page, "Personal");
  await personal.getByRole("button", { name: "Edit personal details" }).click();
  await personal.getByLabel("Headline").fill("Private headline of account A");
  await personal.getByRole("button", { name: "Save" }).click();
  await expect(personal.getByText("Personal details saved.")).toBeVisible();
  await page.goto("/resume");
  await uploadResume(page, pdf);
  await expect(section(page, "Current resume").getByText("Processed")).toBeVisible({
    timeout: 15_000,
  });

  // Account B, in a separate browser session, sees none of it.
  const contextB = await browser.newContext({ baseURL });
  const pageB = await contextB.newPage();
  await logInToWorkspace(pageB, otherUser);
  await pageB.goto("/profile");
  await expect(section(pageB, "Personal").getByText("Private headline of account A")).toHaveCount(
    0,
  );
  await expect(section(pageB, "Personal").getByText(otherUser.email)).toBeVisible();
  await pageB.goto("/resume");
  await expect(pageB.getByRole("heading", { name: "No resume yet" })).toBeVisible();
  expect((await pageB.request.get("/resume/file")).status()).toBe(404);
  expect((await pageB.request.get("/profile/avatar")).status()).toBe(404);
  await pageB.goto("/dashboard");
  await expect(section(pageB, "Resume")).toContainText("No resume added");
  await contextB.close();

  // A still has their data.
  await page.goto("/profile");
  await expect(section(page, "Personal").getByText("Private headline of account A")).toBeVisible();
});

test("logging out ends access to the profile, the resume, and its file", async ({ page }) => {
  await logInToWorkspace(page);
  await page.goto("/resume");
  await uploadResume(page, pdf);
  await expect(section(page, "Current resume").getByText("jordan-resume.pdf")).toBeVisible();

  await page.getByRole("button", { name: /Account menu for/ }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login\?notice=signed_out/);
  await expect(page.getByText("jordan-resume.pdf")).toHaveCount(0);

  for (const path of ["/profile", "/resume"]) {
    await page.goto(path);
    await expect(page).toHaveURL(`/login?next=${encodeURIComponent(path)}`);
  }
  const file = await page.request.get("/resume/file", { maxRedirects: 0 });
  expect(file.status()).toBe(307);
});

test("the resume page needs no network beyond Oscar itself", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "localhost") external.push(url.host);
  });
  await logInToWorkspace(page);
  await page.goto("/resume");
  await uploadResume(page, pdf);
  await expect(section(page, "Current resume").getByText("Processed")).toBeVisible({
    timeout: 15_000,
  });
  expect(external).toEqual([]);
});
