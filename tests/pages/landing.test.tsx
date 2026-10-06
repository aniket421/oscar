import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/(marketing)/page";
import { SiteHeader } from "@/features/marketing";
import { capabilities, features, steps } from "@/features/marketing/content";

describe("landing page", () => {
  it("has exactly one h1 that says what Oscar is for", () => {
    render(<HomePage />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Practice the interview before it counts.");
    expect(screen.getByText(/runs realistic mock interviews/)).toBeInTheDocument();
  });

  it("labels every section landmark with its heading", () => {
    render(<HomePage />);
    for (const name of [
      "Built for the whole interview, not just the questions",
      "From first session to clear progress",
      "A first look at the interview screen",
      "Preparation built around how interviews actually work",
      "Built to be trusted with something that matters",
      "Start preparing for your next interview.",
    ]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
  });

  it("is upfront that capabilities are in development", () => {
    render(<HomePage />);
    const section = screen.getByRole("region", { name: capabilities.title });
    expect(within(section).getByText("In development")).toBeInTheDocument();
    expect(within(section).getAllByRole("listitem")).toHaveLength(capabilities.items.length);
  });

  it("shows the four steps and six features", () => {
    render(<HomePage />);
    expect(screen.getAllByRole("heading", { level: 3, name: /^Step \d: / })).toHaveLength(
      steps.items.length,
    );
    for (const feature of features.items) {
      expect(screen.getByRole("heading", { level: 3, name: feature.title })).toBeInTheDocument();
    }
  });

  it("keeps the interview preview inert and described in text", () => {
    const { container } = render(<HomePage />);
    const frame = container.querySelector("#preview [inert]");
    expect(frame).not.toBeNull();
    expect(screen.getByText(/Design preview\. Illustrative content/)).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("region", { name: "A first look at the interview screen" }),
      ).queryAllByRole("button"),
    ).toHaveLength(0);
  });

  it("links calls to action to real pages", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: "Start preparing" })).toHaveAttribute(
      "href",
      "/signup",
    );
    expect(screen.getByRole("link", { name: "Create your account" })).toHaveAttribute(
      "href",
      "/signup",
    );
    expect(screen.getByRole("link", { name: "See how it works" })).toHaveAttribute(
      "href",
      "/#how-it-works",
    );
  });

  it("does not render images, quotes, or percentages", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelectorAll("img, blockquote")).toHaveLength(0);
    expect(container.textContent).not.toMatch(/\d+\s?%/);
  });
});

describe("SiteHeader", () => {
  it("offers navigation, login, and signup", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "/#how-it-works",
    );
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
  });

  it("opens the mobile menu, closes it with Escape, and returns focus", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
  });

  it("closes the mobile menu after choosing a link", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const menu = screen.getByRole("navigation", { name: "Mobile" });
    await user.click(within(menu).getByRole("link", { name: "Log in" }));
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });
});
