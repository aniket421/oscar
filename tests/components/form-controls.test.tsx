import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox, Input, Label, RadioGroup, Select, Switch, Textarea } from "@/components/ui";

describe("Input", () => {
  it("associates label, description, and error with the control", () => {
    render(
      <Input label="Email" description="We never share it." error="Enter an email address." />,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAccessibleDescription("We never share it. Enter an email address.");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("is not marked invalid without an error", () => {
    render(<Input label="Name" />);
    expect(screen.getByRole("textbox", { name: "Name" })).not.toHaveAttribute("aria-invalid");
  });

  it("supports required and shows a decorative marker", () => {
    render(<Input label="Email" required />);
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toBeRequired();
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
  });

  it("accepts typing and reports changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input label="Name" onChange={onChange} />);
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Ada");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Ada");
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("cannot be edited when disabled", async () => {
    const user = userEvent.setup();
    render(<Input label="Name" disabled />);
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toBeDisabled();
    await user.type(input, "x");
    expect(input).toHaveValue("");
  });

  it("keeps the label available when visually hidden", () => {
    render(<Input label="Search" hideLabel />);
    expect(screen.getByRole("textbox", { name: "Search" })).toBeInTheDocument();
  });

  it("is reachable with Tab", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Input label="First" />
        <Input label="Second" />
      </>,
    );
    await user.tab();
    expect(screen.getByRole("textbox", { name: "First" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("textbox", { name: "Second" })).toHaveFocus();
  });
});

describe("Textarea", () => {
  it("renders a labelled multi-line control with errors", async () => {
    const user = userEvent.setup();
    render(<Textarea label="Notes" error="Too short." />);
    const textarea = screen.getByRole("textbox", { name: "Notes" });
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveAccessibleDescription("Too short.");
    await user.type(textarea, "Line{Enter}Next");
    expect(textarea).toHaveValue("Line\nNext");
  });
});

describe("Select", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
    { value: "c", label: "Gamma", disabled: true },
  ];

  it("starts on the placeholder and changes selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select label="Option" placeholder="Choose" options={options} onChange={onChange} />);
    const select = screen.getByRole("combobox", { name: "Option" });
    expect(select).toHaveValue("");
    await user.selectOptions(select, "b");
    expect(select).toHaveValue("b");
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("marks disabled options and errors", () => {
    render(<Select label="Option" options={options} error="Pick one." />);
    expect(screen.getByRole("option", { name: "Gamma" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Option" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});

describe("Checkbox", () => {
  it("toggles with a click on its label and with Space", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Remember me" description="On this device only." />);
    const checkbox = screen.getByRole("checkbox", { name: "Remember me" });
    expect(checkbox).toHaveAccessibleDescription("On this device only.");

    await user.click(screen.getByText("Remember me"));
    expect(checkbox).toBeChecked();
    checkbox.focus();
    await user.keyboard(" ");
    expect(checkbox).not.toBeChecked();
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Locked" disabled />);
    const checkbox = screen.getByRole("checkbox", { name: "Locked" });
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("exposes its error", () => {
    render(<Checkbox label="Agree" error="Required." />);
    const checkbox = screen.getByRole("checkbox", { name: "Agree" });
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(checkbox).toHaveAccessibleDescription("Required.");
  });
});

describe("RadioGroup", () => {
  const options = [
    { value: "voice", label: "Voice" },
    { value: "video", label: "Video" },
    { value: "text", label: "Text", disabled: true },
  ];

  it("groups options under a legend and reports changes", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        legend="Format"
        options={options}
        defaultValue="voice"
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole("group", { name: "Format" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Voice" })).toBeChecked();

    await user.click(screen.getByText("Video"));
    expect(screen.getByRole("radio", { name: "Video" })).toBeChecked();
    expect(onValueChange).toHaveBeenCalledWith("video");
  });

  it("keeps disabled options unselectable", async () => {
    const user = userEvent.setup();
    render(<RadioGroup legend="Format" options={options} />);
    const text = screen.getByRole("radio", { name: "Text" });
    expect(text).toBeDisabled();
    await user.click(text);
    expect(text).not.toBeChecked();
  });

  it("supports a controlled value", () => {
    render(<RadioGroup legend="Format" options={options} value="video" onValueChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "Video" })).toBeChecked();
  });

  it("shares one name so arrow keys move within the group", () => {
    render(<RadioGroup legend="Format" options={options} name="format" />);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toHaveAttribute("name", "format");
    }
  });
});

describe("Switch", () => {
  it("is announced as a switch and toggles with Space", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Switch label="Live feedback" description="Hints while answering." onChange={onChange} />,
    );
    const toggle = screen.getByRole("switch", { name: "Live feedback" });
    expect(toggle).toHaveAccessibleDescription("Hints while answering.");
    expect(toggle).not.toBeChecked();

    toggle.focus();
    await user.keyboard(" ");
    expect(toggle).toBeChecked();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    render(<Switch label="Record" disabled />);
    const toggle = screen.getByRole("switch", { name: "Record" });
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
  });
});

describe("Label", () => {
  it("labels any control via htmlFor", () => {
    render(
      <>
        <Label htmlFor="custom">Custom</Label>
        <input id="custom" />
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Custom" })).toBeInTheDocument();
  });
});
