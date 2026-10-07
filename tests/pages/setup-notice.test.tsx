import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SetupNotice } from "@/app/(auth)/setup-notice";

/** A JWT-shaped string with the given payload. Unsigned test data, not a real key. */
function fakeJwt(payload: object): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.not-a-signature`;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SetupNotice", () => {
  it("names the variables to set when Supabase is not configured", () => {
    render(<SetupNotice />);
    expect(screen.getByText("Authentication is not configured")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in \.env\.local/,
      ),
    ).toBeInTheDocument();
  });

  it("points at a malformed URL without showing it", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "project.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const { container } = render(<SetupNotice />);
    expect(screen.getByText(/NEXT_PUBLIC_SUPABASE_URL is not a valid URL/)).toBeInTheDocument();
    expect(container.textContent).not.toContain("project.example.test");
  });

  it("says authentication is off when the key would bypass Row Level Security, without showing it", () => {
    const key = fakeJwt({ role: "service_role" });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);
    const { container } = render(<SetupNotice />);
    expect(screen.getByText("Authentication is turned off")).toBeInTheDocument();
    expect(
      screen.getByText(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a key Oscar will not use/),
    ).toBeInTheDocument();
    expect(container.textContent).not.toContain(key);
  });

  it("renders nothing once Supabase is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const { container } = render(<SetupNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing in production, where sign-in reports a generic outage instead", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { container } = render(<SetupNotice />);
    expect(container).toBeEmptyDOMElement();
  });
});
