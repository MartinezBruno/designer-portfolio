import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const isCI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: isCI,
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // --ignore-lock: Astro 7 backgrounds preview when run by an agent; force a foreground server.
    command: `pnpm astro preview --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
  },
});
