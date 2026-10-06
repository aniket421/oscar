import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProfileCompleteness } from "@/features/candidate";
import type { Resume, ResumeOverview } from "@/types/candidate";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

// Server Actions are replaced: these tests cover the browser side of each form.
const actions = vi.hoisted(() => ({
  saveIdentityAction: vi.fn(),
  saveCareerAction: vi.fn(),
  saveGoalsAction: vi.fn(),
  saveEntryAction: vi.fn(),
  deleteEntryAction: vi.fn(),
  addSkillAction: vi.fn(),
  updateSkillAction: vi.fn(),
  deleteSkillAction: vi.fn(),
  addResumeSkillsAction: vi.fn(),
  deleteResumeAction: vi.fn(),
  retryResumeProcessingAction: vi.fn(),
  removeAvatarAction: vi.fn(),
}));
vi.mock("@/features/candidate/actions", () => actions);

const { CheckboxGroup } = await import("@/components/ui");
const { EditableSection } = await import("@/features/candidate/components/profile/section-editor");
const { CareerForm, IdentityForm } =
  await import("@/features/candidate/components/profile/section-forms");
const { ExperienceSection } =
  await import("@/features/candidate/components/profile/entry-sections");
const { SkillsSection } = await import("@/features/candidate/components/profile/skills-editor");
const { CompletenessSummary } =
  await import("@/features/candidate/components/completeness-summary");
const { CurrentResume } = await import("@/features/candidate/components/resume/current-resume");
const { ResumeFindings } = await import("@/features/candidate/components/resume/resume-findings");
const { ResumeAnalysisPanel } =
  await import("@/features/candidate/components/resume/resume-analysis");
const { ResumeUploader } = await import("@/features/candidate/components/resume/resume-uploader");

beforeEach(() => {
  for (const action of Object.values(actions)) action.mockReset();
  refresh.mockReset();
});

const resume: Resume = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  userId: "u1",
  fileName: "resume.pdf",
  fileType: "pdf",
  fileSize: 320 * 1024,
  status: "processed",
  processingError: null,
  parsedVersion: 1,
  uploadedAt: "2026-10-06T10:00:00.000Z",
  processedAt: "2026-10-06T10:00:03.000Z",
  createdAt: "2026-10-06T10:00:00.000Z",
  updatedAt: "2026-10-06T10:00:03.000Z",
};

describe("CheckboxGroup", () => {
  it("is a labelled fieldset of native checkboxes, operable by keyboard", async () => {
    const user = userEvent.setup();
    render(
      <CheckboxGroup
        legend="Preferred work type"
        name="work"
        options={[
          { value: "remote", label: "Remote" },
          { value: "hybrid", label: "Hybrid" },
        ]}
        defaultValue={["hybrid"]}
        error="Choose one."
      />,
    );
    const group = screen.getByRole("group", { name: "Preferred work type" });
    expect(group).toHaveAccessibleDescription("Choose one.");
    const remote = within(group).getByRole("checkbox", { name: "Remote" });
    expect(within(group).getByRole("checkbox", { name: "Hybrid" })).toBeChecked();
    await user.tab();
    expect(remote).toHaveFocus();
    await user.keyboard(" ");
    expect(remote).toBeChecked();
    expect(remote).toHaveAttribute("name", "work");
  });
});

describe("EditableSection with a profile form", () => {
  function renderSection() {
    return render(
      <EditableSection
        id="personal"
        title="Personal"
        description="How you appear in Oscar."
        editLabel="personal details"
        view={<p>Ada Example</p>}
        form={
          <IdentityForm
            identity={{ fullName: "Ada", headline: null, location: null, avatarId: null }}
          />
        }
      />,
    );
  }

  it("opens with focus in the form and returns focus to Edit on cancel", async () => {
    const user = userEvent.setup();
    renderSection();
    const region = screen.getByRole("region", { name: "Personal" });
    await user.click(within(region).getByRole("button", { name: "Edit personal details" }));
    expect(within(region).getByRole("form", { name: "Personal details" })).toBeInTheDocument();
    expect(within(region).getByLabelText("Full name")).toHaveFocus();
    await user.click(within(region).getByRole("button", { name: "Cancel" }));
    expect(within(region).getByRole("button", { name: "Edit personal details" })).toHaveFocus();
    expect(actions.saveIdentityAction).not.toHaveBeenCalled();
  });

  it("validates before sending and keeps what was typed", async () => {
    const user = userEvent.setup();
    render(
      <EditableSection
        id="career"
        title="Career"
        description="Where you are going."
        editLabel="career details"
        view={<p>Not added</p>}
        form={
          <CareerForm
            career={{
              targetRole: null,
              targetIndustry: null,
              experienceLevel: null,
              yearsOfExperience: null,
              workArrangements: [],
            }}
          />
        }
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit career details" }));
    await user.type(screen.getByLabelText("Target role"), "Backend engineer");
    const years = screen.getByLabelText("Years of experience");
    await user.type(years, "61");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(actions.saveCareerAction).not.toHaveBeenCalled();
    expect(years).toHaveAccessibleDescription("Enter a whole number from 0 to 60.");
    expect(years).toHaveAttribute("aria-invalid", "true");
    expect(years).toHaveFocus();
    expect(screen.getByLabelText("Target role")).toHaveValue("Backend engineer");
    // Editing the field clears its error.
    await user.type(years, "{Backspace}");
    expect(years).not.toHaveAttribute("aria-invalid");
  });

  it("closes, announces, and restores focus after a successful save", async () => {
    actions.saveIdentityAction.mockResolvedValue({
      status: "success",
      message: "Personal details saved.",
    });
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole("button", { name: "Edit personal details" }));
    await user.type(screen.getByLabelText("Headline"), "Engineer");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Personal details saved.");
    expect(screen.getByRole("button", { name: "Edit personal details" })).toHaveFocus();
    const formData = actions.saveIdentityAction.mock.calls[0]?.[1] as FormData;
    expect(formData.get("headline")).toBe("Engineer");
  });

  it("shows a server failure without losing input", async () => {
    actions.saveIdentityAction.mockResolvedValue({
      status: "error",
      message: "Oscar could not save right now. Check your connection and try again.",
    });
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole("button", { name: "Edit personal details" }));
    await user.type(screen.getByLabelText("Location"), "Lisbon");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Oscar could not save right now.");
    expect(screen.getByLabelText("Location")).toHaveValue("Lisbon");
  });
});

