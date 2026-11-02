import { devices, expect, test, type Browser, type Page } from '@playwright/test';
import { en } from '../../src/i18n/ui.en';
import { settleMotion } from './helpers/motion';
import { softNavigate } from './helpers/navigation';
import { expectedDetails } from './helpers/projects';

// Detail-stack side entrance (MOTN-06; 07 D-11a, D-12, D-18; UI-SPEC "Detail-stack side
// entrance"; Phase 4 D-01). CSS scroll-driven animation only: under 'on' each eligible detail
// ImageModule image slides horizontally into its own overflow-clip frame as the frame enters the
// viewport, alternating left and right, and rests at exactly 0. 'reduced', 'off' and print leave
// the Phase 4/6 box. Offsets are measured in px from the rects (img left minus frame left): the
// computed translate is a percentage of the image.

const STACK = 'article[aria-labelledby="project-title"] > div.max-w-\\[1400px\\]';
const MOVING = 'img[data-stack-enter]';

let subjectHref: string | null = null;

interface Hold {
  held: number[][];
  names: string[];
}

/**
 * The first EN detail page with at least two side-entrance images, so the spec survives the
 * Task 3 opt-outs. Computed once per worker.
 */
async function subject(browser: Browser): Promise<string> {
  if (subjectHref !== null) return subjectHref;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    for (const detail of expectedDetails('en')) {
      await page.goto(detail.href);
      if ((await page.locator(MOVING).count()) >= 2) {
        subjectHref = detail.href;
        return detail.href;
      }
    }
  } finally {
    await context.close();
  }
  throw new Error('no detail page has two side-entrance images');
}

async function frames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

/** Instant scroll, a short wait for Lenis to sync, then two frames to paint. */
async function scrollToY(page: Page, top: number): Promise<void> {
  await page.evaluate((y) => {
    window.scrollTo({ top: y, behavior: 'instant' });
  }, top);
  await page.waitForTimeout(250);
  await frames(page);
}

type Position = 'entering' | 'mid' | 'settled';

/**
 * Scroll target for the nth moving image's frame: entering = its top 40 px inside the viewport
 * bottom; settled = its top at the viewport top (past entry 100%); mid = about half of the entry
 * range (the range ends when the frame is fully in, or its top reaches the scroll padding).
 */
async function targetFor(page: Page, index: number, position: Position): Promise<number> {
  return page
    .locator(MOVING)
    .nth(index)
    .evaluate((image, where) => {
      const frame = image.closest('[data-stack-frame]');
      if (frame === null) throw new Error('stack-entrance: moving image without a frame');
      const rect = frame.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const vh = window.innerHeight;
      const padding = Number.parseFloat(
        getComputedStyle(document.documentElement).scrollPaddingTop,
      );
      const entry = Math.min(rect.height, vh - (Number.isNaN(padding) ? 0 : padding));
      const frameTop =
        where === 'entering' ? vh - 40 : where === 'mid' ? vh - 40 - (entry - 40) / 2 : 0;
      return top - frameTop;
    }, position);
}

interface Reading {
  side: string | null;
  offset: number;
  translate: string;
  frameHeight: number;
  imageHeight: number;
  animations: number;
  scrollLinked: boolean;
  viewTransitionNames: string[];
}

function readAll(page: Page): Promise<Reading[]> {
  return page.locator(MOVING).evaluateAll((list) =>
    list.map((image) => {
      const frame = image.closest('[data-stack-frame]');
      if (frame === null) throw new Error('stack-entrance: moving image without a frame');
      const animations = image
        .getAnimations()
        .filter((a) => a instanceof CSSAnimation && a.animationName === 'stack-enter');
      return {
        side: image.getAttribute('data-stack-enter'),
        offset: image.getBoundingClientRect().left - frame.getBoundingClientRect().left,
        translate: getComputedStyle(image).translate,
        frameHeight: frame.getBoundingClientRect().height,
        imageHeight: image.getBoundingClientRect().height,
        animations: animations.length,
        scrollLinked:
          animations.length > 0 &&
          animations.every((a) => a.timeline !== null && !(a.timeline instanceof DocumentTimeline)),
        viewTransitionNames: [
          getComputedStyle(frame).viewTransitionName,
          getComputedStyle(image).viewTransitionName,
        ],
      };
    }),
  );
}

async function offsetAt(page: Page, index: number, position: Position): Promise<number> {
  const target = await targetFor(page, index, position);
  expect(target, `${position} target for moving image ${String(index)}`).toBeGreaterThan(0);
  await scrollToY(page, target);
  const reading = (await readAll(page))[index];
  if (reading === undefined) throw new Error('stack-entrance: no reading');
  return reading.offset;
}

