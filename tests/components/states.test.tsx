import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import WorkspaceError from "@/app/(app)/error";
import { ErrorState, LoadingState } from "@/components/oscar";
import { EmptyState } from "@/components/ui";
import { ContentSkeleton, DashboardSkeleton, PageSkeleton } from "@/features/workspace";

describe("EmptyState", () => {
  it("explains what, why, and what next, with an action", () => {
    render(
      <EmptyState
        title="No interviews yet"
        description="Completed interviews are listed here."
        reason="Reviewing sessions shows progress."
        next="Your first interview will appear here."
        action={<a href="/interviews/new">Start an interview</a>}
        headingLevel="h2"
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "No interviews yet" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Why it matters.")).toBeInTheDocument();
    expect(screen.getByText("What's next.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start an interview" })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("announces a plain-language error with recovery actions", () => {
    render(<ErrorState actions={<button>Try again</button>} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).toHaveTextContent("Your account and data are not affected.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("workspace error boundary", () => {
  it("never shows the error message and lets the user retry or leave", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const error = Object.assign(new Error("SELECT * FROM secrets failed at db.internal:5432"), {
      digest: "abc123",
    });
    const { container } = render(<WorkspaceError error={error} retry={retry} />);
    expect(container).not.toHaveTextContent("secrets");
    expect(container).not.toHaveTextContent("abc123");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Go to overview" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});

describe("loading states", () => {
  it("LoadingState announces what is loading", () => {
    render(<LoadingState label="Loading your workspace" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your workspace");
  });

  it.each([
    ["DashboardSkeleton", <DashboardSkeleton key="d" />, "Loading your dashboard"],
    ["PageSkeleton", <PageSkeleton key="p" label="Loading page" />, "Loading page"],
    [
      "ContentSkeleton",
      <ContentSkeleton key="c" label="Loading your interviews" />,
      "Loading your interviews",
    ],
  ])("%s marks the region busy and names it once", (_, element, label) => {
    const { container } = render(element);
    expect(container.querySelector("[aria-busy=true]")).not.toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(label);
  });
});