describe("ExperienceSection", () => {
  const entry = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    company: "Example Labs",
    title: "Engineer",
    startDate: "2021-03",
    endDate: null,
    isCurrent: true,
    responsibilities: "Built the billing service.",
    achievements: "Cut failures in half\n- Led a migration",
    technologies: ["TypeScript"],
  };

  it("lists entries with named actions and an empty state", () => {
    const { unmount } = render(<ExperienceSection entries={[entry]} />);
    const region = screen.getByRole("region", { name: "Experience" });
    expect(within(region).getByRole("heading", { name: "Engineer" })).toBeInTheDocument();
    expect(region).toHaveTextContent("Mar 2021 to present");
    expect(within(region).getByRole("list", { name: "Achievements" })).toHaveTextContent(
      "Led a migration",
    );
    expect(
      within(region).getByRole("button", { name: "Edit Engineer at Example Labs" }),
    ).toBeEnabled();
    expect(
      within(region).getByRole("button", { name: "Remove Engineer at Example Labs" }),
    ).toBeEnabled();
    unmount();
    render(<ExperienceSection entries={[]} />);
    expect(screen.getByText("No work experience added yet.")).toBeInTheDocument();
  });

  it("disables the end date for a current role", async () => {
    const user = userEvent.setup();
    render(<ExperienceSection entries={[]} />);
    await user.click(screen.getByRole("button", { name: "Add role" }));
    expect(screen.getByRole("textbox", { name: "Job title" })).toHaveFocus();
    await user.click(screen.getByRole("checkbox", { name: "I currently work here" }));
    expect(screen.getByLabelText("End")).toBeDisabled();
  });

  it("asks before removing, then runs the delete action with the entry id", async () => {
    actions.deleteEntryAction.mockResolvedValue({
      status: "success",
      message: "Experience removed.",
    });
    const user = userEvent.setup();
    render(<ExperienceSection entries={[entry]} />);
    await user.click(screen.getByRole("button", { name: "Remove Engineer at Example Labs" }));
    const dialog = screen.getByRole("dialog", { name: "Remove Engineer at Example Labs?" });
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(actions.deleteEntryAction).toHaveBeenCalledTimes(1);
    expect(actions.deleteEntryAction.mock.calls[0]?.[0]).toBe("experience");
    expect((actions.deleteEntryAction.mock.calls[0]?.[2] as FormData).get("id")).toBe(entry.id);
    expect(await screen.findByText("Experience removed.")).toBeInTheDocument();
  });
});

