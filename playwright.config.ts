import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run the production build against a local mock of the
 * Supabase project (tests/e2e/mock-supabase: Auth, plus the Data and Storage APIs over a real
 * Postgres engine with Oscar's migrations). No real credentials are used: the
 * values below are test-only placeholders for a server on 127.0.0.1.
 */
const APP_PORT = 3100;
const MOCK_AUTH_PORT = 54329;
export const MOCK_AUTH_URL = `http://127.0.0.1:${MOCK_AUTH_PORT}`;

const MOCK_PUBLISHABLE_KEY = "e2e-test-key-not-a-secret";

/**
 * Supabase settings exported in the shell are dropped before anything starts, so neither the mock
 * server nor the test workers (which inherit this process's environment) ever see a real
 * project's values.
 */
for (const name of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
]) {
  delete process.env[name];
}

/**
 * The app under test always talks to the mock. Values set here take precedence over `.env.local`
 * (Next.js never overrides a variable already in the environment), so a real project configured
 * for development can never be reached from the end-to-end suite. The secret key gets a non-empty
 * placeholder because an empty value would let a `${SUPABASE_SECRET_KEY}` reference in
 * `.env.local` expand to the real key.
 */
const appEnv = {
  NEXT_PUBLIC_SUPABASE_URL: MOCK_AUTH_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: MOCK_PUBLISHABLE_KEY,
  SUPABASE_URL: MOCK_AUTH_URL,
  SUPABASE_PUBLISHABLE_KEY: MOCK_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: "e2e-no-secret-key",
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
      command: "node tests/e2e/mock-supabase/server.mts",
      url: `${MOCK_AUTH_URL}/health`,
      env: {
        MOCK_AUTH_PORT: String(MOCK_AUTH_PORT),
        // Requests carrying only this key run as the anonymous role.
        MOCK_SUPABASE_PUBLISHABLE_KEY: MOCK_PUBLISHABLE_KEY,
      },
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
