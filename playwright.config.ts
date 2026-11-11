import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra o build de produção: `npm run build && npm run e2e`.
 * O projeto "dev" roda um teste de fumaça contra `next dev` (StrictMode),
 * onde bugs de efeitos aparecem primeiro.
 * Em máquinas sem os navegadores do Playwright, rode `npx playwright install chromium`
 * ou aponte PW_CHROMIUM_PATH para um Chromium já instalado.
 */
const ENV = { DESAFIO_HOJE: "2026-11-12", ADMIN_TOKEN: "senha-de-teste-admin" };

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    trace: "off",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /dev\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, baseURL: "http://localhost:3100" },
    },
    {
      name: "dev",
      testMatch: /dev\.spec\.ts/,
      timeout: 120_000,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, baseURL: "http://localhost:3101" },
    },
  ],
  webServer: [
    {
      command: "npx next start -p 3100",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      // Data fixa do desafio diário nos testes (ignorada em produção na Vercel).
      env: ENV,
      timeout: 60_000,
    },
    {
      command: "npx next dev -p 3101",
      url: "http://localhost:3101",
      reuseExistingServer: false,
      env: ENV,
      timeout: 120_000,
    },
  ],
});