async function openOn(page: Page, href: string): Promise<void> {
  await page.goto(href);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
}

async function expectStillAtEntering(page: Page): Promise<void> {
  await scrollToY(page, await targetFor(page, 0, 'entering'));
  const readings = await readAll(page);
  expect(readings.length).toBeGreaterThan(1);
  for (const reading of readings) {
    expect(reading.translate).toBe('none');
    expect(Math.abs(reading.offset)).toBeLessThanOrEqual(0.5);
    expect(reading.animations).toBe(0);
  }
}

test.describe('side entrance under on (1440)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('alternates left, right in DOM order on scroll-linked stack-enter animations', async ({
    page,
    browser,
  }) => {
    await openOn(page, await subject(browser));
    const readings = await readAll(page);
    expect(readings.map((reading) => reading.side)).toEqual(
      readings.map((_, index) => (index % 2 === 0 ? 'left' : 'right')),
    );
    // The animation really runs (07-08: a minified shorthand was silently dropped).
    for (const reading of readings) {
      expect(reading.animations).toBe(1);
      expect(reading.scrollLinked).toBe(true);
    }
  });

  test('the first two images slide in from opposite sides, scrubbed, and rest at 0', async ({
    page,
    browser,
  }) => {
    await openOn(page, await subject(browser));
    for (const [index, sign] of [
      [0, -1],
      [1, 1],
    ] as const) {
      const entering = await offsetAt(page, index, 'entering');
      const mid = await offsetAt(page, index, 'mid');
      const settled = await offsetAt(page, index, 'settled');
      expect(entering * sign).toBeGreaterThan(20);
      // Scrubbed by scroll position, not timed: the offset shrinks monotonically toward 0.
      expect(Math.abs(entering)).toBeGreaterThan(Math.abs(mid));
      expect(Math.abs(mid)).toBeGreaterThan(Math.abs(settled));
      expect(mid * sign).toBeGreaterThan(0);
      expect(Math.abs(settled)).toBeLessThanOrEqual(0.5);
    }
  });

  test('the stack stays seamless and every frame is its image height', async ({
    page,
    browser,
  }) => {
    await openOn(page, await subject(browser));
    for (const position of ['entering', 'mid', 'settled'] as const) {
      await scrollToY(page, await targetFor(page, 0, position));
      const gaps = await page.locator(`${STACK} > *`).evaluateAll((list) =>
        list.slice(1).map((module, index) => {
          const previous = list[index];
          if (previous === undefined) return 0;
          return module.getBoundingClientRect().top - previous.getBoundingClientRect().bottom;
        }),
      );
      for (const gap of gaps) expect(Math.abs(gap)).toBeLessThanOrEqual(0.5);
      for (const reading of await readAll(page)) {
        expect(Math.abs(reading.frameHeight - reading.imageHeight)).toBeLessThanOrEqual(0.5);
      }
    }
  });

  test('the eager image, collections, embeds and text never move', async ({ page, browser }) => {
    await openOn(page, await subject(browser));
    const eager = page.locator(`${STACK} img`).first();
    await expect(eager).toHaveAttribute('loading', 'eager');
    expect(
      await eager.evaluate(
        (image) =>
          image.hasAttribute('data-stack-enter') || image.closest('[data-stack-frame]') !== null,
      ),
    ).toBe(false);
    for (const selector of ['[class*="sm:grow-"]', '[data-embed-facade]', 'div.max-w-\\[65ch\\]']) {
      await expect(page.locator(`${STACK} ${selector} [data-stack-enter]`)).toHaveCount(0);
    }
  });

  test('frames carry no view-transition-name and the arrival hold keeps the same offsets', async ({
    page,
    browser,
  }) => {
    const href = await subject(browser);
    await page.goto('/projects/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await settleMotion(page);
    await page.evaluate(() => {
      const record: Hold = { held: [], names: [] };
      (window as unknown as { __stackHold: Hold }).__stackHold = record;
      const sample = (): number[] =>
        [...document.querySelectorAll('img[data-stack-enter]')].map((image) => {
          const frame = image.closest('[data-stack-frame]');
          return image.getBoundingClientRect().left - (frame?.getBoundingClientRect().left ?? 0);
        });
      const original = document.startViewTransition?.bind(document);
      if (original === undefined) return;
      document.startViewTransition = ((callback?: ViewTransitionUpdateCallback) => {
        const transition = original(callback);
        void transition.ready
          .then(() => {
            const html = document.documentElement;
            if (!html.hasAttribute('data-vt')) return;
            for (const element of document.querySelectorAll(
              '[data-stack-frame], [data-stack-enter]',
            )) {
              record.names.push(getComputedStyle(element).viewTransitionName);
            }
            // Offsets two frames later, still under the hold (released at 70% of --t-wipe at the
            // earliest). At `ready` itself the new view timelines have not been sampled yet, so
            // every image still reads 0 for that one frame, under the ink panel.
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                if (html.hasAttribute('data-vt')) record.held.push(sample());
              }),
            );
          })
          .catch(() => undefined);
        return transition;
      }) as typeof document.startViewTransition;
    });
    await softNavigate(page, page.locator(`main article a[href="${href}"]`).first());
    expect(new URL(page.url()).pathname).toBe(href);
    await expect(page.locator('html')).not.toHaveAttribute('data-vt', /.*/);
    const record = await page.evaluate(
      () => (window as unknown as { __stackHold: Hold }).__stackHold,
    );
    expect(record.held).toHaveLength(1);
    const held = record.held[0] ?? [];
    await frames(page);
    const released = await readAll(page);
    expect(held.length).toBe(released.length);
    released.forEach((reading, index) => {
      expect(Math.abs(reading.offset - (held[index] ?? Number.NaN))).toBeLessThanOrEqual(0.5);
      expect(reading.viewTransitionNames).toEqual(['none', 'none']);
    });
    expect(record.names.length).toBeGreaterThan(0);
    for (const name of record.names) expect(name).toBe('none');
  });
});

