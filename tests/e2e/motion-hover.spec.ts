import { devices, expect, test, type Locator, type Page } from '@playwright/test';
import { expectedDetails } from './helpers/projects';

// Project imagery hover and focus (MOTN-04, UI-SPEC "Project Imagery Hover and Focus", V-11):
// one CSS-only mat (12px clip on the <picture>) plus a slow zoom (1.05 on the <img>) on every
// project tile, on hover and on keyboard focus, gated to full motion and hover-capable pointers.

const firstDetail = (locale: 'en' | 'es'): string => {
  const detail = expectedDetails(locale)[0];
  if (detail === undefined) throw new Error(`no visible ${locale} project`);
  return detail.href;
};

interface TileCase {
  name: string;
  path: string;
  /** Picks the tile article on the page. */
  card: (page: Page) => Locator;
  /** The full variant shows a summary paragraph at rest. */
  summary: boolean;
}

const tiles = (locale: 'en' | 'es'): TileCase[] => {
  const prefix = locale === 'en' ? '' : '/es';
  return [
    {
      name: `${locale} Home compact tile`,
      path: `${prefix}/`,
      card: (page) =>
        page.locator('section[aria-labelledby="work-title"] article[data-card]').first(),
      summary: false,
    },
    {
      // The second tile: the first is the eager LCP cover, the second also runs the shutter.
      name: `${locale} Projects full tile`,
      path: `${prefix}/projects/`,
      card: (page) => page.locator('#main article[data-card]').nth(1),
      summary: true,
    },
    {
      name: `${locale} detail Next-project teaser`,
      path: firstDetail(locale),
      card: (page) =>
        page.locator('section[aria-labelledby="next-project-title"] article[data-card]'),
      summary: false,
    },
  ];
};

const CASES = [...tiles('en'), ...tiles('es')];

interface CoverState {
  clipPath: string;
  scale: string;
}

function readCover(card: Locator): Promise<CoverState> {
  return card.evaluate((article) => {
    const mat = article.querySelector('[data-card-mat]');
    const image = article.querySelector('[data-card-image]');
    if (mat === null || image === null) throw new Error('card hover hooks missing');
    return { clipPath: getComputedStyle(mat).clipPath, scale: getComputedStyle(image).scale };
  });
}

const atRest = (state: CoverState): boolean =>
  (state.clipPath === 'none' || state.clipPath === 'inset(0px)') &&
  (state.scale === 'none' || state.scale === '1');

function expectActive(state: CoverState): void {
  expect(state.clipPath).toBe('inset(12px)');
  const scale = Number(state.scale);
  expect(scale).toBeGreaterThanOrEqual(1.04);
  expect(scale).toBeLessThanOrEqual(1.06);
}

/** Brings the tile into view and waits for its reveal and every running transition to end. */
async function settle(card: Locator): Promise<void> {
  // Centre it: a tile peeking in at the bottom sits below the reveal trigger line (-12%).
  await card.evaluate((article) => {
    article.scrollIntoView({ block: 'center' });
  });
  await expect
    .poll(() =>
      card.evaluate((article) =>
        [...article.querySelectorAll('[data-reveal]')].every((el) =>
          el.hasAttribute('data-revealed'),
        ),
      ),
    )
    .toBe(true);
  await card.evaluate(async (article) => {
    await Promise.all(article.getAnimations({ subtree: true }).map((a) => a.finished));
  });
}

async function expectSameBox(card: Locator, before: { width: number; height: number }) {
  const after = await card.boundingBox();
  if (after === null) throw new Error('card has no box');
  expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(0.5);
}

async function restBox(
  card: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await card.boundingBox();
  if (box === null) throw new Error('card has no box');
  return box;
}

/** Focuses the tabbable element just before the tile link, so a single Tab lands on the link. */
async function tabToLink(page: Page, link: Locator): Promise<void> {
  await link.evaluate((target) => {
    const tabbables = [
      ...document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0);
    const index = tabbables.indexOf(target as HTMLElement);
    const previous = tabbables[index - 1];
    if (index < 1 || previous === undefined) throw new Error('no tabbable before the tile link');
    previous.focus();
  });
  await page.keyboard.press('Tab');
}

