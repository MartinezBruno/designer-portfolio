import { defineConfig, devices } from '@playwright/test';

// Dedicated test port: never collides with `astro dev` on 4321.
const PORT = 4400;
const isCI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: isCI,
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Tests that need challenges.cloudflare.com (a real Turnstile token or the live siteverify) carry
  // `@network` in their test or describe title, so `E2E_OFFLINE=1 pnpm test:e2e` runs only the
  // hermetic tests. Spread, not `grepInvert: undefined` (exactOptionalPropertyTypes).
  ...(process.env['E2E_OFFLINE'] ? { grepInvert: /@network/ } : {}),
  webServer: {
    // --ignore-lock: Astro 7 backgrounds preview when run by an agent; force a foreground server.
    // e2e-preview-env.ts overwrites dist/server/.dev.vars with the console mailer and Turnstile test
    // keys, so previews never use the developer's real secrets.
    command: `node scripts/e2e-preview-env.ts && pnpm astro preview --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}`,
    // Always start a fresh preview of the current build so tests never hit a stale server.
    reuseExistingServer: false,
  },
});
