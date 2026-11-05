import { devices, expect, test, type Locator, type Page } from '@playwright/test';
import { en } from '../../src/i18n/ui.en';
import { settleMotion } from './helpers/motion';
import { waitForNavigationIdle } from './helpers/navigation';

// 07-16: pressed state on navigation start (MOTN-05; closes the 07-10 touch latency gap).

declare global {
  interface Window {
    __pressedAtSwap?: number[];
    __pageLoaded?: number;
  }
}

/** Records, at each `astro:before-swap`, how many elements carry the pressed marker. */
async function recordPressed(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__pressedAtSwap = [];
    window.__pageLoaded = 0;
    // Registered before the app's handlers, so it runs ahead of the clear on before-swap.
    document.addEventListener('astro:before-swap', () => {
      window.__pressedAtSwap?.push(document.querySelectorAll('[data-nav-pressed]').length);
    });
    document.addEventListener('astro:page-load', () => {
      window.__pageLoaded = (window.__pageLoaded ?? 0) + 1;
    });
  });
}

/** Holds every document request for `ms`, so the pressed state can be read before the swap. */
async function stallDocuments(page: Page, ms: number): Promise<void> {
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() === 'document' || route.request().url().endsWith('/')) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
    await route.continue();
  });
}

interface Look {
  decoration: string;
  decorationColor: string;
  transform: string;
  translate: string;
  scale: string;
  matClip: string;
  matTransform: string;
  matScale: string;
  matTranslate: string;
}

async function look(link: Locator, card: Locator | null): Promise<Look> {
  const linkStyle = await link.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      decoration: s.textDecorationLine,
      decorationColor: s.textDecorationColor,
      transform: s.transform,
      translate: s.translate,
      scale: s.scale,
    };
  });
  const mat =
    card === null
      ? { matClip: '', matTransform: '', matScale: '', matTranslate: '' }
      : await card.locator('[data-card-mat]').evaluate((el) => {
          const s = getComputedStyle(el);
          return {
            matClip: s.clipPath,
            matTransform: s.transform,
            matScale: s.scale,
            matTranslate: s.translate,
          };
        });
  return { ...linkStyle, ...mat };
}

async function press(page: Page, link: Locator, touch: boolean): Promise<void> {
  if (touch) await link.tap({ noWaitAfter: true });
  else await link.click({ noWaitAfter: true });
}

async function expectClearedAfterLoad(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => window.__pageLoaded ?? 0)).toBeGreaterThan(1);
  await waitForNavigationIdle(page);
  expect(await page.locator('[data-nav-pressed]').count()).toBe(0);
  expect(await page.evaluate(() => window.__pressedAtSwap)).toEqual([1]);
}

const pixel = devices['Pixel 7'];
const profiles = [
  { name: '1440', touch: false, use: { viewport: { width: 1440, height: 900 } } },
  {
    name: 'Pixel 7',
    touch: true,
    use: {
      viewport: pixel.viewport,
      userAgent: pixel.userAgent,
      deviceScaleFactor: pixel.deviceScaleFactor,
      isMobile: pixel.isMobile,
      hasTouch: pixel.hasTouch,
    },
  },
] as const;

const navProjects = (page: Page): Locator =>
  page
    .getByRole('navigation', { name: en['nav.label'], exact: true })
    .getByRole('link', { name: en['nav.projects'], exact: true });

const workCard = (page: Page): Locator =>
  page.locator('section[aria-labelledby="work-title"] article[data-card]').first();

for (const profile of profiles) {
  test.describe(`pressed state (${profile.name})`, () => {
    test.use(profile.use);

    test.beforeEach(async ({ page }) => {
      await recordPressed(page);
    });

    test('nav link is marked before the swap and cleared after page-load', async ({ page }) => {
      await page.goto('/');
      await settleMotion(page);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      const link = navProjects(page);
      const rest = await look(link, null);
      await stallDocuments(page, 1200);
      await press(page, link, profile.touch);
      await expect(link).toHaveAttribute('data-nav-pressed', '');
      const pressed = await look(link, null);
      expect(pressed.decoration).toBe('underline');
      expect(pressed.decorationColor).toBe('rgb(15, 112, 183)');
      expect(pressed.decoration).not.toBe(rest.decoration);
      await expectClearedAfterLoad(page);
    });

    test('card title link shows the mat inset while pressed', async ({ page }) => {
      await page.goto('/');
      await settleMotion(page, { scrollThrough: true });
      const card = workCard(page);
      await card.scrollIntoViewIfNeeded();
      await settleMotion(page);
      const link = card.locator('a').first();
      // Rest is read with the pointer away from the card (desktop hover would inset it too).
      await page.mouse.move(0, 0);
      await page.waitForTimeout(500);
      const rest = await look(link, card);
      await stallDocuments(page, 1500);
      await press(page, link, profile.touch);
      await expect(link).toHaveAttribute('data-nav-pressed', '');
      await expect
        .poll(async () => (await look(link, card)).matClip, { timeout: 1000 })
        .toBe('inset(12px)');
      expect(rest.matClip).not.toBe('inset(12px)');
      await expectClearedAfterLoad(page);
    });
  });
}

test.describe('pressed state under reduced', () => {
  test.use({ reducedMotion: 'reduce', ...profiles[1].use });

  test.beforeEach(async ({ page }) => {
    await recordPressed(page);
  });

  test('card press lands instantly with no transform change', async ({ page }) => {
    await page.goto('/');
    await settleMotion(page, { scrollThrough: true });
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    const card = workCard(page);
    await card.scrollIntoViewIfNeeded();
    await settleMotion(page);
    const link = card.locator('a').first();
    const rest = await look(link, card);
    await stallDocuments(page, 1500);
    await press(page, link, true);
    await expect(link).toHaveAttribute('data-nav-pressed', '');
    // No transition under reduced: the inset is there on the first read.
    const pressed = await look(link, card);
    expect(pressed.matClip).toBe('inset(12px)');
    expect(pressed.decoration).toBe('underline');
    for (const key of [
      'transform',
      'translate',
      'scale',
      'matTransform',
      'matScale',
      'matTranslate',
    ] as const) {
      expect(pressed[key], key).toBe(rest[key]);
    }
    await expectClearedAfterLoad(page);
  });

  test('nav link press under reduced is cleared after the swap', async ({ page }) => {
    await page.goto('/');
    await settleMotion(page);
    const link = navProjects(page);
    await stallDocuments(page, 800);
    await press(page, link, true);
    await expect(link).toHaveAttribute('data-nav-pressed', '');
    await expectClearedAfterLoad(page);
  });
});

test.describe('pressed state under off', () => {
  test('a full-load navigation never marks the link', async ({ page }) => {
    // Same 'off' route as transitions-reduced: no matchMedia means the gate never turns motion on.
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true });
      new MutationObserver((records) => {
        if (records.length > 0) sessionStorage.setItem('pressed-seen', '1');
      }).observe(document, { subtree: true, attributeFilter: ['data-nav-pressed'] });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    const nav = page.getByRole('navigation', { name: en['nav.label'], exact: true });
    await nav.getByRole('link', { name: en['nav.projects'], exact: true }).click();
    await expect(page).toHaveURL(/\/projects\/$/);
    expect(await page.evaluate(() => sessionStorage.getItem('pressed-seen'))).toBeNull();
    expect(await page.locator('[data-nav-pressed]').count()).toBe(0);
  });
});
