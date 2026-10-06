import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardOverview } from "@/features/workspace";
import { emptyStates } from "@/features/workspace/content";

import { emptySnapshot, fixtureProfile, populatedSnapshot } from "../fixtures/workspace";

describe("DashboardOverview without data", () => {
  it("greets the user by first name and has one h1", () => {
    render(<DashboardOverview snapshot={emptySnapshot()} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Welcome, Fixture" })).toBeInTheDocument();
  });

  it("falls back to a neutral greeting without a name", () => {
    render(<DashboardOverview snapshot={emptySnapshot({ ...fixtureProfile, name: null })} />);
    expect(screen.getByRole("heading", { level: 1, name: "Welcome to Oscar" })).toBeInTheDocument();
  });

  it("offers the primary action toward interview setup without starting anything", () => {
    render(<DashboardOverview snapshot={emptySnapshot()} />);
    const region = screen.getByRole("region", { name: "Start a mock interview" });
    expect(within(region).getByRole("link", { name: "Start an interview" })).toHaveAttribute(
      "href",
      "/interviews/new",
    );
    expect(region).toHaveTextContent("Interview setup is being built");
  });

  it("shows every step of the preparation path as not started", () => {
    render(<DashboardOverview snapshot={emptySnapshot()} />);
    const region = screen.getByRole("region", { name: "Your preparation path" });
    expect(within(region).getAllByRole("listitem")).toHaveLength(4);
    expect(within(region).getAllByText("Not started")).toHaveLength(4);
    expect(region).toHaveTextContent("You have not started yet.");
  });

  it.each([
    ["Recent interviews", emptyStates.interviews],
    ["Resume", emptyStates.resume],
    ["Roadmap", emptyStates.roadmap],
  ])("explains the empty %s section: what, why, and next", (name, copy) => {
    render(<DashboardOverview snapshot={emptySnapshot()} />);
    const region = screen.getByRole("region", { name });
    expect(within(region).getByRole("heading", { name: copy.title })).toBeInTheDocument();
    expect(region).toHaveTextContent(copy.description);
    expect(region).toHaveTextContent(`Why it matters. ${copy.reason}`);
    expect(region).toHaveTextContent(`What's next. ${copy.next}`);
  });

  it("shows no practice history and no invented numbers", () => {
    const { container } = render(<DashboardOverview snapshot={emptySnapshot()} />);
    const region = screen.getByRole("region", { name: "Skill development" });
    expect(within(region).getAllByText("No practice yet")).toHaveLength(3);
    expect(container.textContent).not.toMatch(/\d+\s?%|score|streak|\d+ sessions?/i);
    expect(container.querySelectorAll("[role=progressbar]")).toHaveLength(0);
  });
});

describe("DashboardOverview with stored data (test fixtures)", () => {
  it("renders real records instead of empty states", () => {
    render(<DashboardOverview snapshot={populatedSnapshot()} />);
    const interviews = screen.getByRole("region", { name: "Recent interviews" });
    expect(within(interviews).getByText("Fixture Role")).toBeInTheDocument();
    expect(within(interviews).getByText("Completed")).toBeInTheDocument();
    expect(within(interviews).getByRole("link", { name: "View all" })).toHaveAttribute(
      "href",
      "/interviews",
    );

    expect(screen.getByText("fixture-resume.pdf")).toBeInTheDocument();
    expect(screen.getByText("Fixture step one")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Skill development" })).getByText("1 session"),
    ).toBeInTheDocument();
    expect(screen.getByText("4 of 4 steps complete.", { exact: false })).toBeInTheDocument();
  });
});
