// @vitest-environment node
import { describe, expect, it } from "vitest";

import { extractDocxText, wordprocessingText } from "@/features/candidate/processing/extract-docx";
import { extractPdfText, PDF_MAX_PAGES } from "@/features/candidate/processing/extract-pdf";
import {
  findSkills,
  headingSection,
  parseResumeText,
  SUMMARY_MAX_LENGTH,
} from "@/features/candidate/processing/parse-text";
import { parseResumeFile } from "@/features/candidate/processing/run";

import { buildDocx, buildPdf, buildZip, fixtureResumeLines } from "../fixtures/resume-files";

const text = fixtureResumeLines.join("\n");

describe("parseResumeText", () => {
  it("extracts contact details, links, summary, sections, and skills", () => {
    const parsed = parseResumeText(text);
    expect(parsed.email).toBe("jordan.example@example.test");
    expect(parsed.phone).toBe("+1 555 010 4477");
    expect(parsed.links).toEqual([
      "https://linkedin.com/in/jordan-example",
      "https://jordan.example.test/",
    ]);
    expect(parsed.summary).toBe(
      "Product engineer with six years of experience building web applications for small teams.",
    );
    expect(parsed.detectedSections).toEqual([
      "summary",
      "experience",
      "education",
      "skills",
      "projects",
    ]);
    expect(parsed.skillNames).toEqual([
      "TypeScript",
      "PostgreSQL",
      "Mentoring",
      "React",
      "Node.js",
      "Go",
      "Docker",
      "AWS",
      "Communication",
    ]);
    expect(parsed.wordCount).toBeGreaterThan(50);
  });

  it("returns nothing it cannot find instead of guessing", () => {
    const parsed = parseResumeText(
      "A short note without contact details or headings, written in prose.",
    );
    expect(parsed).toMatchObject({
      email: null,
      phone: null,
      links: [],
      summary: null,
      detectedSections: [],
      skillNames: [],
    });
  });

  it("does not mistake dates or years for phone numbers", () => {
    expect(parseResumeText("Ada Example\n2019 - 2021\n2020.01.15\nSkills\nGo").phone).toBeNull();
  });

  it("only takes contact details from the top of the resume", () => {
    const parsed = parseResumeText(
      "Ada Example\nada@example.test\nExperience\nWorked with ref@example.test and +44 20 7946 0000",
    );
    expect(parsed.email).toBe("ada@example.test");
    expect(parsed.phone).toBeNull();
  });

  it("recognizes headings in different styles", () => {
    expect(headingSection("WORK EXPERIENCE")).toBe("experience");
    expect(headingSection("Skills:")).toBe("skills");
    expect(headingSection("Licenses & Certifications")).toBe("certifications");
    expect(headingSection("Experience building data pipelines for five teams")).toBeNull();
  });

  it("only counts ambiguous words as skills inside a skills section", () => {
    expect(findSkills("We go to Spring meetings and excel at R and C.", "")).toEqual([]);
    expect(findSkills("Skills\nGo, R, C", "Go, R, C")).toEqual(["Go", "R", "C"]);
    expect(findSkills("Golang services", "")).toEqual(["Go"]);
  });

  it("matches symbols and dotted names as whole tokens", () => {
    expect(findSkills("C++ and C# with .NET and Node.js", "")).toEqual([
      "C++",
      "C#",
      ".NET",
      "Node.js",
    ]);
    expect(findSkills("JavaScript", "")).toEqual(["JavaScript"]);
    expect(findSkills("Javanese", "")).toEqual([]);
  });

  it("caps the summary length", () => {
    const long = `Summary\n${"word ".repeat(400)}\nExperience\nRole`;
    const summary = parseResumeText(long).summary ?? "";
    expect(summary.length).toBeLessThanOrEqual(SUMMARY_MAX_LENGTH + 1);
    expect(summary.endsWith("…")).toBe(true);
  });
});

describe("text extraction", () => {
  it("reads a PDF with its page count", async () => {
    const result = await extractPdfText(buildPdf());
    expect(result.pageCount).toBe(1);
    expect(result.text).toContain("jordan.example@example.test");
    expect(result.text).toContain("Skills");
  });

  it("refuses PDFs that are too long or unreadable", async () => {
    await expect(extractPdfText(buildPdf(["Page"], PDF_MAX_PAGES + 1))).rejects.toMatchObject({
      code: "too_many_pages",
    });
    await expect(extractPdfText(new TextEncoder().encode("%PDF-1.4 broken"))).rejects.toMatchObject(
      {
        code: "unreadable",
      },
    );
  });

  it("reads DOCX text, including page headers", () => {
    const result = extractDocxText(
      buildDocx(["Summary", "Engineer & builder"], {
        headerLines: ["Ada Example", "ada@example.test"],
      }),
    );
    expect(result.pageCount).toBeNull();
    expect(result.text.split("\n").filter(Boolean)).toEqual([
      "Ada Example",
      "ada@example.test",
      "Summary",
      "Engineer & builder",
    ]);
  });

  it("keeps paragraphs, breaks, and tabs from WordprocessingML", () => {
    const xml =
      '<w:body><w:p><w:r><w:t>One</w:t><w:tab/><w:t xml:space="preserve">Two</w:t><w:br/><w:t>Three &amp; four</w:t></w:r></w:p><w:p/><w:p><w:r><w:t>&#x41;&#66;</w:t></w:r></w:p></w:body>';
    expect(wordprocessingText(xml)).toBe("One\tTwo\nThree & four\n\nAB\n");
  });

  it("refuses decompression bombs and broken archives", () => {
    const bomb = buildZip([
      { name: "[Content_Types].xml", data: "<Types/>" },
      { name: "word/document.xml", data: `<w:t>${"a".repeat(11 * 1024 * 1024)}</w:t>` },
    ]);
    expect(() => extractDocxText(bomb)).toThrow(expect.objectContaining({ code: "unreadable" }));
    expect(() => extractDocxText(new Uint8Array([0x50, 0x4b, 3, 4]))).toThrow(
      expect.objectContaining({ code: "unreadable" }),
    );
  });
});

describe("parseResumeFile", () => {
  it("produces the same findings from PDF and DOCX versions of a resume", async () => {
    const fromPdf = await parseResumeFile("pdf-id", buildPdf(), "pdf");
    const fromDocx = await parseResumeFile("docx-id", buildDocx(), "docx");
    expect(fromPdf).toMatchObject({ resumeId: "pdf-id", parserVersion: 1, pageCount: 1 });
    expect(fromDocx).toMatchObject({ resumeId: "docx-id", parserVersion: 1, pageCount: null });
    const { resumeId: _a, pageCount: _b, ...pdfFindings } = fromPdf;
    const { resumeId: _c, pageCount: _d, ...docxFindings } = fromDocx;
    expect(docxFindings).toEqual(pdfFindings);
  });

  it("fails with no_text when a file has almost no words", async () => {
    await expect(parseResumeFile("id", buildPdf(["Scan"]), "pdf")).rejects.toMatchObject({
      code: "no_text",
    });
  });
});
