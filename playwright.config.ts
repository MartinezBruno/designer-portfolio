import { defineConfig, devices } from '@playwright/test';

// Dedicated test port: never collides with `astro dev` on 4321.
const PORT = 4400;
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
    // Always start a fresh preview of the current build so tests never hit a stale server.
    reuseExistingServer: false,
  },
});
