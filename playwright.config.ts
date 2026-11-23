import { defineConfig, devices } from '@playwright/test';

// E2E runs against a preview-mode build (draft seed content visible, ?today=
// date override enabled) served by `astro preview`. See ADR-011.
// Another local project may already hold the default port; E2E_PORT moves this
// suite (and its server) elsewhere without touching it.
const port = Number(process.env.E2E_PORT ?? 4321);
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: origin,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && node scripts/static-server.mjs',
    url: origin,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { CONTENT_MODE: 'preview', PORT: String(port) },
  },
});
