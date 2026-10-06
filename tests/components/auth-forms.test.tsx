import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const login = vi.fn();
const signup = vi.fn();
vi.mock("@/features/auth/actions", () => ({ login, signup, logout: vi.fn() }));

const { LoginForm } = await import("@/features/auth/components/login-form");
const { SignupForm } = await import("@/features/auth/components/signup-form");

beforeEach(() => {
  login.mockReset();
  signup.mockReset();
});

describe("LoginForm", () => {
  it("labels its fields and links to the legal pages", () => {
    render(<LoginForm />);
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute("type", "password");
    expect(screen.getByRole("link", { name: "Terms & Conditions" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  it("validates in the browser, focuses the first invalid field, and skips the server", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: "Log in" }));
    const email = screen.getByRole("textbox", { name: "Email" });
    expect(email).toHaveAccessibleDescription("Enter your email address.");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveFocus();
    expect(login).not.toHaveBeenCalled();
  });

  it("clears a field error as the user types", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await user.type(screen.getByRole("textbox", { name: "Email" }), "a");
    expect(screen.getByRole("textbox", { name: "Email" })).not.toHaveAttribute("aria-invalid");
  });

  it("submits valid input to the server action and shows its error", async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({ status: "error", message: "The email or password is incorrect." });
    render(<LoginForm next="/resume?x=1" />);
    await user.type(screen.getByRole("textbox", { name: "Email" }), "ada@example.com");
    await user.type(screen.getByLabelText(/^Password/), "secret-1");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The email or password is incorrect.",
    );
    const [, formData] = login.mock.calls[0] as [unknown, FormData];
    expect(formData.get("email")).toBe("ada@example.com");
    expect(formData.get("next")).toBe("/resume?x=1");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("ada@example.com");
  });

  it("shows a loading state while the action runs", async () => {
    const user = userEvent.setup();
    let resolve: (value: unknown) => void = () => {};
    login.mockReturnValue(new Promise((done) => (resolve = done)));
    render(<LoginForm />);
    await user.type(screen.getByRole("textbox", { name: "Email" }), "ada@example.com");
    await user.type(screen.getByLabelText(/^Password/), "secret-1");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    const button = await screen.findByRole("button", { name: "Logging in" });
    expect(button).toHaveAttribute("aria-busy", "true");
    await act(async () => resolve({ status: "idle" }));
  });

  it("shows a notice passed from the URL", () => {
    render(<LoginForm notice="session_expired" />);
    expect(screen.getByText("Your session has expired")).toBeInTheDocument();
  });
});

describe("SignupForm", () => {
  async function fill(user: ReturnType<typeof userEvent.setup>, confirm = "engine-1843") {
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Ada Lovelace");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "ada@example.com");
    await user.type(screen.getByLabelText(/^Password/), "engine-1843");
    await user.type(screen.getByLabelText(/^Confirm password/), confirm);
  }

  it("describes the password rules", () => {
    render(<SignupForm />);
    expect(screen.getByLabelText(/^Password/)).toHaveAccessibleDescription(
      "At least 8 characters, including a letter and a number.",
    );
  });

  it("catches mismatched passwords before submitting", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);
    await fill(user, "engine-1844");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByLabelText(/^Confirm password/)).toHaveAccessibleDescription(
      "Passwords do not match.",
    );
    expect(signup).not.toHaveBeenCalled();
  });

  it("offers a way forward for duplicate accounts", async () => {
    const user = userEvent.setup();
    signup.mockResolvedValue({
      status: "error",
      kind: "duplicate_account",
      message: "An account with this email already exists. Log in instead.",
    });
    render(<SignupForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Account already exists");
    expect(screen.getByRole("link", { name: "Log in instead" })).toHaveAttribute("href", "/login");
  });

  it("replaces the form with a confirmation message and moves focus to it", async () => {
    const user = userEvent.setup();
    signup.mockResolvedValue({ status: "confirm_email", email: "ada@example.com" });
    render(<SignupForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Check your email");
    expect(status).toHaveTextContent("ada@example.com");
    expect(status.parentElement).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Create account" })).not.toBeInTheDocument();
  });
});
