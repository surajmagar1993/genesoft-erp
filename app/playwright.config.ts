import { defineConfig, devices } from "@playwright/test"

/**
 * Browser tests (e2e/). Public pages run in CI against `next start` of the
 * build. The signed-in suite (app.spec.ts) runs only when E2E_EMAIL and
 * E2E_PASSWORD are set, e.g. against a local build or genesoftdev:
 *   E2E_BASE_URL=https://genesoftdev.vercel.app E2E_EMAIL=… E2E_PASSWORD=… npx playwright test
 * Without E2E_BASE_URL a production server is started on port 3100 (run `npm run build` first).
 */
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3100"

export default defineConfig({
    testDir: "./e2e",
    timeout: 60_000,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
    use: { baseURL, trace: "retain-on-failure" },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
        { name: "phone", use: { ...devices["Pixel 7"] }, testMatch: /public\.spec\.ts/ },
    ],
    webServer: process.env.E2E_BASE_URL
        ? undefined
        : { command: "npx next start -p 3100", url: "http://localhost:3100/login", reuseExistingServer: !process.env.CI, timeout: 120_000 },
})
