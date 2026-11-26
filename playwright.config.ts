import { defineConfig, devices } from "@playwright/test";

// Runs against a production build with the mock provider and no database,
// so it needs no keys and gives the same answers every time.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:3100", trace: "off" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      LLM_PROVIDER: "mock",
      EMBEDDING_PROVIDER: "none",
      DATABASE_URL: "",
      RATE_LIMIT_PER_IP_DAILY: "1000",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
