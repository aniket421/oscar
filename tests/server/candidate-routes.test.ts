// @vitest-environment node
/**
 * Integration tests for the candidate Server Actions and file Route Handlers. The session layer
 * is replaced with a test user; data goes through the real Supabase client to the emulator, so
 * RLS, storage policies, and constraints all apply.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type * as NextServer from "next/server";

import type { AuthUser } from "@/features/auth/server";
import type { ServerSupabaseClient } from "@/server/supabase/server-client";

import { buildDocx, buildPdf, buildPng, executableBytes } from "../fixtures/resume-files";
import { createTestBackend, type TestBackend } from "../support/supabase/test-clients";

const session = vi.hoisted(() => ({
  user: null as AuthUser | null,
  client: null as ServerSupabaseClient | null,
  pending: [] as Array<() => unknown>,
}));

vi.mock("@/features/auth/server", () => ({
  getCurrentUser: vi.fn(async () => session.user),
  requireUser: vi.fn(async () => {
    if (!session.user) throw new Error("NEXT_REDIRECT: /login");
    return session.user;
  }),
}));
vi.mock("@/server/supabase/server-client", () => ({
  createSupabaseServerClient: vi.fn(async () => session.client),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof NextServer>()),
  after: vi.fn((task: () => unknown) => session.pending.push(task)),
}));

const actions = await import("@/features/candidate/actions");
const routes = await import("@/features/candidate/server");
const { getCandidateProfile } = await import("@/server/candidate/profile-repository");
const { getCurrentResume, getResumeParse, listResumeFiles } =
  await import("@/server/candidate/resume-repository");
const { refresh } = await import("next/cache");

let backend: TestBackend;
let userA: AuthUser;
let userB: AuthUser;
const idle = { status: "idle" } as const;

function signInAs(user: AuthUser | null) {
  session.user = user;
  session.client = user ? backend.clientFor(user.id) : null;
}

async function runPendingWork() {
  const tasks = session.pending.splice(0);
  for (const task of tasks) await task();
}

function form(values: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

function uploadRequest(
  bytes: Uint8Array | null,
  name: string,
  type: string,
  options: { origin?: string; path?: string } = {},
): Request {
  const body = new FormData();
  if (bytes) body.set("file", new File([Uint8Array.from(bytes)], name, { type }));
  return new Request(`http://localhost:3000${options.path ?? "/resume/upload"}`, {
    method: "POST",
    headers: { host: "localhost:3000", origin: options.origin ?? "http://localhost:3000" },
    body,
  });
}

beforeAll(async () => {
  backend = await createTestBackend();
});

afterAll(async () => {
  await backend.close();
});

beforeEach(async () => {
  await backend.database.reset();
  backend.emulator.objects.clear();
  session.pending.length = 0;
  vi.mocked(refresh).mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const make = async (email: string): Promise<AuthUser> => ({
    id: await backend.createUser(email),
    email,
    name: null,
    createdAt: null,
  });
  userA = await make("a@example.test");
  userB = await make("b@example.test");
  signInAs(userA);
});

describe("profile actions", () => {
  it("refuses to run without a signed-in user and writes nothing", async () => {
    signInAs(null);
    await expect(actions.saveIdentityAction(idle, form({ fullName: "Ada" }))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    signInAs(userA);
    expect(
      (await getCandidateProfile(backend.clientFor(userA.id), userA.id)).identity.fullName,
    ).toBeNull();
  });

  it("validates on the server and stores nothing when input is invalid", async () => {
    const state = await actions.saveCareerAction(idle, form({ experienceLevel: "wizard" }));
    expect(state).toMatchObject({
      status: "error",
      fieldErrors: { experienceLevel: expect.any(String) },
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("saves a section, refreshes the page, and persists", async () => {
    const state = await actions.saveIdentityAction(
      idle,
      form({ fullName: " Ada  Example ", headline: "Engineer", location: "" }),
    );
    expect(state).toMatchObject({ status: "success", message: "Personal details saved." });
    expect(refresh).toHaveBeenCalledTimes(1);
    const profile = await getCandidateProfile(backend.clientFor(userA.id), userA.id);
    expect(profile.identity).toMatchObject({
      fullName: "Ada Example",
      headline: "Engineer",
      location: null,
    });
  });

  it("creates and updates entries, and only the owner can change them", async () => {
    await actions.saveEntryAction(
      "education",
      idle,
      form({ institution: "Example University", startDate: "2014-09" }),
    );
    const [entry] = (await getCandidateProfile(backend.clientFor(userA.id), userA.id)).education;
    expect(entry).toMatchObject({ institution: "Example University", startDate: "2014-09" });

    const update = await actions.saveEntryAction(
      "education",
      idle,
      form({ id: entry!.id, institution: "Example University", degree: "BSc" }),
    );
    expect(update.status).toBe("success");

    signInAs(userB);
    const hijack = await actions.saveEntryAction(
      "education",
      idle,
      form({ id: entry!.id, institution: "Taken over" }),
    );
    expect(hijack).toMatchObject({ status: "error" });
    const removal = await actions.deleteEntryAction("education", idle, form({ id: entry!.id }));
    expect(removal).toMatchObject({ status: "error" });

    const after = (await getCandidateProfile(backend.clientFor(userA.id), userA.id)).education;
    expect(after).toEqual([
      expect.objectContaining({ institution: "Example University", degree: "BSc" }),
    ]);
  });

  it("rejects unknown sections and malformed ids", async () => {
    // A tampered bound argument cannot reach another table.
    const state = await actions.saveEntryAction("profiles" as never, idle, form({ name: "x" }));
    expect(state.status).toBe("error");
    expect(
      (await actions.deleteEntryAction("projects", idle, form({ id: "1 or 1=1" }))).status,
    ).toBe("error");
  });

  it("adds, renames, and removes skills, rejecting duplicates", async () => {
    expect(
      (await actions.addSkillAction(idle, form({ name: "TypeScript", category: "programming" })))
        .status,
    ).toBe("success");
    const duplicate = await actions.addSkillAction(
      idle,
      form({ name: "typescript", category: "programming" }),
    );
    expect(duplicate).toMatchObject({
      status: "error",
      fieldErrors: { name: "This skill is already in your profile." },
    });

    const [skill] = (await getCandidateProfile(backend.clientFor(userA.id), userA.id)).skills;
    await actions.updateSkillAction(
      idle,
      form({ id: skill!.id, name: "TypeScript", category: "frontend" }),
    );
    expect(
      (await getCandidateProfile(backend.clientFor(userA.id), userA.id)).skills[0]?.category,
    ).toBe("frontend");

    signInAs(userB);
    expect((await actions.deleteSkillAction(idle, form({ id: skill!.id }))).status).toBe("error");
    signInAs(userA);
    expect((await actions.deleteSkillAction(idle, form({ id: skill!.id }))).status).toBe("success");
  });
});

describe("resume upload, processing, replace, and delete", () => {
  it("rejects cross-site and signed-out uploads", async () => {
    const crossSite = await routes.handleResumeUpload(
      uploadRequest(buildPdf(), "resume.pdf", "application/pdf", {
        origin: "https://evil.example",
      }),
    );
    expect(crossSite.status).toBe(403);
    signInAs(null);
    const signedOut = await routes.handleResumeUpload(
      uploadRequest(buildPdf(), "resume.pdf", "application/pdf"),
    );
    expect(signedOut.status).toBe(401);
    expect(backend.emulator.objects.size).toBe(0);
  });

  it("validates files on the server", async () => {
    const cases: Array<[Uint8Array | null, string, string, number, string]> = [
      [null, "", "", 400, "missing"],
      [executableBytes(), "setup.exe", "application/x-msdownload", 415, "unsupported_type"],
      [executableBytes(), "resume.pdf", "application/pdf", 400, "mismatched_content"],
      [buildPdf(), "resume.docx", "", 400, "mismatched_content"],
      [new Uint8Array(0), "resume.pdf", "application/pdf", 400, "empty"],
      [new Uint8Array(6 * 1024 * 1024), "resume.pdf", "application/pdf", 413, "too_large"],
    ];
    for (const [bytes, name, type, status, error] of cases) {
      const response = await routes.handleResumeUpload(uploadRequest(bytes, name, type));
      expect(response.status, name).toBe(status);
      expect(await response.json()).toMatchObject({ error, message: expect.any(String) });
    }
    expect(backend.emulator.objects.size).toBe(0);
    expect(await listResumeFiles(backend.clientFor(userA.id), userA.id)).toEqual([]);
  });

  it("stores a valid resume, then processes it after responding", async () => {
    const response = await routes.handleResumeUpload(
      uploadRequest(buildPdf(), "Jordan Resume.pdf", "application/pdf"),
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = (await response.json()) as { resume: { id: string; status: string } };
    expect(body.resume.status).toBe("uploaded");

    const db = backend.clientFor(userA.id);
    const stored = await getCurrentResume(db, userA.id);
    expect(stored).toMatchObject({
      fileName: "Jordan Resume.pdf",
      fileType: "pdf",
      status: "uploaded",
    });
    expect(
      backend.emulator.objects.has(`resumes/user/${userA.id}/resume/${stored!.id}/original.pdf`),
    ).toBe(true);

    await runPendingWork();
    expect(await getCurrentResume(db, userA.id)).toMatchObject({
      status: "processed",
      parsedVersion: 1,
    });
    expect(await getResumeParse(db, userA.id, stored!.id)).toMatchObject({
      email: "jordan.example@example.test",
      skillNames: expect.arrayContaining(["TypeScript", "React"]),
    });
  });

  it("records a failed processing state with a code", async () => {
    await routes.handleResumeUpload(
      uploadRequest(buildPdf(["Scan"]), "scan.pdf", "application/pdf"),
    );
    await runPendingWork();
    expect(await getCurrentResume(backend.clientFor(userA.id), userA.id)).toMatchObject({
      status: "failed",
      processingError: "no_text",
    });
  });

  it("replaces the previous resume and leaves no orphaned files", async () => {
    await routes.handleResumeUpload(uploadRequest(buildPdf(), "first.pdf", "application/pdf"));
    await runPendingWork();
    const first = await getCurrentResume(backend.clientFor(userA.id), userA.id);

    const response = await routes.handleResumeUpload(
      uploadRequest(
        buildDocx(),
        "second.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    );
    expect(response.status).toBe(201);
    await runPendingWork();

    const files = await listResumeFiles(backend.clientFor(userA.id), userA.id);
    expect(files).toHaveLength(1);
    expect(files[0]?.id).not.toBe(first?.id);
    expect([...backend.emulator.objects.keys()]).toEqual(
      [files[0]!.storagePath].map((path) => `resumes/${path}`),
    );
    expect(await getResumeParse(backend.clientFor(userA.id), userA.id, first!.id)).toBeNull();
  });

  it("serves the file only to its owner, with private headers", async () => {
    await routes.handleResumeUpload(uploadRequest(buildPdf(), "résumé.pdf", "application/pdf"));
    const download = await routes.handleResumeDownload();
    expect(download.status).toBe(200);
    expect(download.headers.get("content-type")).toBe("application/pdf");
    expect(download.headers.get("cache-control")).toBe("private, no-store");
    expect(download.headers.get("x-content-type-options")).toBe("nosniff");
    expect(download.headers.get("content-disposition")).toBe(
      `attachment; filename="r_sum_.pdf"; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf`,
    );
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(buildPdf());

    signInAs(userB);
    expect((await routes.handleResumeDownload()).status).toBe(404);
    signInAs(null);
    expect((await routes.handleResumeDownload()).status).toBe(401);
  });

  it("deletes the file and its metadata together", async () => {
    await routes.handleResumeUpload(uploadRequest(buildPdf(), "resume.pdf", "application/pdf"));
    await runPendingWork();
    const resume = await getCurrentResume(backend.clientFor(userA.id), userA.id);

    signInAs(userB);
    expect((await actions.deleteResumeAction(idle, form({ id: resume!.id }))).status).toBe("error");
    expect(backend.emulator.objects.size).toBe(1);

    signInAs(userA);
    expect(await actions.deleteResumeAction(idle, form({ id: resume!.id }))).toMatchObject({
      status: "success",
      message: "Resume deleted.",
    });
    expect(backend.emulator.objects.size).toBe(0);
    expect(await getCurrentResume(backend.clientFor(userA.id), userA.id)).toBeNull();
    expect(await getResumeParse(backend.clientFor(userA.id), userA.id, resume!.id)).toBeNull();
  });

  it("retries processing of a failed resume from the stored file", async () => {
    await routes.handleResumeUpload(
      uploadRequest(buildPdf(["Scan"]), "scan.pdf", "application/pdf"),
    );
    await runPendingWork();
    const failed = await getCurrentResume(backend.clientFor(userA.id), userA.id);
    expect(failed?.status).toBe("failed");

    const state = await actions.retryResumeProcessingAction(idle, form({ id: failed!.id }));
    expect(state.status).toBe("success");
    expect((await getCurrentResume(backend.clientFor(userA.id), userA.id))?.status).toBe(
      "processing",
    );
    await runPendingWork();
    // The stored file still has no text, so it fails again, with the same code.
    expect(await getCurrentResume(backend.clientFor(userA.id), userA.id)).toMatchObject({
      status: "failed",
      processingError: "no_text",
    });
  });

  it("adds only skills the resume really contains, never overwriting existing ones", async () => {
    await actions.addSkillAction(idle, form({ name: "typescript", category: "frontend" }));
    await routes.handleResumeUpload(uploadRequest(buildPdf(), "resume.pdf", "application/pdf"));
    await runPendingWork();
    const resume = await getCurrentResume(backend.clientFor(userA.id), userA.id);

    const state = await actions.addResumeSkillsAction(
      idle,
      form({ resumeId: resume!.id, skill: ["TypeScript", "React", "Docker", "Cobol"] }),
    );
    expect(state).toMatchObject({ status: "success", message: "2 skills added to your profile." });
    const skills = (await getCandidateProfile(backend.clientFor(userA.id), userA.id)).skills;
    expect(skills.map((skill) => [skill.name, skill.category, skill.source])).toEqual([
      ["typescript", "frontend", "user"],
      ["React", "frontend", "resume"],
      ["Docker", "devops", "resume"],
    ]);

    signInAs(userB);
    const other = await actions.addResumeSkillsAction(
      idle,
      form({ resumeId: resume!.id, skill: ["React"] }),
    );
    expect(other.status).toBe("error");
  });
});

describe("profile photo", () => {
  it("uploads, serves with revalidation, replaces, and removes a photo", async () => {
    const upload = await routes.handleAvatarUpload(
      uploadRequest(buildPng(), "me.png", "image/png", { path: "/profile/avatar" }),
    );
    expect(upload.status).toBe(201);
    const { avatarId } = (await upload.json()) as { avatarId: string };

    const request = new Request("http://localhost:3000/profile/avatar");
    const image = await routes.handleAvatarDownload(request);
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/png");
    expect(image.headers.get("cache-control")).toBe("private, no-cache");
    const etag = image.headers.get("etag")!;
    const cached = await routes.handleAvatarDownload(
      new Request("http://localhost:3000/profile/avatar", { headers: { "if-none-match": etag } }),
    );
    expect(cached.status).toBe(304);

    await routes.handleAvatarUpload(
      uploadRequest(buildPng(), "new.png", "image/png", { path: "/profile/avatar" }),
    );
    expect([...backend.emulator.objects.keys()]).toHaveLength(1);
    expect([...backend.emulator.objects.keys()][0]).not.toContain(avatarId);

    signInAs(userB);
    expect((await routes.handleAvatarDownload(request)).status).toBe(404);
    signInAs(userA);
    await actions.removeAvatarAction(idle, new FormData());
    expect(backend.emulator.objects.size).toBe(0);
    expect((await routes.handleAvatarDownload(request)).status).toBe(404);
  });

  it("rejects files that are not images", async () => {
    const svg = await routes.handleAvatarUpload(
      uploadRequest(new TextEncoder().encode("<svg/>"), "me.svg", "image/svg+xml", {
        path: "/profile/avatar",
      }),
    );
    expect(svg.status).toBe(415);
    const disguised = await routes.handleAvatarUpload(
      uploadRequest(buildPdf(), "me.png", "image/png", { path: "/profile/avatar" }),
    );
    expect(disguised.status).toBe(400);
  });
});
