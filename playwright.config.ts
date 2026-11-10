import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra o build de produção: `npm run build && npm run e2e`.
 * Em máquinas sem os navegadores do Playwright, rode `npx playwright install chromium`
 * ou aponte PW_CHROMIUM_PATH para um Chromium já instalado.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 1280, height: 800 },
    trace: "off",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
