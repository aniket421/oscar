// @vitest-environment node

import { describe, expect, it } from "vitest";

import { MissingEnvError, readEnv, requireEnv } from "@/lib/env";

describe("readEnv", () => {
  it("returns the trimmed value when set", () => {
    expect(readEnv("APP_URL", { APP_URL: "  http://localhost:3000 " })).toBe(
      "http://localhost:3000",
    );
  });

  it("returns undefined when unset or blank", () => {
    expect(readEnv("APP_URL", {})).toBeUndefined();
    expect(readEnv("APP_URL", { APP_URL: "   " })).toBeUndefined();
  });
});

describe("requireEnv", () => {
  it("returns the value when set", () => {
    expect(requireEnv("APP_URL", { APP_URL: "value" })).toBe("value");
  });

  it("throws MissingEnvError when unset", () => {
    expect(() => requireEnv("APP_URL", {})).toThrow(MissingEnvError);
  });
});
