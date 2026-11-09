// Shared axe settings for a11y.spec.ts and a11y-sweep.spec.ts (not a spec file, so Playwright does
// not collect it).
import type { Page } from '@playwright/test';

/** WCAG 2.2 AA rule set used by every axe run. */
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Serves `path` with every <script> removed from the document and every script request aborted,
 * so no site code runs (no head gate, no reveal, no toggle). axe itself needs JavaScript to
 * inject, so `javaScriptEnabled: false` cannot host it; this reproduces the same page state while
 * keeping Playwright's own evaluation available. The site has no <noscript> or `scripting` media
 * query, so nothing else differs from a real JS-off visit (motion.spec.ts covers that one).
 */
export async function gotoWithoutSiteScripts(page: Page, path: string): Promise<void> {
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (request.resourceType() === 'script') {
      await route.abort();
      return;
    }
    if (request.resourceType() !== 'document') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const body = (await response.text()).replace(/<script\b[\s\S]*?<\/script>/gi, '');
    await route.fulfill({ response, body });
  });
  await page.goto(path);
}
