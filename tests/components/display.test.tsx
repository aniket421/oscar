import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OscarPresence, OscarStatus, OscarWordmark } from "@/components/oscar";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Divider,
  Heading,
  Progress,
  SectionHeading,
  Skeleton,
  Spinner,
  Text,
} from "@/components/ui";
import { getInitials } from "@/components/ui/avatar";

describe("Progress", () => {
  it("exposes determinate values", () => {
    render(<Progress label="Upload" value={140} />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("omits values when indeterminate", () => {
    render(<Progress label="Preparing" />);
    expect(screen.getByRole("progressbar", { name: "Preparing" })).not.toHaveAttribute(
      "aria-valuenow",
    );
  });
});

describe("Avatar", () => {
  it("derives initials", () => {
    expect(getInitials("Example User")).toBe("EU");
    expect(getInitials("  single  ")).toBe("S");
    expect(getInitials("Ana María de la Cruz")).toBe("AC");
    expect(getInitials("")).toBe("");
  });

  it("is named after the person and falls back to initials when the image fails", () => {
    render(<Avatar name="Example User" src="/broken.png" />);
    const avatar = screen.getByRole("img", { name: "Example User" });
    const image = avatar.querySelector("img");
    expect(image).not.toBeNull();
    fireEvent.error(image!);
    expect(avatar.querySelector("img")).toBeNull();
    expect(avatar).toHaveTextContent("EU");
  });
});

describe("Alert", () => {
  it("renders title, message, and actions without a live role by default", () => {
    render(
      <Alert tone="error" title="Upload failed" actions={<button>Retry</button>}>
        Try again.
      </Alert>,
    );
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
    expect(screen.getByText("Try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("accepts role=alert for interrupting messages", () => {
    render(<Alert role="alert" title="Failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
  });
});

describe("Badge, Card, Divider, Skeleton, Spinner", () => {
  it("renders a badge as non-interactive text", () => {
    render(<Badge tone="success">Ready</Badge>);
    expect(screen.getByText("Ready").tagName).toBe("SPAN");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("composes card parts with a real heading", () => {
    render(
      <Card as="article">
        <CardHeader>
          <CardTitle as="h2">Session</CardTitle>
          <CardDescription>Details</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByRole("article")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Session" })).toBeInTheDocument();
  });

  it("renders semantic and decorative dividers", () => {
    const { container } = render(
      <>
        <Divider />
        <Divider orientation="vertical" />
        <Divider decorative orientation="vertical" />
      </>,
    );
    expect(container.querySelector("hr")).not.toBeNull();
    expect(screen.getAllByRole("separator")).toHaveLength(2);
  });

  it("hides skeletons from assistive technology", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("labels a standalone spinner", () => {
    render(<Spinner label="Loading results" />);
    expect(screen.getByRole("status", { name: "Loading results" })).toBeInTheDocument();
  });
});

describe("Typography", () => {
  it("separates semantic level from visual size", () => {
    render(
      <>
        <Heading as="h2" size="display">
          Big but h2
        </Heading>
        <Text variant="caption">Caption</Text>
      </>,
    );
    const heading = screen.getByRole("heading", { level: 2, name: "Big but h2" });
    expect(heading).toHaveClass("text-display");
    expect(screen.getByText("Caption")).toHaveClass("text-caption");
  });

  it("renders a section heading with eyebrow, description, and actions", () => {
    render(
      <SectionHeading
        eyebrow="Practice"
        title="Your sessions"
        description="Pick up where you left off."
        actions={<a href="/new">New session</a>}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Your sessions" })).toBeInTheDocument();
    expect(screen.getByText("Practice")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New session" })).toBeInTheDocument();
  });
});

describe("Oscar identity", () => {
  it("describes its state accessibly", () => {
    render(<OscarPresence state="thinking" />);
    expect(screen.getByRole("img", { name: "Oscar is thinking" })).toHaveAttribute(
      "data-state",
      "thinking",
    );
  });

  it("can be decorative", () => {
    const { container } = render(<OscarPresence decorative />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("renders status patterns as a polite live region when requested", () => {
    render(<OscarStatus state="thinking" title="Preparing" description="One moment." live />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Preparing");
    expect(status).toHaveAttribute("aria-busy", "true");
  });

  it("renders the wordmark text", () => {
    render(<OscarWordmark />);
    expect(screen.getByText("Oscar")).toBeInTheDocument();
  });
});