describe("SkillsSection", () => {
  const skills = [
    { id: "s1", name: "TypeScript", category: "programming" as const, source: "user" as const },
    { id: "s2", name: "Docker", category: "devops" as const, source: "resume" as const },
  ];

  it("groups skills by category and marks the ones from a resume", () => {
    render(<SkillsSection skills={skills} />);
    expect(screen.getByRole("heading", { name: "Programming" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DevOps" })).toBeInTheDocument();
    const docker = screen.getByRole("button", { name: "Edit Docker" }).closest("li")!;
    expect(docker).toHaveTextContent("From resume");
    expect(within(docker).getByRole("button", { name: "Remove Docker" })).toBeInTheDocument();
    const typescript = screen.getByRole("button", { name: "Edit TypeScript" }).closest("li")!;
    expect(typescript).not.toHaveTextContent("From resume");
  });

  it("suggests a category for catalog skills until one is chosen", async () => {
    const user = userEvent.setup();
    render(<SkillsSection skills={[]} />);
    await user.type(screen.getByLabelText("Skill"), "Kubernetes");
    expect(screen.getByLabelText("Category")).toHaveValue("devops");
  });

  it("requires a category for skills outside the catalog", async () => {
    const user = userEvent.setup();
    render(<SkillsSection skills={[]} />);
    await user.type(screen.getByLabelText("Skill"), "Something new");
    await user.click(screen.getByRole("button", { name: "Add skill" }));
    expect(actions.addSkillAction).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Category")).toHaveAccessibleDescription("Choose a category.");
  });
});

describe("CompletenessSummary", () => {
  const completeness: ProfileCompleteness = {
    items: [],
    completed: 3,
    total: 10,
    percent: 30,
    missing: [
      {
        id: "projects",
        label: "Projects",
        action: "Add your latest project",
        href: "/profile#projects",
        done: false,
      },
      { id: "resume", label: "Resume", action: "Upload a resume", href: "/resume", done: false },
    ],
  };

  it("shows the count, says it is not a rating, and links the next steps", () => {
    render(<CompletenessSummary completeness={completeness} />);
    expect(screen.getByRole("progressbar", { name: "3 of 10 complete" })).toHaveAttribute(
      "aria-valuenow",
      "30",
    );
    expect(screen.getByText(/It is not a rating of you/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your latest project" })).toHaveAttribute(
      "href",
      "/profile#projects",
    );
    expect(screen.getByRole("link", { name: "Upload a resume" })).toHaveAttribute(
      "href",
      "/resume",
    );
  });
});

describe("resume page components", () => {
  it("shows a processing resume with a progress bar and polling", () => {
    render(<CurrentResume resume={{ ...resume, status: "processing", processedAt: null }} />);
    const region = screen.getByRole("region", { name: "Current resume" });
    expect(within(region).getByRole("status")).toHaveTextContent("Processing");
    expect(
      within(region).getByRole("progressbar", { name: "Reading your resume" }),
    ).toBeInTheDocument();
    expect(within(region).getByRole("link", { name: "Download" })).toHaveAttribute(
      "href",
      "/resume/file",
    );
  });

  it("explains a failure and offers a retry only when retrying can help", () => {
    const { unmount } = render(
      <CurrentResume resume={{ ...resume, status: "failed", processingError: "internal" }} />,
    );
    expect(screen.getByText(/Something went wrong while reading your resume/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    unmount();
    render(<CurrentResume resume={{ ...resume, status: "failed", processingError: "no_text" }} />);
    expect(screen.getByText(/could not find any text/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("confirms before deleting", async () => {
    const user = userEvent.setup();
    render(<CurrentResume resume={resume} />);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: "Delete your resume?" });
    expect(dialog).toHaveAccessibleDescription(/permanently deletes the file/);
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(actions.deleteResumeAction).not.toHaveBeenCalled();
  });

  it("labels findings as coming from the resume and says what is not extracted", () => {
    const overview: ResumeOverview = {
      resume,
      parse: {
        resumeId: resume.id,
        parserVersion: 1,
        email: "ada@example.test",
        phone: null,
        links: ["https://github.com/ada"],
        summary: "Engineer.",
        detectedSections: ["experience", "skills"],
        skillNames: ["TypeScript", "Docker"],
        wordCount: 320,
        pageCount: 1,
      },
      analysis: null,
    };
    render(<ResumeFindings overview={overview} profileSkillNames={["typescript"]} />);
    const region = screen.getByRole("region", { name: "What Oscar found" });
    expect(region).toHaveTextContent("Read automatically from your resume.");
    expect(region).toHaveTextContent("ada@example.test");
    expect(region).toHaveTextContent("Not found");
    expect(region).toHaveTextContent("1 page · 320 words");
    expect(within(region).getByRole("checkbox", { name: "Docker" })).toBeChecked();
    expect(within(region).queryByRole("checkbox", { name: "TypeScript" })).not.toBeInTheDocument();
    expect(region).toHaveTextContent("Already in your profile");
    expect(within(region).getByRole("button", { name: "Add 1 skill to profile" })).toBeEnabled();
    expect(region).toHaveTextContent("does not extract work history");
  });

  it("never shows invented analysis", () => {
    const { container, rerender } = render(
      <ResumeAnalysisPanel status="processing" analysis={null} />,
    );
    expect(screen.getByText("Analysis will appear after processing.")).toBeInTheDocument();
    rerender(<ResumeAnalysisPanel status="processed" analysis={null} />);
    expect(screen.getByText(/Resume analysis is in development/)).toBeInTheDocument();
    rerender(<ResumeAnalysisPanel status="failed" analysis={null} />);
    expect(screen.getByText("Analysis needs a resume Oscar can read.")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d+\s?%|score|\d+\s?\/\s?\d+/i);
    expect(container.querySelectorAll("[role=progressbar]")).toHaveLength(0);
  });

  it("rejects an unsupported file before uploading", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { container } = render(<ResumeUploader />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, new File(["MZ"], "setup.exe", { type: "application/x-msdownload" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Upload a PDF or Word (.docx) file.");
    expect(screen.getByRole("button", { name: "Choose file" })).toHaveAccessibleDescription(
      /PDF or Word \(\.docx\), up to 5 MB/,
    );
  });
});
