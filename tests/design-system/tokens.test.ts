// @vitest-environment node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { motion } from "@/lib/motion";

const root = join(__dirname, "..", "..");
const tokensCss = readFileSync(join(root, "src/styles/tokens.css"), "utf8");

/** Extracts `--name: value;` declarations from the first block matching `selector {`. */
function block(selector: string): Map<string, string> {
  const start = tokensCss.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Missing block ${selector}`);
  const body = tokensCss.slice(start, tokensCss.indexOf("\n}", start));
  const declarations = new Map<string, string>();
  for (const match of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    declarations.set(match[1]!, match[2]!.trim());
  }
  return declarations;
}

const light = block(":root");
const dark = block('[data-theme="dark"]');

/** Resolves a token to a hex color, following var() references (dark overrides light). */
function resolve(name: string, theme: Map<string, string>): string {
  const value = theme.get(name) ?? light.get(name);
  if (!value) throw new Error(`Unknown token ${name}`);
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  if (reference) return resolve(reference[1]!, theme);
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${name} is not a solid hex: ${value}`);
  return value;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
}

const requiredSemanticTokens = [
  "--color-background",
  "--color-surface",
  "--color-surface-elevated",
  "--color-foreground",
  "--color-foreground-muted",
  "--color-border",
  "--color-primary",
  "--color-primary-hover",
  "--color-primary-foreground",
  "--color-success",
  "--color-warning",
  "--color-error",
  "--color-info",
];

// [foreground, background, minimum ratio]
const textPairs: Array<[string, string, number]> = [
  ["--color-foreground", "--color-background", 7],
  ["--color-foreground", "--color-surface-elevated", 7],
  ["--color-foreground-muted", "--color-background", 4.5],
  ["--color-foreground-muted", "--color-surface-sunken", 4.5],
  ["--color-foreground-subtle", "--color-background", 4.5],
  ["--color-accent", "--color-background", 4.5],
  ["--color-primary-foreground", "--color-primary", 4.5],
  ["--color-primary-foreground", "--color-primary-hover", 4.5],
  ["--color-secondary-foreground", "--color-secondary", 4.5],
  ["--color-error-foreground", "--color-error", 4.5],
  ["--color-primary-subtle-foreground", "--color-primary-subtle", 4.5],
  ["--color-success", "--color-success-surface", 4.5],
  ["--color-warning", "--color-warning-surface", 4.5],
  ["--color-error", "--color-error-surface", 4.5],
  ["--color-info", "--color-info-surface", 4.5],
  ["--color-foreground-inverse", "--color-surface-inverse", 4.5],
];

// Non-text UI boundaries and indicators (WCAG 1.4.11).
const uiPairs: Array<[string, string, number]> = [
  ["--color-border-control", "--color-surface", 3],
  ["--color-focus-ring", "--color-background", 3],
  ["--color-primary", "--color-background", 3],
  ["--color-oscar-signal", "--color-oscar-core", 3],
];

describe("design tokens", () => {
  it("define every required semantic color", () => {
    for (const token of requiredSemanticTokens) expect(light.has(token), token).toBe(true);
  });

  it("re-map every semantic color in the dark theme", () => {
    const lightColors = [...light.keys()].filter((key) => key.startsWith("--color-"));
    const missing = lightColors.filter((key) => !dark.has(key));
    expect(missing).toEqual([]);
  });

  for (const [themeName, theme] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    it(`meet WCAG AA text contrast in the ${themeName} theme`, () => {
      for (const [fg, bg, min] of textPairs) {
        const ratio = contrast(resolve(fg, theme), resolve(bg, theme));
        expect(ratio, `${fg} on ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min);
      }
    });

    it(`meet non-text contrast in the ${themeName} theme`, () => {
      for (const [fg, bg, min] of uiPairs) {
        const ratio = contrast(resolve(fg, theme), resolve(bg, theme));
        expect(ratio, `${fg} on ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min);
      }
    });
  }

  it("keep the JS motion mirror in sync with the CSS tokens", () => {
    expect(light.get("--duration-fast")).toBe(`${motion.duration.fast}ms`);
    expect(light.get("--duration-standard")).toBe(`${motion.duration.standard}ms`);
    expect(light.get("--duration-slow")).toBe(`${motion.duration.slow}ms`);
    expect(light.get("--ease-standard")).toBe(motion.easing.standard);
    expect(light.get("--ease-out")).toBe(motion.easing.out);
    expect(light.get("--ease-in")).toBe(motion.easing.in);
  });

  it("collapse motion durations for reduced-motion users", () => {
    const reduced = tokensCss.slice(tokensCss.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain("--duration-fast: 0ms");
    expect(reduced).toContain("--duration-standard: 0ms");
    expect(reduced).toContain("--duration-slow: 0ms");
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const sourceFiles = walk(join(root, "src"));
const styleFiles = sourceFiles.filter(
  (file) => file.endsWith(".css") && !file.endsWith("tokens.css"),
);

describe("design system rules", () => {
  it("keep raw colors out of styles outside tokens.css", () => {
    const offenders = styleFiles.flatMap((file) => {
      const css = readFileSync(file, "utf8");
      const hits = css.match(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/gi) ?? [];
      return hits.map((hit) => `${relative(root, file)}: ${hit}`);
    });
    expect(offenders).toEqual([]);
  });

  it("only reference palette primitives inside tokens.css", () => {
    const offenders = sourceFiles
      .filter((file) => /\.(css|tsx?)$/.test(file) && !file.endsWith("tokens.css"))
      .filter((file) => readFileSync(file, "utf8").includes("--palette-"))
      .map((file) => relative(root, file));
    expect(offenders).toEqual([]);
  });

  it("use no decorative gradients (the skeleton shimmer is the only allowed gradient)", () => {
    const offenders = styleFiles
      .filter((file) => /gradient\(/.test(readFileSync(file, "utf8")))
      .map((file) => relative(root, file));
    expect(offenders).toEqual(["src/components/ui/skeleton.module.css"]);
  });

  it("use no em dashes in product copy", () => {
    const offenders = sourceFiles
      .filter((file) => file.endsWith(".tsx") || file.includes(`${join("features", "marketing")}`))
      .filter((file) => readFileSync(file, "utf8").includes("—"))
      .map((file) => relative(root, file));
    expect(offenders).toEqual([]);
  });
});