for (const size of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`layout at ${String(size.width)}`, () => {
    test.use({ viewport: size });

    test('the stack height is identical under on and reduced', async ({ page, browser }) => {
      const href = await subject(browser);
      await openOn(page, href);
      const on = await page
        .locator(STACK)
        .evaluate((stack) => stack.getBoundingClientRect().height);
      const context = await browser.newContext({ viewport: size, reducedMotion: 'reduce' });
      const other = await context.newPage();
      await other.goto(href);
      await expect(other.locator('html')).toHaveAttribute('data-motion', 'reduced');
      const reduced = await other
        .locator(STACK)
        .evaluate((stack) => stack.getBoundingClientRect().height);
      await context.close();
      expect(Math.abs(on - reduced)).toBeLessThanOrEqual(1);
    });

    test('the page never gains horizontal overflow at the entering position', async ({
      page,
      browser,
    }) => {
      await openOn(page, await subject(browser));
      for (const index of [0, 1]) {
        await scrollToY(page, await targetFor(page, index, 'entering'));
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
      }
    });
  });
}

// Touch: the device profile flips the pointer to coarse; the entrance is native-scroll driven (D-12).
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['Pixel 7'];
test.describe('side entrance on touch (Pixel 7)', () => {
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test('the first image still slides in on a coarse pointer', async ({ page, browser }) => {
    await openOn(page, await subject(browser));
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const entering = await offsetAt(page, 0, 'entering');
    const settled = await offsetAt(page, 0, 'settled');
    expect(entering).toBeLessThan(-5);
    expect(Math.abs(entering - settled)).toBeGreaterThan(5);
    expect(Math.abs(settled)).toBeLessThanOrEqual(0.5);
  });
});

test.describe('still states (D-18, SC4)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.describe('reduced (OS setting)', () => {
    test.use({ reducedMotion: 'reduce' });

    test('every side-entrance image is still', async ({ page, browser }) => {
      await page.goto(await subject(browser));
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
      await expectStillAtEntering(page);
    });
  });

  test('off (no matchMedia): every side-entrance image is still', async ({ page, browser }) => {
    const href = await subject(browser);
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true });
    });
    await page.goto(href);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await expectStillAtEntering(page);
  });

  test('a live toggle to reduced stops the entrance in place', async ({ page, browser }) => {
    await openOn(page, await subject(browser));
    expect(Math.abs(await offsetAt(page, 0, 'entering'))).toBeGreaterThan(20);
    // A dispatched click: a real one would scroll the header control into view first.
    await page
      .getByRole('button', { name: en['motion.toggle'], exact: true })
      .dispatchEvent('click', { button: 0 });
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await frames(page);
    await expectStillAtEntering(page);
  });

  test('print resets every side-entrance image', async ({ page, browser }) => {
    await openOn(page, await subject(browser));
    await scrollToY(page, await targetFor(page, 0, 'entering'));
    await page.emulateMedia({ media: 'print' });
    await frames(page);
    for (const reading of await readAll(page)) {
      expect(reading.translate).toBe('none');
      expect(Math.abs(reading.offset)).toBeLessThanOrEqual(0.5);
    }
  });
});
