import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/dashboard";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/features/auth/actions", () => ({ login: vi.fn(), signup: vi.fn(), logout: vi.fn() }));

const { NavList } = await import("@/features/workspace/components/shell/nav-list");
const { MobileNavigation } =
  await import("@/features/workspace/components/shell/mobile-navigation");
const { ProfileMenu } = await import("@/features/workspace/components/shell/profile-menu");
const { CurrentSection } = await import("@/features/workspace/components/shell/current-section");
const { PageHeader } = await import("@/features/workspace/components/shell/page-header");

beforeEach(() => {
  pathname = "/dashboard";
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

describe("NavList", () => {
  it("groups links and labels each list by its group", () => {
    render(<NavList />);
    for (const group of ["Workspace", "Preparation", "Account"]) {
      expect(screen.getByRole("list", { name: new RegExp(`^${group}`) })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Coding" })).toHaveAttribute(
      "href",
      "/practice/coding",
    );
  });

  it("marks only the current page", () => {
    pathname = "/interviews/new";
    render(<NavList />);
    expect(screen.getByRole("link", { name: "Interviews" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("labels areas that open later", () => {
    render(<NavList />);
    expect(screen.getByRole("list", { name: "Preparation Later" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Workspace" })).toBeInTheDocument();
  });

  it("reports navigation so a drawer can close", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn((event?: unknown) => event);
    render(<NavList onNavigate={onNavigate} />);
    const link = screen.getByRole("link", { name: "Resume" });
    link.addEventListener("click", (event) => event.preventDefault());
    await user.click(link);
    expect(onNavigate).toHaveBeenCalled();
  });
});

describe("MobileNavigation", () => {
  it("opens a modal drawer and closes it with the close button", async () => {
    const user = userEvent.setup();
    render(<MobileNavigation />);
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-haspopup", "dialog");
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    const drawer = screen.getByRole("dialog", { name: "Workspace navigation" });
    expect(drawer).toHaveAttribute("open");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(drawer).getByRole("navigation", { name: "Workspace" })).toBeInTheDocument();

    await user.click(within(drawer).getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape (the native cancel event)", async () => {
    const user = userEvent.setup();
    render(<MobileNavigation />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes after choosing a destination", async () => {
    const user = userEvent.setup();
    render(<MobileNavigation />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const link = within(screen.getByRole("dialog")).getByRole("link", { name: "Settings" });
    link.addEventListener("click", (event) => event.preventDefault());
    await user.click(link);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ProfileMenu", () => {
  it("shows who is signed in and links to Profile and Settings", async () => {
    const user = userEvent.setup();
    render(<ProfileMenu displayName="Ada Lovelace" email="ada@example.com" />);
    const trigger = screen.getByRole("button", { name: "Account menu for Ada Lovelace" });
    await user.click(trigger);

    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    const menu = screen.getByRole("menu", { name: "Account" });
    expect(within(menu).getByRole("menuitem", { name: "Profile" })).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(within(menu).getByRole("menuitem", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(within(menu).getByRole("menuitem", { name: "Profile" })).toHaveFocus();
  });

  it("logs out by submitting the logout form", async () => {
    const user = userEvent.setup();
    const submit = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => {});
    render(<ProfileMenu displayName="Ada Lovelace" email="ada@example.com" />);
    screen.getByRole("button", { name: /Account menu/ }).focus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Log out" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(submit).toHaveBeenCalledOnce();
    const form = submit.mock.contexts[0] as HTMLFormElement;
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("action", "/auth/logout");
    submit.mockRestore();
  });

  it("does not repeat the email when there is no name", async () => {
    const user = userEvent.setup();
    render(<ProfileMenu displayName="ada@example.com" email="ada@example.com" />);
    await user.click(screen.getByRole("button", { name: /Account menu/ }));
    expect(screen.getAllByText("ada@example.com")).toHaveLength(2); // trigger + menu header
  });
});

describe("CurrentSection and PageHeader", () => {
  it("shows the group and area for the current page", () => {
    pathname = "/practice/behavioral";
    render(<CurrentSection />);
    expect(screen.getByText("Preparation")).toBeInTheDocument();
    expect(screen.getByText("Behavioral")).toBeInTheDocument();
  });

  it("renders nothing for pages outside the navigation", () => {
    pathname = "/elsewhere";
    const { container } = render(<CurrentSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it("gives every page one h1", () => {
    render(<PageHeader eyebrow="Account" title="Settings" description="Your account." />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
