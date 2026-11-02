import { devices, expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { en } from '../../src/i18n/ui.en';
import { expectedDetails } from './helpers/projects';

// Card and teaser parallax (MOTN-06; 07 D-09, D-10, D-12, D-13, D-18; UI-SPEC "Parallax"). CSS
// scroll-driven animations only: under 'on' each lazy card cover and the Next-project thumbnail
// drift inside an overflow-clip frame as the page scrolls; 'reduced', 'off' and print leave the
// exact Phase 6 box (translate none, image height = frame height).

const DETAIL_SLUG = 'website-instablogs';
const HOME_CARD = 'section[aria-labelledby="work-title"] article[data-card]';
const PROJECTS_CARD = '#main article[data-card]';
const TEASER_CARD = 'section[aria-labelledby="next-project-title"] article[data-card]';

function detailHref(): string {
  const detail = expectedDetails('en').find((entry) => entry.slug === DETAIL_SLUG);
  if (detail === undefined) throw new Error(`parallax: no project "${DETAIL_SLUG}"`);
  return detail.href;
}

interface Subject {
  name: string;
  path: string;
  card: (page: Page) => Locator;
}

const SUBJECTS: Subject[] = [
  // The second tile: the first is the eager LCP cover, which never moves.
  { name: 'Projects card', path: '/projects/', card: (page) => page.locator(PROJECTS_CARD).nth(1) },
  { name: 'Home compact card', path: '/', card: (page) => page.locator(HOME_CARD).first() },
  { name: 'Next-project teaser', path: detailHref(), card: (page) => page.locator(TEASER_CARD) },
];

const frameOf = (card: Locator): Locator => card.locator(':scope > div').first();
const imageOf = (card: Locator): Locator => card.locator('img').first();

async function frames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

type Position = 'entering' | 'centred' | 'leaving';

/**
 * Scrolls so the frame is just entering at the bottom (15% visible), centred, or just leaving at
 * the top (15% visible). Instant, then a short wait for Lenis to sync and two frames to paint.
 */
async function scrollFrame(page: Page, card: Locator, position: Position): Promise<void> {
  await frameOf(card).evaluate((frame, where) => {
    const rect = frame.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const vh = window.innerHeight;
    const target =
      where === 'entering'
        ? top - vh + rect.height * 0.15
        : where === 'centred'
          ? top - (vh - rect.height) / 2
          : top + rect.height * 0.85;
    const max = document.documentElement.scrollHeight - vh;
    window.scrollTo({ top: Math.max(0, Math.min(max, target)), behavior: 'instant' });
  }, position);
  await page.waitForTimeout(250);
  await frames(page);
}

interface Reading {
  translateY: number;
  translate: string;
  imageTop: number;
  imageBottom: number;
  imageHeight: number;
  frameTop: number;
  frameBottom: number;
  frameHeight: number;
}

function read(card: Locator): Promise<Reading> {
  return card.evaluate((article) => {
    const frame = article.querySelector(':scope > div');
    const image = article.querySelector('img');
    if (frame === null || image === null) throw new Error('parallax: card has no frame or image');
    const translate = getComputedStyle(image).translate;
    const parts = translate === 'none' ? [] : translate.split(/\s+/);
    const f = frame.getBoundingClientRect();
    const i = image.getBoundingClientRect();
    return {
      translateY: parts.length > 1 ? Number.parseFloat(parts[1] ?? '0') : 0,
      translate,
      imageTop: i.top,
      imageBottom: i.bottom,
      imageHeight: image.offsetHeight,
      frameTop: f.top,
      frameBottom: f.bottom,
      frameHeight: (frame as HTMLElement).offsetHeight,
    };
  });
}

/** Scrolls the card into view and waits for its reveal (shutter and picture scale) to end. */
async function revealed(page: Page, card: Locator): Promise<void> {
  await scrollFrame(page, card, 'centred');
  await expect(frameOf(card)).toHaveAttribute('data-revealed', '');
  await card.evaluate(async (article) => {
    // Scroll-linked animations never finish while the frame is on screen: wait for time-based ones.
    const timed = article
      .getAnimations({ subtree: true })
      .filter((animation) => animation.timeline instanceof DocumentTimeline);
    await Promise.allSettled(timed.map((animation) => animation.finished));
  });
}

function expectCovers(reading: Reading): void {
  expect(reading.imageTop).toBeLessThanOrEqual(reading.frameTop + 0.5);
  expect(reading.imageBottom).toBeGreaterThanOrEqual(reading.frameBottom - 0.5);
}

async function expectDrift(page: Page, subject: Subject): Promise<void> {
  await page.goto(subject.path);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
  const card = subject.card(page);
  await expect(imageOf(card)).toHaveAttribute('data-parallax', '');
  await expect(frameOf(card)).toHaveAttribute('data-parallax-frame', '');
  await revealed(page, card);

  const readings: Reading[] = [];
  for (const position of ['entering', 'centred', 'leaving'] as const) {
    await scrollFrame(page, card, position);
    const reading = await read(card);
    expectCovers(reading);
    readings.push(reading);
  }
  const [entering, , leaving] = readings;
  if (entering === undefined || leaving === undefined) throw new Error('parallax: no readings');
  expect(entering.translate).not.toBe(leaving.translate);
  // Up while entering, down while leaving (from -travel to +travel).
  expect(entering.translateY).toBeLessThan(0);
  expect(leaving.translateY).toBeGreaterThan(0);
  expect(leaving.translateY - entering.translateY).toBeGreaterThan(4);
}

async function expectStill(page: Page): Promise<void> {
  const images = page.locator('[data-parallax]');
  const count = await images.count();
  expect(count).toBeGreaterThan(0);
  const states = await images.evaluateAll((list) =>
    list.map((image) => {
      const frame = image.closest('[data-parallax-frame]');
      return {
        translate: getComputedStyle(image).translate,
        animations: image
          .getAnimations()
          .filter((a) => a instanceof CSSAnimation && a.animationName === 'parallax').length,
        imageHeight: image.getBoundingClientRect().height,
        frameHeight: frame?.getBoundingClientRect().height ?? -1,
      };
    }),
  );
  for (const state of states) {
    expect(state.translate).toBe('none');
    expect(state.animations).toBe(0);
    expect(Math.abs(state.imageHeight - state.frameHeight)).toBeLessThanOrEqual(0.5);
  }
}

test.describe('parallax drift under on (1440)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const subject of SUBJECTS) {
    test(`drift: ${subject.name} moves with scroll and never shows an edge`, async ({ page }) => {
      await expectDrift(page, subject);
    });
  }
});

