import { defineConfig, devices } from "@playwright/test";

const apiURL = "http://127.0.0.1:8080";
const webURL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: webURL,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "cd ../api && PROVIDER_MODE=deterministic PORT=8080 go run ./cmd/server",
      url: `${apiURL}/healthz`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "NEXT_PUBLIC_API_URL=http://127.0.0.1:8080 pnpm dev",
      url: webURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
});
