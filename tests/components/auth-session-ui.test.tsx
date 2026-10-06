import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity, useState } from "react";
import { describe, expect, it } from "vitest";

import { LogoutButton } from "@/features/auth/components/logout-button";
import { ResetOnHide } from "@/features/auth/components/reset-on-hide";

describe("LogoutButton", () => {
  it("is a plain POST form to the logout endpoint", () => {
    const { container } = render(<LogoutButton />);
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("action", "/auth/logout");
    expect(screen.getByRole("button", { name: "Log out" })).toHaveAttribute("type", "submit");
  });
});

function Harness() {
  const [visible, setVisible] = useState(true);
  return (
    <>
      <button onClick={() => setVisible((value) => !value)}>toggle</button>
      <Activity mode={visible ? "visible" : "hidden"}>
        <ResetOnHide>
          <label>
            Password
            <input type="password" />
          </label>
        </ResetOnHide>
      </Activity>
    </>
  );
}

describe("ResetOnHide", () => {
  it("clears typed values when Next.js hides the page", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Password"), "secret-123");
    expect(screen.getByLabelText("Password")).toHaveValue("secret-123");

    await user.click(screen.getByRole("button", { name: "toggle" }));
    await user.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });
});
