import { defineConfig, devices } from "@playwright/test";

/**
 * Tests e2e du back-office + simulateur React.
 * On réutilise un dev server externe (localhost:3000) pour éviter les
 * conflits avec Next 16 qui bloque les doubles instances de next dev.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false, // localStorage partagé sur certains scénarios
  forbidOnly: !!process.env.CI,
  // 1 retry en local pour absorber les à-coups de compilation Next dev.
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  // Le dev server doit être démarré manuellement (ou via preview_start) avant
  // le run. Pour un vrai CI, décommenter :
  // webServer: {
  //   command: "yarn dev",
  //   url: "http://localhost:3000",
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
