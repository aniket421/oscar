import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run the production build against a local mock of the
 * Supabase Auth API (tests/e2e/mock-auth). No real credentials are used: the
 * values below are test-only placeholders for a server on 127.0.0.1.
 */
const APP_PORT = 3100;
const MOCK_AUTH_PORT = 54329;
export const MOCK_AUTH_URL = `http://127.0.0.1:${MOCK_AUTH_PORT}`;

const appEnv = {
  SUPABASE_URL: MOCK_AUTH_URL,
  SUPABASE_PUBLISHABLE_KEY: "e2e-test-key-not-a-secret",
  NEXT_PUBLIC_APP_URL: `http://localhost:${APP_PORT}`,
};

// Use a preinstalled Chromium when the bundled revision is not downloaded.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: "retain-on-failure",
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], browserName: "chromium" },
      testMatch: ["**/responsive.spec.ts", "**/workspace-mobile.spec.ts"],
    },
  ],
  webServer: [
    {
      command: "node tests/e2e/mock-auth/server.mts",
      url: `${MOCK_AUTH_URL}/health`,
      env: { MOCK_AUTH_PORT: String(MOCK_AUTH_PORT) },
      reuseExistingServer: false,
    },
    {
      command: `npm run build && npx next start -p ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}/api/health`,
      env: appEnv,
      timeout: 240_000,
      reuseExistingServer: false,
    },
  ],
});
