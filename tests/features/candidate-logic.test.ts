import { describe, expect, it } from "vitest";

import {
  computeProfileCompleteness,
  emptyCandidateProfile,
  MIN_SKILLS,
} from "@/features/candidate/completeness";
import {
  checkAvatarBasics,
  checkResumeBasics,
  detectAvatarContent,
  detectResumeContent,
  formatFileSize,
  RESUME_MAX_BYTES,
  safeDisplayName,
  validateAvatarUpload,
  validateResumeUpload,
} from "@/features/candidate/resume-file";
import {
  categoryForSkill,
  findCatalogSkill,
  skillsCatalog,
} from "@/features/candidate/skills-catalog";
import {
  isUuid,
  normalizeList,
  normalizeUrl,
  parseYearMonth,
  readFormInput,
  validateCareer,
  validateCertification,
  validateEducation,
  validateExperience,
  validateGoals,
  validateIdentity,
  validateProject,
  validateSkill,
} from "@/features/candidate/validation";
import { readZipEntries } from "@/lib/zip";
import type { CandidateProfile, Resume } from "@/types/candidate";

import { buildDocx, buildPdf, buildPng, buildZip, executableBytes } from "../fixtures/resume-files";

describe("field normalization", () => {
  it("parses months and rejects anything else", () => {
    expect(parseYearMonth("2024-06")).toBe("2024-06");
    expect(parseYearMonth("  ")).toBeNull();
    for (const value of ["2024-13", "2024-6", "1890-01", "June 2024", "2024-06-01"]) {
      expect(parseYearMonth(value)).toBe("invalid");
    }
  });

  it("splits lists, trims, and drops duplicates ignoring case", () => {
    expect(normalizeList(" React, react ,\nNode.js,, ")).toEqual(["React", "Node.js"]);
  });

  it("accepts only http and https addresses", () => {
    expect(normalizeUrl("github.com/ada")).toBe("https://github.com/ada");
    expect(normalizeUrl("https://example.com/portfolio")).toBe("https://example.com/portfolio");
    expect(normalizeUrl("")).toBeNull();
    for (const value of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "mailto:a@b.co",
      "not a url",
      "localhost",
    ]) {
      expect(normalizeUrl(value)).toBe("invalid");
    }
  });

  it("recognizes UUIDs only", () => {
    expect(isUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBe(true);
    expect(isUuid("1; drop table skills")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });

  it("reads repeated form fields as lists", () => {
    const form = new FormData();
    form.append("workArrangements", "remote");
    form.append("workArrangements", "hybrid");
    form.set("targetRole", "Engineer");
    expect(readFormInput(form)).toEqual({
      workArrangements: ["remote", "hybrid"],
      targetRole: "Engineer",
    });
  });
});

describe("section validation", () => {
  it("normalizes personal details and enforces lengths", () => {
    expect(
      validateIdentity({ fullName: "  Ada   Example ", headline: "", location: "Lisbon" }),
    ).toEqual({
      ok: true,
      value: { fullName: "Ada Example", headline: null, location: "Lisbon" },
    });
    const result = validateIdentity({ fullName: "x".repeat(121) });
    expect(result).toEqual({ ok: false, errors: { fullName: "Use 120 characters or fewer." } });
  });

  it("validates career details", () => {
    expect(
      validateCareer({
        targetRole: "Backend engineer",
        experienceLevel: "mid",
        yearsOfExperience: "5",
        workArrangements: ["hybrid", "remote"],
      }),
    ).toEqual({
      ok: true,
      value: {
        targetRole: "Backend engineer",
        targetIndustry: null,
        experienceLevel: "mid",
        yearsOfExperience: 5,
        workArrangements: ["remote", "hybrid"],
      },
    });
    const invalid = validateCareer({
      experienceLevel: "wizard",
      yearsOfExperience: "4.5",
      workArrangements: ["moon"],
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(Object.keys(invalid.errors).sort()).toEqual([
        "experienceLevel",
        "workArrangements",
        "yearsOfExperience",
      ]);
    }
  });

  it("limits goal lists", () => {
    expect(
      validateGoals({ targetCompanies: "A, B", areasToImprove: "System design" }),
    ).toMatchObject({
      ok: true,
      value: { targetCompanies: ["A", "B"], areasToImprove: ["System design"] },
    });
    const tooMany = Array.from({ length: 21 }, (_, index) => `Company ${index}`).join(",");
    expect(validateGoals({ targetCompanies: tooMany })).toEqual({
      ok: false,
      errors: { targetCompanies: "List up to 20 items." },
    });
  });

  it("requires names and checks date order for entries", () => {
    expect(validateEducation({ institution: "" })).toEqual({
      ok: false,
      errors: { institution: "Enter the school or institution." },
    });
    expect(
      validateEducation({ institution: "Uni", startDate: "2020-09", endDate: "2019-06" }),
    ).toEqual({
      ok: false,
      errors: { endDate: "The end date must be after the start date." },
    });
    expect(
      validateCertification({ name: "Cert", issuedOn: "2024-01", expiresOn: "2023-01" }),
    ).toEqual({
      ok: false,
      errors: { expiresOn: "The expiry date must be after the issue date." },
    });
  });

  it("drops the end date of a current role", () => {
    const result = validateExperience({
      company: "Example Labs",
      title: "Engineer",
      startDate: "2021-03",
      endDate: "2020-01",
      isCurrent: "on",
      technologies: "TypeScript, Go",
    });
    expect(result).toMatchObject({
      ok: true,
      value: { isCurrent: true, endDate: null, technologies: ["TypeScript", "Go"] },
    });
  });

  it("validates project links", () => {
    expect(validateProject({ name: "Tool", url: "javascript:alert(1)" })).toEqual({
      ok: false,
      errors: { url: "Enter a web address, like https://example.com." },
    });
    expect(validateProject({ name: "Tool", url: "example.com" })).toMatchObject({
      ok: true,
      value: { url: "https://example.com/" },
    });
  });

  it("validates skills and their category", () => {
    expect(validateSkill({ name: "Go", category: "programming" })).toEqual({
      ok: true,
      value: { name: "Go", category: "programming" },
    });
    expect(validateSkill({ name: "", category: "" })).toEqual({
      ok: false,
      errors: { name: "Enter a skill.", category: "Choose a category." },
    });
    expect(validateSkill({ name: "Go", category: "astrology" }).ok).toBe(false);
  });

  it("strips control characters from text", () => {
    expect(validateIdentity({ fullName: "Ada\u0000 Example\u0007" })).toMatchObject({
      ok: true,
      value: { fullName: "Ada Example" },
    });
  });
});

describe("profile completeness", () => {
  const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const resume = { status: "processed" } as Resume;

  it("starts at zero for an empty profile and lists every next step", () => {
    const result = computeProfileCompleteness({
      profile: emptyCandidateProfile(userId),
      resume: null,
    });
    expect(result).toMatchObject({ completed: 0, total: 10, percent: 0 });
    expect(result.missing.map((item) => item.action)).toContain("Add your latest project");
    expect(result.missing.map((item) => item.action)).toContain("Add your target role");
    expect(result.missing.map((item) => item.action)).toContain("Upload a resume");
  });

  it("changes with the stored data, item by item", () => {
    const profile: CandidateProfile = emptyCandidateProfile(userId);
    profile.identity.fullName = "Ada Example";
    profile.career.targetRole = "Engineer";
    const partial = computeProfileCompleteness({ profile, resume: null });
    expect(partial.completed).toBe(2);
    expect(partial.percent).toBe(20);

    profile.skills = Array.from({ length: MIN_SKILLS - 1 }, (_, index) => ({
      id: String(index),
      name: `Skill ${index}`,
      category: "tools" as const,
      source: "user" as const,
    }));
    expect(computeProfileCompleteness({ profile, resume }).completed).toBe(3);
    profile.skills.push({ id: "x", name: "Another", category: "tools", source: "user" });
    expect(computeProfileCompleteness({ profile, resume }).completed).toBe(4);
  });

  it("does not count a failed resume", () => {
    const failed = { status: "failed" } as Resume;
    const profile = emptyCandidateProfile(userId);
    expect(computeProfileCompleteness({ profile, resume: failed }).completed).toBe(0);
    expect(
      computeProfileCompleteness({ profile, resume: { status: "uploaded" } as Resume }).completed,
    ).toBe(1);
  });

  it("reaches 100 only when everything is present", () => {
    const profile = emptyCandidateProfile(userId);
    profile.identity = { fullName: "A", headline: "B", location: null, avatarId: null };
    profile.career.targetRole = "Engineer";
    profile.career.experienceLevel = "mid";
    profile.education = [
      {
        id: "1",
        institution: "U",
        degree: null,
        fieldOfStudy: null,
        startDate: null,
        endDate: null,
        grade: null,
      },
    ];
    profile.experience = [
      {
        id: "1",
        company: "C",
        title: "T",
        startDate: null,
        endDate: null,
        isCurrent: false,
        responsibilities: null,
        achievements: null,
        technologies: [],
      },
    ];
    profile.projects = [
      {
        id: "1",
        name: "P",
        description: null,
        role: null,
        technologies: [],
        outcomes: null,
        url: null,
      },
    ];
    profile.skills = ["a", "b", "c"].map((name) => ({
      id: name,
      name,
      category: "tools" as const,
      source: "user" as const,
    }));
    profile.goals.areasToImprove = ["Design"];
    expect(computeProfileCompleteness({ profile, resume }).percent).toBe(100);
    expect(computeProfileCompleteness({ profile, resume: null }).percent).toBe(90);
  });
});

describe("resume and photo file checks", () => {
  const pdf = buildPdf();
  const docx = buildDocx();

  it("accepts PDF and DOCX by name, type, and size", () => {
    expect(checkResumeBasics({ name: "cv.pdf", size: 10, type: "application/pdf" })).toEqual({
      ok: true,
      fileType: "pdf",
    });
    expect(checkResumeBasics({ name: "CV.DOCX", size: 10, type: "" })).toEqual({
      ok: true,
      fileType: "docx",
    });
    // What browsers send for files they do not recognize; the content check decides.
    expect(
      checkResumeBasics({ name: "cv.docx", size: 10, type: "application/octet-stream" }),
    ).toEqual({
      ok: true,
      fileType: "docx",
    });
  });

  it("rejects other types, empty and oversized files, and mismatched declared types", () => {
    expect(checkResumeBasics(null)).toEqual({ ok: false, error: "missing" });
    expect(
      checkResumeBasics({ name: "cv.exe", size: 10, type: "application/x-msdownload" }),
    ).toEqual({ ok: false, error: "unsupported_type" });
    expect(checkResumeBasics({ name: "cv.doc", size: 10, type: "application/msword" })).toEqual({
      ok: false,
      error: "unsupported_type",
    });
    expect(checkResumeBasics({ name: "cv.pdf", size: 10, type: "text/html" })).toEqual({
      ok: false,
      error: "unsupported_type",
    });
    expect(checkResumeBasics({ name: "cv.pdf", size: 0, type: "application/pdf" })).toEqual({
      ok: false,
      error: "empty",
    });
    expect(
      checkResumeBasics({ name: "cv.pdf", size: RESUME_MAX_BYTES + 1, type: "application/pdf" }),
    ).toEqual({ ok: false, error: "too_large" });
  });

  it("identifies files by their content", () => {
    expect(detectResumeContent(pdf)).toBe("pdf");
    expect(detectResumeContent(docx)).toBe("docx");
    expect(detectResumeContent(executableBytes())).toBeNull();
    // A ZIP that is not a Word document is not a resume.
    expect(detectResumeContent(buildZip([{ name: "payload.js", data: "alert(1)" }]))).toBeNull();
  });

  it("rejects a renamed executable or a PDF posing as DOCX", () => {
    const named = { name: "resume.pdf", type: "application/pdf", size: 0 };
    expect(validateResumeUpload(named, executableBytes())).toEqual({
      ok: false,
      error: "mismatched_content",
    });
    expect(validateResumeUpload({ ...named, name: "resume.docx", type: "" }, pdf)).toEqual({
      ok: false,
      error: "mismatched_content",
    });
    expect(validateResumeUpload(named, pdf)).toEqual({ ok: true, fileType: "pdf" });
  });

  it("checks profile photos the same way", () => {
    expect(checkAvatarBasics({ name: "me.jpeg", size: 10, type: "image/jpeg" })).toEqual({
      ok: true,
      fileType: "jpg",
    });
    expect(checkAvatarBasics({ name: "me.svg", size: 10, type: "image/svg+xml" })).toEqual({
      ok: false,
      error: "unsupported_type",
    });
    expect(detectAvatarContent(buildPng())).toBe("png");
    expect(validateAvatarUpload({ name: "me.png", type: "image/png", size: 0 }, pdf)).toEqual({
      ok: false,
      error: "mismatched_content",
    });
  });

  it("makes safe display names", () => {
    expect(safeDisplayName("C:\\Users\\ada\\My Resume.PDF", "pdf")).toBe("My Resume.pdf");
    expect(safeDisplayName('<script>"x".docx', "docx")).toBe("scriptx.docx");
    expect(safeDisplayName(".pdf", "pdf")).toBe("resume.pdf");
    expect(safeDisplayName(`${"a".repeat(400)}.pdf`, "pdf")).toHaveLength(255);
  });

  it("formats sizes for people", () => {
    expect(formatFileSize(900)).toBe("900 bytes");
    expect(formatFileSize(312 * 1024)).toBe("312 KB");
    expect(formatFileSize(1.4 * 1024 * 1024)).toBe("1.4 MB");
  });
});

describe("zip reader", () => {
  it("lists entries of a valid archive and rejects malformed ones", () => {
    const zip = buildZip([
      { name: "a.txt", data: "hello" },
      { name: "b/c.xml", data: "<x/>", stored: true },
    ]);
    expect(readZipEntries(zip)?.map((entry) => entry.name)).toEqual(["a.txt", "b/c.xml"]);
    expect(readZipEntries(zip.subarray(0, zip.length - 10))).toBeNull();
    expect(readZipEntries(new Uint8Array(10))).toBeNull();
  });
});

describe("skills catalog", () => {
  it("has unique names and finds skills by alias", () => {
    const names = skillsCatalog.map((skill) => skill.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    expect(findCatalogSkill("golang")?.name).toBe("Go");
    expect(findCatalogSkill("k8s")?.name).toBe("Kubernetes");
    expect(categoryForSkill("PostgreSQL")).toBe("database");
    expect(categoryForSkill("Something new")).toBe("tools");
  });
});