test.describe('parallax drift under on (390)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('drift: Projects card at 390', async ({ page }) => {
    const subject = SUBJECTS[0];
    if (subject === undefined) throw new Error('parallax: no subject');
    await expectDrift(page, subject);
  });
});

// Touch: the device profile flips the pointer to coarse; parallax is native-scroll driven (D-12).
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['Pixel 7'];
test.describe('parallax drift on touch (Pixel 7)', () => {
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test('drift: Projects card on a coarse pointer', async ({ page }) => {
    const subject = SUBJECTS[0];
    if (subject === undefined) throw new Error('parallax: no subject');
    await expectDrift(page, subject);
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
  });
});

test.describe('never parallaxed', () => {
  test('the eager LCP cover and the hero portrait have no parallax hooks', async ({ page }) => {
    await page.goto('/projects/');
    const eager = page.locator(PROJECTS_CARD).first();
    await expect(eager.locator('img')).toHaveAttribute('loading', 'eager');
    await expect(eager.locator('[data-parallax]')).toHaveCount(0);
    await expect(eager.locator('[data-parallax-frame]')).toHaveCount(0);
    await page.goto('/');
    await expect(page.locator('[data-hero] [data-parallax]')).toHaveCount(0);
    await expect(page.locator('[data-hero] [data-parallax-frame]')).toHaveCount(0);
  });
});

test.describe('hover composes with drift (D-13)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('drift: a hovered lazy card zooms while it keeps its translate', async ({ page }) => {
    await page.goto('/projects/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    const card = page.locator(PROJECTS_CARD).nth(1);
    await revealed(page, card);
    await scrollFrame(page, card, 'centred');
    // Off-centre so the translate is clearly non-zero while hovering.
    await page.evaluate(() => {
      window.scrollBy({ top: 120, behavior: 'instant' });
    });
    await page.waitForTimeout(250);
    await frameOf(card).hover();
    await page.waitForTimeout(600);
    const state = await imageOf(card).evaluate((image) => {
      const style = getComputedStyle(image);
      return { scale: style.scale, translate: style.translate };
    });
    expect(['none', '1']).not.toContain(state.scale);
    expect(state.translate).not.toBe('none');
    const mat = await card
      .locator('[data-card-mat]')
      .evaluate((picture) => getComputedStyle(picture).clipPath);
    expect(mat).toContain('12px');
  });
});

