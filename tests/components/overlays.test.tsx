import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  Button,
  Dialog,
  DropdownMenu,
  IconButton,
  Tabs,
  ToastProvider,
  Tooltip,
  useToast,
} from "@/components/ui";

afterEach(() => {
  vi.useRealTimers();
});

function DialogHarness({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
        }}
        title="Rename session"
        description="Pick a name."
        footer={<Button onClick={() => setOpen(false)}>Save</Button>}
      >
        <input aria-label="Name" />
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("opens as a labelled dialog", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog", { name: "Rename session" });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleDescription("Pick a name.");
  });

  it("closes with the close button", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<DialogHarness onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape (the native cancel event)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<DialogHarness onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes on backdrop click but not on content click", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<DialogHarness onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("textbox", { name: "Name" }));
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

function MenuHarness({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <>
      <DropdownMenu
        label="Session actions"
        items={[
          { id: "rename", label: "Rename", onSelect: () => onSelect("rename") },
          { id: "export", label: "Export", onSelect: () => onSelect("export"), disabled: true },
          { id: "delete", label: "Delete", onSelect: () => onSelect("delete") },
        ]}
        trigger={(props) => <Button {...props}>Actions</Button>}
      />
      <p>Outside</p>
    </>
  );
}

describe("DropdownMenu", () => {
  it("opens with ArrowDown, skips disabled items, and wraps", async () => {
    const user = userEvent.setup();
    render(<MenuHarness onSelect={() => {}} />);
    const trigger = screen.getByRole("button", { name: "Actions" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: "Session actions" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus();
  });

  it("opens on the last item with ArrowUp", async () => {
    const user = userEvent.setup();
    render(<MenuHarness onSelect={() => {}} />);
    screen.getByRole("button", { name: "Actions" }).focus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<MenuHarness onSelect={() => {}} />);
    const trigger = screen.getByRole("button", { name: "Actions" });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("selects with Enter and closes", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MenuHarness onSelect={onSelect} />);
    screen.getByRole("button", { name: "Actions" }).focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledWith("delete");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on an outside click", async () => {
    const user = userEvent.setup();
    render(<MenuHarness onSelect={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.getByRole("menu")).toBeVisible();
    await user.click(screen.getByText("Outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("Tooltip", () => {
  it("shows on keyboard focus, describes the trigger, and hides on Escape", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Mute your microphone">
        <IconButton label="Mute" icon={<svg />} />
      </Tooltip>,
    );
    await user.tab();
    const trigger = screen.getByRole("button", { name: "Mute" });
    expect(trigger).toHaveFocus();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Mute your microphone");
    expect(trigger).toHaveAccessibleDescription("Mute your microphone");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows on hover after a delay", () => {
    vi.useFakeTimers();
    render(
      <Tooltip content="More actions">
        <IconButton label="More" icon={<svg />} />
      </Tooltip>,
    );
    fireEvent.pointerEnter(screen.getByRole("button", { name: "More" }).parentElement!);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });
});

describe("Tabs", () => {
  const items = [
    { value: "one", label: "One", content: "Panel one" },
    { value: "two", label: "Two", content: "Panel two" },
    { value: "off", label: "Off", content: "Panel off", disabled: true },
    { value: "three", label: "Three", content: "Panel three" },
  ];

  it("selects the first tab and shows its panel", () => {
    render(<Tabs label="Example" items={items} />);
    expect(screen.getByRole("tablist", { name: "Example" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "One" })).toHaveTextContent("Panel one");
    expect(screen.queryByText("Panel two")).not.toBeVisible();
  });

  it("moves with arrow keys, skips disabled tabs, and uses roving tabindex", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Tabs label="Example" items={items} onValueChange={onValueChange} />);
    await user.tab();
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("tabindex", "-1");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith("three");
  });

  it("moves from the tab into the panel with Tab", async () => {
    const user = userEvent.setup();
    render(<Tabs label="Example" items={items} />);
    await user.tab();
    await user.tab();
    expect(screen.getByRole("tabpanel")).toHaveFocus();
  });
});

function ToastHarness() {
  const { toast } = useToast();
  return (
    <Button onClick={() => toast({ title: "Saved", description: "All good.", tone: "success" })}>
      Notify
    </Button>
  );
}

describe("Toast", () => {
  it("announces through a polite live region and can be dismissed", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );
    const region = screen.getByRole("region", { name: "Notifications" });
    expect(region.querySelector("[aria-live='polite']")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Notify" }));
    expect(screen.getByText("Saved")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("dismisses automatically after its duration", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    expect(screen.getByText("Saved")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("throws a clear error outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ToastHarness />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});

describe("DropdownMenu link items and header", () => {
  it("renders link items as real links and shows a header", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu
        label="Account"
        header={<span>Signed in as ada@example.com</span>}
        items={[
          { id: "profile", label: "Profile", href: "/profile" },
          { id: "logout", label: "Log out", onSelect: () => {} },
        ]}
        trigger={(props) => <Button {...props}>Account</Button>}
      />,
    );
    screen.getByRole("button", { name: "Account" }).focus();
    await user.keyboard("{ArrowDown}");
    const profile = screen.getByRole("menuitem", { name: "Profile" });
    expect(profile.tagName).toBe("A");
    expect(profile).toHaveAttribute("href", "/profile");
    expect(profile).toHaveFocus();
    expect(screen.getByText("Signed in as ada@example.com")).toBeVisible();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Log out" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByText("Signed in as ada@example.com")).not.toBeVisible();
  });
});
