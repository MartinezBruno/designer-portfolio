import { devices, expect, test, type Locator, type Page } from '@playwright/test';
import { en } from '../../src/i18n/ui.en';
import { settleMotion } from './helpers/motion';
import { waitForNavigationIdle } from './helpers/navigation';

// Phase 7 smooth scroll (MOTN-06, SC2, SC4; 07 D-06..D-08, D-15, D-18; UI-SPEC "Smooth Scroll").
// Lenis glides wheel and trackpad scrolling only for a fine pointer under 'on'. Touch, 'reduced',
// 'off' and forced colours keep native scrolling. Keyboard scrolling, find-in-page and Tab order
// stay native in every state.

/**
 * A word that appears once on the built /projects/ page, in the last card (Mart: "built around a
 * tulip symbol"), so it sits below the fold of the 1280x720 Desktop Chrome viewport.
 */
const FIND_WORD = 'tulip';
/** How long an absence check waits for the lazy Lenis chunk that must never arrive. */
const ABSENT_WAIT_MS = 600;
/** A string present only in the minified Lenis chunk (07 Research). */
const LENIS_MARKER = 'lenisVersion';

declare global {
  interface Window {
    __marker?: number;
    __navPending?: boolean;
    /** Non-standard but shipped by Chromium, Firefox and Safari; the find-in-page proxy. */
    find(text: string): boolean;
  }
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

const scrollY = (page: Page): Promise<number> => page.evaluate(() => window.scrollY);

/** Lenis is loaded lazily, so its root class arrives a little after load. */
async function expectLenis(page: Page): Promise<void> {
  await expect(page.locator('html.lenis')).toHaveCount(1);
}

/** Absence needs a grace period: an assertion that passes at once would prove nothing. */
async function expectNoLenis(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await page.waitForTimeout(ABSENT_WAIT_MS);
  await expect(page.locator('html.lenis')).toHaveCount(0);
}

/** Jumps without any glide and waits for the position to hold. */
async function jumpTo(page: Page, top: number): Promise<number> {
  await page.evaluate((y) => {
    window.scrollTo({ top: y, behavior: 'instant' });
  }, top);
  await page.waitForTimeout(250);
  return scrollY(page);
}

/**
 * Activates a header control without moving the page. Playwright's click() first scrolls the
 * target into view, and Chromium counts the sticky header as obscured by `scroll-padding-top`, so
 * it scrolled ~370 px up even with Lenis absent. A dispatched click is what the router and the
 * toggle receive from a real pointer.
 */
async function pressInPlace(target: Locator): Promise<void> {
  await target.dispatchEvent('click', { button: 0 });
}

/** Runs `action` and waits for the router's astro:page-load and the end of the transition. */
async function routerNavigate(page: Page, action: () => Promise<void>): Promise<void> {
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
  await action();
  await expect
    .poll(() => page.evaluate(() => window.__navPending !== true), { timeout: 10000 })
    .toBe(true);
  await waitForNavigationIdle(page);
}

/** A short description of the focused element, to compare Tab order across states. */
const focusedLabel = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return 'none';
    const name =
      el.id || el.getAttribute('aria-label') || (el.textContent ?? '').trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}:${name}`;
  });

async function tabOrder(page: Page, count: number): Promise<string[]> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  const order: string[] = [];
  for (let i = 0; i < count; i += 1) {
    await page.keyboard.press('Tab');
    order.push(await focusedLabel(page));
  }
  return order;
}

test.describe('smooth scroll on a fine pointer under on', () => {
  test('glide: a wheel notch scrolls progressively, not in one jump', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await expectLenis(page);
    await settleMotion(page);

    await page.mouse.move(640, 400);
    const start = await scrollY(page);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(60);
    const mid = await scrollY(page);
    await page.waitForTimeout(1000);
    const end = await scrollY(page);

    expect(end).toBeGreaterThan(start);
    expect(mid, `start ${start}, mid ${mid}, end ${end}`).toBeGreaterThan(start);
    expect(mid, `start ${start}, mid ${mid}, end ${end}`).toBeLessThan(end);
    expect(errors).toEqual([]);
  });

  test('keyboard: PageDown, Space, End and Home scroll natively', async ({ page }) => {
    await page.goto('/');
    await expectLenis(page);
    await settleMotion(page);
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });

    const before = await scrollY(page);
    await page.keyboard.press('PageDown');
    await expect.poll(() => scrollY(page)).toBeGreaterThan(before);
    await page.waitForTimeout(400);

    const afterPageDown = await scrollY(page);
    await page.keyboard.press('Space');
    await expect.poll(() => scrollY(page)).toBeGreaterThan(afterPageDown);
    await page.waitForTimeout(400);

    await page.keyboard.press('End');
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollHeight - window.innerHeight - Math.ceil(window.scrollY),
        ),
      )
      .toBeLessThanOrEqual(2);

    await page.keyboard.press('Home');
    await expect.poll(() => scrollY(page)).toBe(0);
  });

  test('find-in-page scrolls to the match and the position holds', async ({ page }) => {
    await page.goto('/projects/');
    await expectLenis(page);
    await settleMotion(page);
    expect(await scrollY(page)).toBe(0);

    const found = await page.evaluate((word) => window.find(word), FIND_WORD);
    expect(found).toBe(true);
    await expect.poll(() => scrollY(page)).toBeGreaterThan(0);
    await page.waitForTimeout(200);
    const landed = await scrollY(page);
    await page.waitForTimeout(500);
    expect(Math.abs((await scrollY(page)) - landed)).toBeLessThanOrEqual(2);
  });

  test('live toggle: reduced destroys Lenis and on re-creates it in place', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expectLenis(page);
    await settleMotion(page);
    await page.evaluate(() => {
      window.__marker = 1;
    });
    const at = await jumpTo(page, 900);
    expect(at).toBeGreaterThan(0);

    const html = page.locator('html');
    const toggle = page.getByRole('button', { name: en['motion.toggle'], exact: true });
    await pressInPlace(toggle);
    await expect(html).toHaveAttribute('data-motion', 'reduced');
    await expect(page.locator('html.lenis')).toHaveCount(0);
    expect(Math.abs((await scrollY(page)) - at)).toBeLessThanOrEqual(2);

    await pressInPlace(toggle);
    await expect(html).toHaveAttribute('data-motion', 'on');
    await expectLenis(page);
    await page.waitForTimeout(200);
    expect(Math.abs((await scrollY(page)) - at)).toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => window.__marker)).toBe(1);
    expect(errors).toEqual([]);
  });

  test('soft navigation re-creates Lenis per page and back restores the position', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expectLenis(page);
    await settleMotion(page);
    const at = await jumpTo(page, 1200);
    expect(at).toBeGreaterThan(0);

    const projects = page
      .getByRole('banner')
      .getByRole('navigation', { name: en['nav.label'], exact: true })
      .getByRole('link', { name: en['nav.projects'], exact: true });
    await routerNavigate(page, () => pressInPlace(projects));
    expect(new URL(page.url()).pathname).toBe('/projects/');
    await expectLenis(page);

    await routerNavigate(page, async () => {
      await page.goBack();
    });
    expect(new URL(page.url()).pathname).toBe('/');
    await expectLenis(page);
    await page.waitForTimeout(300);
    expect(Math.abs((await scrollY(page)) - at)).toBeLessThanOrEqual(2);
    await expect(page.locator('html.lenis')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
});

// Compared inside 'on' with the Lenis chunk blocked, not against 'reduced': 'reduced' legitimately
// drops the marquee's pause button from the Tab order, which would hide what this checks.
test.describe('Tab order is the same with and without Lenis', () => {
  test('the first 15 Tab stops match with Lenis and with its chunk blocked', async ({ page }) => {
    await page.goto('/');
    await expectLenis(page);
    await settleMotion(page);
    const withLenis = await tabOrder(page, 15);

    await page.route('**/_astro/*.js', async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      if (body.includes(LENIS_MARKER)) await route.abort();
      else await route.fulfill({ response, body });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await expectNoLenis(page);
    await settleMotion(page);
    const native = await tabOrder(page, 15);

    expect(native).toEqual(withLenis);
  });
});

test.describe('native scrolling states', () => {
  test.describe('reduced (OS setting)', () => {
    test.use({ reducedMotion: 'reduce' });

    test('no Lenis', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
      await expectNoLenis(page);
    });
  });

  test('off (no matchMedia): no Lenis', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await expectNoLenis(page);
  });

  test('forced colours: no Lenis', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await expectNoLenis(page);
  });
});

// Touch: Desktop Chrome reports a fine hover pointer, so the device profile flips it (as in
// motion-pointer.spec). defaultBrowserType is dropped: the suite is chromium-only.
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['Pixel 7'];
test.describe('touch (Pixel 7)', () => {
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test('no Lenis on a coarse pointer', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    await expectNoLenis(page);
  });
});