/** Frame heights of every card frame on a page, in DOM order. */
async function frameHeights(page: Page, path: string): Promise<number[]> {
  await page.goto(path);
  return page
    .locator('article[data-card] > div:first-child')
    .evaluateAll((list) => list.map((frame) => frame.getBoundingClientRect().height));
}

async function reducedPage(
  browser: Browser,
  size: { width: number; height: number },
): Promise<Page> {
  const context = await browser.newContext({ viewport: size, reducedMotion: 'reduce' });
  return context.newPage();
}

for (const size of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`no layout shift at ${size.width}`, () => {
    test.use({ viewport: size });

    test('card frames keep the same height under on and reduced', async ({ page, browser }) => {
      for (const path of ['/', '/projects/', detailHref()]) {
        const on = await frameHeights(page, path);
        const other = await reducedPage(browser, size);
        await other.goto(path);
        await expect(other.locator('html')).toHaveAttribute('data-motion', 'reduced');
        const reduced = await other
          .locator('article[data-card] > div:first-child')
          .evaluateAll((list) => list.map((frame) => frame.getBoundingClientRect().height));
        await other.context().close();
        expect(on.length).toBe(reduced.length);
        on.forEach((height, index) => {
          expect(Math.abs(height - (reduced[index] ?? -1))).toBeLessThanOrEqual(0.5);
        });
      }
    });

    test('the page never gains horizontal overflow', async ({ page }) => {
      for (const path of ['/', '/projects/']) {
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
        for (const fraction of [0, 0.5, 1]) {
          await page.evaluate((f) => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo({ top: max * f, behavior: 'instant' });
          }, fraction);
          await page.waitForTimeout(150);
          const { scrollWidth, clientWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          }));
          expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
        }
      }
    });
  });
}

test.describe('still states (D-18, SC4)', () => {
  test.describe('reduced (OS setting)', () => {
    test.use({ reducedMotion: 'reduce' });

    test('every parallax image is still and frame-sized', async ({ page }) => {
      for (const path of ['/', '/projects/', detailHref()]) {
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
        await page.evaluate(() => {
          window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'instant' });
        });
        await frames(page);
        await expectStill(page);
      }
    });
  });

  test('off (no matchMedia): every parallax image is still', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true });
    });
    await page.goto('/projects/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'instant' });
    });
    await frames(page);
    await expectStill(page);
  });

  test('a live toggle to reduced stops the drift in place', async ({ page }) => {
    await page.goto('/projects/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    const card = page.locator(PROJECTS_CARD).nth(1);
    await expect(imageOf(card)).toHaveAttribute('data-parallax', '');
    await revealed(page, card);
    await scrollFrame(page, card, 'entering');
    expect((await read(card)).translate).not.toBe('none');
    // A dispatched click: a real one would scroll the header control into view first.
    await page
      .getByRole('button', { name: en['motion.toggle'], exact: true })
      .dispatchEvent('click', { button: 0 });
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await frames(page);
    await expectStill(page);
  });

  test('print resets every parallax image to its frame', async ({ page }) => {
    await page.goto('/projects/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    const card = page.locator(PROJECTS_CARD).nth(1);
    await expect(imageOf(card)).toHaveAttribute('data-parallax', '');
    await scrollFrame(page, card, 'entering');
    await page.emulateMedia({ media: 'print' });
    await frames(page);
    const states = await page.locator('[data-parallax]').evaluateAll((list) =>
      list.map((image) => ({
        translate: getComputedStyle(image).translate,
        imageHeight: image.getBoundingClientRect().height,
        frameHeight: image.closest('[data-parallax-frame]')?.getBoundingClientRect().height ?? -1,
      })),
    );
    for (const state of states) {
      expect(state.translate).toBe('none');
      expect(Math.abs(state.imageHeight - state.frameHeight)).toBeLessThanOrEqual(0.5);
    }
  });
});
