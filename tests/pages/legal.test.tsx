import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ContactPage from "@/app/(marketing)/contact/page";
import { PrivacyPolicy, Terms } from "@/features/legal";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each([
  ["Privacy Policy", PrivacyPolicy],
  ["Terms & Conditions", Terms],
])("%s", (title, Component) => {
  it("renders a titled, dated document with linked contents", () => {
    const { container } = render(<Component />);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(container.querySelector("time")).toHaveAttribute("datetime", "2026-10-06");
    const toc = screen.getByRole("navigation", { name: "Contents" });
    for (const link of within(toc).getAllByRole("link")) {
      const id = link.getAttribute("href")!.slice(1);
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    }
  });

  it("describes Oscar as an interview preparation and coaching platform", () => {
    render(<Component />);
    expect(
      screen.getAllByText(/interview preparation and coaching platform/).length,
    ).toBeGreaterThan(0);
  });
});

describe("Privacy Policy content", () => {
  it("states only what the product collects today", () => {
    render(<PrivacyPolicy />);
    expect(
      screen.getByText(/does not yet collect interview recordings or interview answers/),
    ).toBeInTheDocument();
    expect(screen.getByText(/only cookies that are strictly necessary/)).toBeInTheDocument();
  });

  it("describes resume and profile collection, processing, and deletion", () => {
    render(<PrivacyPolicy />);
    expect(
      screen.getByRole("heading", { name: /\d+\. Resumes and profile information/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/full text of your resume is read only while it is processed/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not sent to any third-party service for analysis/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Deleting a resume removes the file/)).toBeInTheDocument();
  });
});

describe("Terms content", () => {
  it("does not promise interview outcomes", () => {
    render(<Terms />);
    expect(screen.getByText(/does not guarantee interview outcomes/)).toBeInTheDocument();
  });
});

describe("Contact page", () => {
  it("shows the configured address", () => {
    vi.stubEnv("CONTACT_EMAIL", "team@oscar.example");
    render(<ContactPage />);
    expect(screen.getByRole("link", { name: "team@oscar.example" })).toHaveAttribute(
      "href",
      "mailto:team@oscar.example",
    );
  });

  it("does not invent an address when none is configured", () => {
    vi.stubEnv("CONTACT_EMAIL", "");
    render(<ContactPage />);
    expect(screen.queryByRole("link", { name: /@/ })).not.toBeInTheDocument();
    expect(screen.getByText(/has not been published yet/)).toBeInTheDocument();
  });
});
