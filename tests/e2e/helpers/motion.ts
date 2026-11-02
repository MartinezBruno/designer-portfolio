import { expect, type Page } from '@playwright/test';

export interface SettleOptions {
  /**
   * Scroll down one screen at a time first so every below-the-fold reveal fires, then wait until
   * no `[data-reveal]` is pending. Needs JS: with JS off nothing is ever marked revealed.
   */
  scrollThrough?: boolean;
}

/**
 * Waits until the page has settled before an axe scan or a screenshot: above-the-fold reveals
 * (Phase 6 D-04) and the hero load sequence fade in on load, and axe blends a mid-fade opacity
 * into its contrast maths. First waits for any Phase 7 page transition to end (no `data-vt` or
 * `data-astro-transition` on `html`), because entrance motion is held until then. Waits two frames for the reveal observer's first batch, then for every
 * GSAP line rise to end (split-lines.ts reverts its split on complete, so no `.split-line-mask`
 * left means no rise is running; GSAP tweens are not in `getAnimations()`), then for every finite
 * animation and transition to finish. Infinite ones (the marquee) are ignored. Without
 * `scrollThrough`, elements still waiting below the fold sit at opacity 0, which axe treats as
 * hidden; the no-JS and failsafe e2e prove they become visible.
 */
export async function settleMotion(page: Page, options: SettleOptions = {}): Promise<void> {
  await page.waitForLoadState('load');
  if (options.scrollThrough === true) {
    await page.evaluate(async () => {
      const pause = (ms: number): Promise<void> =>
        new Promise((resolve) => {
          setTimeout(resolve, ms);
        });
      const step = Math.max(1, Math.floor(window.innerHeight * 0.8));
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await pause(120);
      }
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    });
    await expect
      .poll(() => page.locator('[data-reveal]:not([data-revealed])').count(), { timeout: 5000 })
      .toBe(0);
  }
  // Phase 7: a soft navigation may still be mid view transition (data-vt hold or Astro's own
  // data-astro-transition); entrance motion only starts once it ends.
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
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
  await expect.poll(() => page.locator('.split-line-mask').count(), { timeout: 5000 }).toBe(0);
  await page.evaluate(async () => {
    const finite = document
      .getAnimations()
      .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity);
    await Promise.allSettled(finite.map((a) => a.finished));
  });
}