test.describe('project imagery hover and focus under full motion', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const tile of CASES) {
    test(`${tile.name}: hover zooms and mats the cover without moving the card`, async ({
      page,
    }) => {
      await page.goto(tile.path);
      await page.waitForLoadState('load');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      const card = tile.card(page);
      await settle(card);

      // D-08: everything is visible at rest, nothing exists only on hover.
      await expect(card.getByRole('link')).toBeVisible();
      if (tile.summary) await expect(card.locator('p').first()).toBeVisible();
      const restText = await card.innerText();
      expect(atRest(await readCover(card))).toBe(true);
      const before = await restBox(card);

      const cover = card.locator('[data-card-mat]');
      const coverBox = await cover.boundingBox();
      if (coverBox === null) throw new Error('cover has no box');
      await page.mouse.move(coverBox.x + coverBox.width / 2, coverBox.y + coverBox.height / 2);
      await page.waitForTimeout(800);

      expectActive(await readCover(card));
      await expectSameBox(card, before);
      expect(await card.innerText()).toBe(restText);

      // Leaving restores the rest state.
      await page.mouse.move(2, 2);
      await page.waitForTimeout(600);
      expect(atRest(await readCover(card))).toBe(true);
    });

    test(`${tile.name}: keyboard focus applies the same effect, one tab stop`, async ({ page }) => {
      await page.goto(tile.path);
      await page.waitForLoadState('load');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      const card = tile.card(page);
      await settle(card);
      const before = await restBox(card);
      const link = card.getByRole('link');

      await tabToLink(page, link);
      await expect(link).toBeFocused();
      expect(await link.evaluate((a) => a.matches(':focus-visible'))).toBe(true);
      await page.waitForTimeout(800);

      expectActive(await readCover(card));
      await expectSameBox(card, before);

      // The next Tab leaves the card: the tile is a single tab stop.
      await page.keyboard.press('Tab');
      expect(await card.evaluate((article) => article.contains(document.activeElement))).toBe(
        false,
      );
    });
  }
});

test.describe('project imagery under reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

  for (const tile of CASES) {
    test(`${tile.name}: hover and focus change nothing`, async ({ page }) => {
      await page.goto(tile.path);
      await page.waitForLoadState('load');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
      const card = tile.card(page);
      await settle(card);
      expect(atRest(await readCover(card))).toBe(true);

      const coverBox = await card.locator('[data-card-mat]').boundingBox();
      if (coverBox === null) throw new Error('cover has no box');
      await page.mouse.move(coverBox.x + coverBox.width / 2, coverBox.y + coverBox.height / 2);
      await page.waitForTimeout(800);
      expect(atRest(await readCover(card))).toBe(true);

      await page.mouse.move(2, 2);
      const link = card.getByRole('link');
      await tabToLink(page, link);
      await expect(link).toBeFocused();
      await page.waitForTimeout(800);
      expect(atRest(await readCover(card))).toBe(true);
    });
  }
});

test.describe('project imagery on touch', () => {
  const pixel = devices['Pixel 7'];
  test.use({
    viewport: pixel.viewport,
    userAgent: pixel.userAgent,
    deviceScaleFactor: pixel.deviceScaleFactor,
    isMobile: pixel.isMobile,
    hasTouch: pixel.hasTouch,
  });

  for (const path of ['/projects/', '/es/projects/']) {
    test(`${path}: a tap never leaves the zoom stuck`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('load');
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
      expect(await page.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      const card = page.locator('#main article[data-card]').nth(1);
      await settle(card);

      // Keep the page: a capture listener cancels the navigation (the router honours it too).
      await page.evaluate(() => {
        document.addEventListener('click', (event) => event.preventDefault(), { capture: true });
      });
      const before = page.url();
      // Tap the middle of the cover: the stretched title link sits on top of it, as for a finger.
      const coverBox = await card.locator('[data-card-mat]').boundingBox();
      if (coverBox === null) throw new Error('cover has no box');
      await page.touchscreen.tap(coverBox.x + coverBox.width / 2, coverBox.y + coverBox.height / 2);
      await page.waitForTimeout(800);

      expect(page.url()).toBe(before);
      const state = await readCover(card);
      expect(state.clipPath === 'none' || state.clipPath === 'inset(0px)').toBe(true);
      expect(atRest(state)).toBe(true);
    });
  }
});
