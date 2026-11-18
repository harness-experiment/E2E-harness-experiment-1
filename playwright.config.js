import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  retries: 0,
  timeout: 45000,
  reporter: [["list"], ["json", { outputFile: "evidence/playwright.json" }]],
  use: {
    baseURL: "http://127.0.0.1:15173",
    screenshot: "only-on-failure",
    trace: "off",
  },
});
