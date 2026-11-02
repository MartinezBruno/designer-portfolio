import { expect, type CDPSession, type Locator, type Page } from '@playwright/test';

// Phase 7 soft-navigation helpers (MOTN-05). Not a spec file, so Playwright does not collect it.

declare global {
  interface Window {
    __navPending?: boolean;
  }
}

/**
 * Waits until no view transition is running: `html` carries neither the Phase 7 `data-vt` hold nor
 * Astro's `data-astro-transition`, then every `::view-transition-*` animation has finished.
 */
export async function waitForNavigationIdle(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const html = document.documentElement;
          return !html.hasAttribute('data-vt') && !html.hasAttribute('data-astro-transition');
        }),
      { timeout: 5000 },
    )
    .toBe(true);
  await page.evaluate(async () => {
    const running = document.getAnimations().filter((animation) => {
      const effect = animation.effect;
      return (
        effect instanceof KeyframeEffect &&
        (effect.pseudoElement ?? '').startsWith('::view-transition')
      );
    });
    await Promise.allSettled(running.map((animation) => animation.finished));
  });
}

/**
 * Clicks a link and waits for the navigation to complete: the router's `astro:page-load` on a soft
 * navigation, or a fresh document on a full load (the pending flag is gone with the old window).
 * Callers prove which one happened with a `window.__marker` set beforehand.
 */
export async function softNavigate(page: Page, link: Locator): Promise<void> {
  await page.evaluate(() => {
    window.__navPending = true;
    document.addEventListener(
      'astro:page-load',
      () => {
        window.__navPending = false;
      },
      { once: true },
    );
  });
  await link.click();
  await expect
    .poll(() => page.evaluate(() => window.__navPending !== true), { timeout: 10000 })
    .toBe(true);
  await page.waitForLoadState('load');
  await waitForNavigationIdle(page);
}

/**
 * Counts event listeners on `window` (own only) and on `document` (whole tree) through CDP. Unlike
 * a monkeypatched addEventListener it sees listeners added before any patch and handles
 * AbortSignal removal (07-RESEARCH "Leak counting via CDP"). Compare per URL after a warm-up visit.
 */
export async function listenerCounts(
  cdp: CDPSession,
): Promise<{ window: number; document: number }> {
  const out = { window: 0, document: 0 };
  for (const expression of ['window', 'document'] as const) {
    const { result } = await cdp.send('Runtime.evaluate', { expression });
    if (result.objectId === undefined)
      throw new Error(`listenerCounts: no object for ${expression}`);
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', {
      objectId: result.objectId,
      depth: expression === 'document' ? -1 : 0,
      pierce: true,
    });
    out[expression] = listeners.length;
  }
  return out;
}
