import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DesignSystemLayout from "@/app/design-system/layout";
import DesignSystemPage from "@/app/design-system/page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

function renderShowcase() {
  return render(
    <DesignSystemLayout params={Promise.resolve({})}>
      <DesignSystemPage />
    </DesignSystemLayout>,
  );
}

describe("/design-system", () => {
  it("renders the showcase in development", () => {
    renderShowcase();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Oscar design system" }),
    ).toBeInTheDocument();
  });

  it("links every section from the table of contents", () => {
    renderShowcase();
    const nav = screen.getByRole("navigation", { name: "Design system sections" });
    const links = within(nav).getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(15);
    for (const link of links) {
      const id = link.getAttribute("href")!.slice(1);
      const section = document.getElementById(id);
      expect(section, id).not.toBeNull();
      expect(section!.tagName).toBe("SECTION");
    }
  });

  it("demonstrates the required component families", () => {
    renderShowcase();
    for (const name of ["Primary", "Secondary", "Outline", "Ghost", "Destructive"]) {
      expect(screen.getAllByRole("button", { name }).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Target role" })).toBeInTheDocument();
    expect(screen.getAllByRole("switch").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("radio").length).toBeGreaterThan(0);
    expect(screen.getByRole("tablist", { name: "Example tabs" })).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Open dialog" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Notifications" })).toBeInTheDocument();
  });

  it("does not use duplicate ids", () => {
    const { container } = renderShowcase();
    const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("is not indexed by search engines", async () => {
    const { metadata } = await import("@/app/design-system/layout");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("returns 404 in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => renderShowcase()).toThrow("NEXT_NOT_FOUND");
  });
});
