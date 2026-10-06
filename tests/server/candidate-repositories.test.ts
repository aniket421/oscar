// @vitest-environment node
/**
 * Integration tests: the repositories run through the real Supabase client against the
 * emulator, so every read and write passes through the real RLS policies.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { DataAccessError } from "@/server/candidate/errors";
import {
  addSkill,
  addSkills,
  countEntries,
  createEntry,
  deleteEntry,
  deleteSkill,
  getCandidateProfile,
  getProfileIdentity,
  saveCareer,
  saveGoals,
  saveIdentity,
  updateEntry,
  updateSkill,
} from "@/server/candidate/profile-repository";
import {
  getCurrentResume,
  getResumeParse,
  insertResume,
  listResumeFiles,
  saveResumeParse,
  setResumeStatus,
} from "@/server/candidate/resume-repository";
import {
  downloadObject,
  listFolder,
  removeObjects,
  removeOrphanedResumeObjects,
  RESUME_BUCKET,
  resumeObjectPath,
  uploadObject,
} from "@/server/candidate/storage";

import { buildPdf } from "../fixtures/resume-files";
import { createTestBackend, type TestBackend } from "../support/supabase/test-clients";

let backend: TestBackend;
let userA: string;
let userB: string;

beforeAll(async () => {
  backend = await createTestBackend();
});

afterAll(async () => {
  await backend.close();
});

beforeEach(async () => {
  await backend.database.reset();
  backend.emulator.objects.clear();
  userA = await backend.createUser("a@example.test");
  userB = await backend.createUser("b@example.test");
});

const experience = {
  company: "Example Labs",
  title: "Engineer",
  startDate: "2021-03",
  endDate: null,
  isCurrent: true,
  responsibilities: "Built things.",
  achievements: null,
  technologies: ["TypeScript", "PostgreSQL"],
};

async function expectDataError(promise: Promise<unknown>, kind: DataAccessError["kind"]) {
  await expect(promise).rejects.toMatchObject({ name: "DataAccessError", kind });
}

describe("profile repository", () => {
  it("returns an empty profile for a new user (no rows yet)", async () => {
    const profile = await getCandidateProfile(backend.clientFor(userA), userA);
    expect(profile.identity).toEqual({
      fullName: null,
      headline: null,
      location: null,
      avatarId: null,
    });
    expect(profile.education).toEqual([]);
    expect(profile.skills).toEqual([]);
  });

  it("creates, updates, and retrieves every section", async () => {
    const db = backend.clientFor(userA);
    await saveIdentity(db, userA, {
      fullName: "Ada Example",
      headline: "Engineer",
      location: "Lisbon",
    });
    await saveCareer(db, userA, {
      targetRole: "Backend engineer",
      targetIndustry: "Fintech",
      experienceLevel: "mid",
      yearsOfExperience: 5,
      workArrangements: ["remote", "hybrid"],
    });
    await saveGoals(db, userA, {
      goalPosition: "Staff engineer",
      targetCompanies: ["Example Co"],
      areasToImprove: ["System design"],
    });
    const id = await createEntry(db, "experience", userA, experience);
    await createEntry(db, "education", userA, {
      institution: "Example University",
      degree: "BSc",
      fieldOfStudy: "Computer Science",
      startDate: "2014-09",
      endDate: "2018-06",
      grade: null,
    });
    // Saving one section never clears another.
    await saveIdentity(db, userA, {
      fullName: "Ada Example",
      headline: "Senior engineer",
      location: null,
    });

    const profile = await getCandidateProfile(db, userA);
    expect(profile.identity).toMatchObject({
      fullName: "Ada Example",
      headline: "Senior engineer",
      location: null,
    });
    expect(profile.career).toEqual({
      targetRole: "Backend engineer",
      targetIndustry: "Fintech",
      experienceLevel: "mid",
      yearsOfExperience: 5,
      workArrangements: ["remote", "hybrid"],
    });
    expect(profile.goals.areasToImprove).toEqual(["System design"]);
    expect(profile.experience).toEqual([{ id, ...experience }]);
    expect(profile.education[0]).toMatchObject({ startDate: "2014-09", endDate: "2018-06" });

    await updateEntry(db, "experience", userA, id, { ...experience, title: "Senior engineer" });
    expect((await getCandidateProfile(db, userA)).experience[0]?.title).toBe("Senior engineer");
    expect(await countEntries(db, "experience", userA)).toBe(1);

    await deleteEntry(db, "experience", userA, id);
    expect((await getCandidateProfile(db, userA)).experience).toEqual([]);
  });

  it("keeps each user's profile private, even when the other user's id is passed", async () => {
    const dbA = backend.clientFor(userA);
    const dbB = backend.clientFor(userB);
    await saveIdentity(dbA, userA, { fullName: "Ada Example", headline: null, location: null });
    const id = await createEntry(dbA, "projects", userA, {
      name: "Private project",
      description: null,
      role: null,
      technologies: [],
      outcomes: null,
      url: null,
    });

    const seenByB = await getCandidateProfile(dbB, userA);
    expect(seenByB.identity.fullName).toBeNull();
    expect(seenByB.projects).toEqual([]);
    expect(await getProfileIdentity(dbB, userA)).toBeNull();

    await expectDataError(
      updateEntry(dbB, "projects", userA, id, {
        name: "Taken over",
        description: null,
        role: null,
        technologies: [],
        outcomes: null,
        url: null,
      }),
      "not_found",
    );
    await expectDataError(deleteEntry(dbB, "projects", userB, id), "not_found");
    await expectDataError(
      saveIdentity(dbB, userA, { fullName: "Impostor", headline: null, location: null }),
      "unauthorized",
    );
    expect((await getCandidateProfile(dbA, userA)).projects[0]?.name).toBe("Private project");
  });

  it("denies unauthenticated access", async () => {
    const anon = backend.anonymousClient();
    await expectDataError(getCandidateProfile(anon, userA), "unauthorized");
    await expectDataError(
      saveIdentity(anon, userA, { fullName: "Nobody", headline: null, location: null }),
      "unauthorized",
    );
  });

  it("rejects values the database constraints forbid", async () => {
    const db = backend.clientFor(userA);
    await expectDataError(
      createEntry(db, "education", userA, {
        institution: "Example University",
        degree: null,
        fieldOfStudy: null,
        startDate: "2020-09",
        endDate: "2019-06",
        grade: null,
      }),
      "invalid",
    );
  });
});

describe("skills", () => {
  it("adds, edits, categorizes, and removes skills", async () => {
    const db = backend.clientFor(userA);
    const skill = await addSkill(db, userA, { name: "TypeScript", category: "programming" });
    expect(skill).toMatchObject({ name: "TypeScript", category: "programming", source: "user" });
    await updateSkill(db, userA, skill.id, { name: "TypeScript", category: "frontend" });
    expect((await getCandidateProfile(db, userA)).skills[0]?.category).toBe("frontend");
    await deleteSkill(db, userA, skill.id);
    expect((await getCandidateProfile(db, userA)).skills).toEqual([]);
  });

  it("rejects duplicates regardless of case", async () => {
    const db = backend.clientFor(userA);
    await addSkill(db, userA, { name: "React", category: "frontend" });
    await expectDataError(addSkill(db, userA, { name: "react", category: "frontend" }), "conflict");
  });

  it("protects one user's skills from another", async () => {
    const skill = await addSkill(backend.clientFor(userA), userA, {
      name: "Go",
      category: "programming",
    });
    const dbB = backend.clientFor(userB);
    await expectDataError(
      updateSkill(dbB, userB, skill.id, { name: "Rust", category: "programming" }),
      "not_found",
    );
    await expectDataError(deleteSkill(dbB, userA, skill.id), "not_found");
    expect((await getCandidateProfile(backend.clientFor(userA), userA)).skills).toHaveLength(1);
  });

  it("marks skills added from a resume", async () => {
    const db = backend.clientFor(userA);
    const resumeId = crypto.randomUUID();
    await insertResume(db, {
      id: resumeId,
      userId: userA,
      fileName: "resume.pdf",
      storagePath: resumeObjectPath(userA, resumeId, "pdf"),
      fileType: "pdf",
      fileSize: 100,
    });
    await addSkills(db, userA, [{ name: "Docker", category: "devops" }], resumeId);
    expect((await getCandidateProfile(db, userA)).skills).toEqual([
      expect.objectContaining({ name: "Docker", source: "resume" }),
    ]);
    // User B cannot claim user A's resume as a skill source.
    await expectDataError(
      addSkills(
        backend.clientFor(userB),
        userB,
        [{ name: "Docker", category: "devops" }],
        resumeId,
      ),
      "unauthorized",
    );
  });
});

describe("resumes and storage", () => {
  it("records resume metadata and processing states", async () => {
    const db = backend.clientFor(userA);
    const id = crypto.randomUUID();
    await insertResume(db, {
      id,
      userId: userA,
      fileName: "Ada Example resume.pdf",
      storagePath: resumeObjectPath(userA, id, "pdf"),
      fileType: "pdf",
      fileSize: 2048,
    });
    expect(await getCurrentResume(db, userA)).toMatchObject({
      id,
      status: "uploaded",
      processingError: null,
    });

    await setResumeStatus(db, userA, id, { status: "processing" });
    expect((await getCurrentResume(db, userA))?.status).toBe("processing");

    await saveResumeParse(db, userA, {
      resumeId: id,
      parserVersion: 1,
      email: "ada@example.test",
      phone: null,
      links: [],
      summary: null,
      detectedSections: ["skills"],
      skillNames: ["TypeScript"],
      wordCount: 120,
      pageCount: 1,
    });
    await setResumeStatus(db, userA, id, { status: "processed", parsedVersion: 1 });
    const processed = await getCurrentResume(db, userA);
    expect(processed).toMatchObject({ status: "processed", parsedVersion: 1 });
    expect(processed?.processedAt).not.toBeNull();
    expect((await getResumeParse(db, userA, id))?.skillNames).toEqual(["TypeScript"]);

    await setResumeStatus(db, userA, id, { status: "failed", error: "no_text" });
    expect(await getCurrentResume(db, userA)).toMatchObject({
      status: "failed",
      processingError: "no_text",
    });

    expect(await getCurrentResume(backend.clientFor(userB), userA)).toBeNull();
    expect(await getResumeParse(backend.clientFor(userB), userA, id)).toBeNull();
  });

  it("refuses a metadata row that points into another user's folder", async () => {
    const id = crypto.randomUUID();
    await expectDataError(
      insertResume(backend.clientFor(userA), {
        id,
        userId: userA,
        fileName: "resume.pdf",
        storagePath: resumeObjectPath(userB, id, "pdf"),
        fileType: "pdf",
        fileSize: 100,
      }),
      "invalid",
    );
  });

  it("stores files privately per user", async () => {
    const dbA = backend.clientFor(userA);
    const dbB = backend.clientFor(userB);
    const id = crypto.randomUUID();
    const path = resumeObjectPath(userA, id, "pdf");
    const bytes = buildPdf();
    await uploadObject(dbA, RESUME_BUCKET, path, bytes, "application/pdf");

    expect(await downloadObject(dbA, RESUME_BUCKET, path)).toEqual(bytes);
    await expectDataError(downloadObject(dbB, RESUME_BUCKET, path), "not_found");
    await expectDataError(
      downloadObject(backend.anonymousClient(), RESUME_BUCKET, path),
      "not_found",
    );
    await expectDataError(
      uploadObject(
        dbB,
        RESUME_BUCKET,
        resumeObjectPath(userA, crypto.randomUUID(), "pdf"),
        bytes,
        "application/pdf",
      ),
      "unauthorized",
    );
    expect(await listFolder(dbB, RESUME_BUCKET, `user/${userA}/resume`)).toEqual([]);

    // B's remove request silently affects nothing; A's file is still there.
    await removeObjects(dbB, RESUME_BUCKET, [path]);
    expect(backend.emulator.objects.has(`${RESUME_BUCKET}/${path}`)).toBe(true);
    await removeObjects(dbA, RESUME_BUCKET, [path]);
    expect(backend.emulator.objects.has(`${RESUME_BUCKET}/${path}`)).toBe(false);
  });

  it("rejects disallowed file types and sizes at the bucket", async () => {
    const db = backend.clientFor(userA);
    const path = resumeObjectPath(userA, crypto.randomUUID(), "pdf");
    await expectDataError(
      uploadObject(db, RESUME_BUCKET, path, buildPdf(), "application/x-msdownload"),
      "invalid",
    );
    await expectDataError(
      uploadObject(db, RESUME_BUCKET, path, new Uint8Array(5 * 1024 * 1024 + 1), "application/pdf"),
      "invalid",
    );
  });

  it("removes orphaned files that have no metadata row", async () => {
    const db = backend.clientFor(userA);
    const kept = crypto.randomUUID();
    const orphan = crypto.randomUUID();
    await uploadObject(
      db,
      RESUME_BUCKET,
      resumeObjectPath(userA, kept, "pdf"),
      buildPdf(),
      "application/pdf",
    );
    await uploadObject(
      db,
      RESUME_BUCKET,
      resumeObjectPath(userA, orphan, "pdf"),
      buildPdf(),
      "application/pdf",
    );
    expect(await removeOrphanedResumeObjects(db, userA, new Set([kept]))).toBe(1);
    expect(await listFolder(db, RESUME_BUCKET, `user/${userA}/resume`)).toEqual([kept]);
    expect(await listResumeFiles(db, userA)).toEqual([]);
  });
});
