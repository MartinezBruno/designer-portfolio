import { expect, test, type Page } from '@playwright/test';
import { expectedDetails } from './helpers/projects';

// Scroll reveals (MOTN-01, UI-SPEC "Reveal Contract"): V-03 (JS fails after the gate), V-05
// (every element reveals once and never re-hides), focus reveal (Pitfall 7) and the LCP cover rule.

interface RevealState {
  revealed: boolean;
  opacity: string;
  translate: string;
  clipPath: string;
}

function readReveals(page: Page): Promise<RevealState[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-reveal]')].map((el) => {
      const style = getComputedStyle(el);
      return {
        revealed: el.hasAttribute('data-revealed'),
        opacity: style.opacity,
        translate: style.translate,
        clipPath: style.clipPath,
      };
    }),
  );
}

const openClip = (clip: string): boolean => clip === 'none' || clip === 'inset(0px)';

/** Wheels down until the page bottom, so the observer and scrollend see real user scrolling. */
async function scrollToBottom(page: Page): Promise<void> {
  for (let i = 0; i < 60; i += 1) {
    const atBottom = await page.evaluate(
      () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
    );
    if (atBottom) break;
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(120);
  }
}

test.describe('reveal failsafe when every script fails after the inline gate', () => {
  for (const path of ['/', '/projects/']) {
    test(`${path} fails safe: every [data-reveal] is visible by 1.6 s`, async ({ page }) => {
      await page.route('**/_astro/**/*.js', (route) => route.abort());
      await page.goto(path);
      // The inline gate still ran: the hidden start states apply until the CSS failsafe fires.
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      expect(await page.locator('[data-reveal]').count()).toBeGreaterThan(0);
      await expect
        .poll(
          async () =>
            (await readReveals(page)).filter(
              (r) => r.opacity !== '1' || !openClip(r.clipPath) || r.translate !== 'none',
            ).length,
          { timeout: 1700, intervals: [100] },
        )
        .toBe(0);
    });
  }
});

test.describe('scroll reveals on Home', () => {
  for (const height of [900, 1600]) {
    test(`scroll at 1440x${String(height)} reveals everything once and never re-hides`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height });
      await page.goto('/');
      await page.waitForLoadState('load');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      await page.mouse.move(720, height / 2);
      await scrollToBottom(page);

      await expect
        .poll(async () => (await readReveals(page)).filter((r) => !r.revealed).length, {
          timeout: 3000,
        })
        .toBe(0);

      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(200);
      await expect
        .poll(
          async () =>
            (await readReveals(page)).filter(
              (r) => !r.revealed || r.opacity !== '1' || !openClip(r.clipPath),
            ).length,
          { timeout: 3000 },
        )
        .toBe(0);
    });
  }
});

test.describe('shutter reveal', () => {
  // clip-path cannot interpolate between inset() and none; the open state must be inset(0).
  test('the scroll shutter opens through intermediate clip values', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    const samples = await page.evaluate(async () => {
      const heading = document.getElementById('work-title');
      const frame = document.querySelector(
        'section[aria-labelledby="work-title"] [data-reveal="shutter"]',
      );
      if (!heading || !frame) return [];
      window.scrollTo(0, heading.getBoundingClientRect().top + window.scrollY - 96);
      const out: string[] = [];
      const start = performance.now();
      while (performance.now() - start < 1000) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        out.push(getComputedStyle(frame).clipPath);
      }
      return out;
    });
    const partial = samples.filter((clip) => /^inset\(0px 0px (?!100%)[\d.]+%\)$/.test(clip));
    expect(partial.length, `samples: ${samples.join(', ')}`).toBeGreaterThan(0);
    expect(samples.at(-1)).toBe('inset(0px)');
  });
});

test.describe('keyboard focus reveals a card instantly', () => {
  test('focus on the first Latest-work card reveals it within one frame', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    const card = page.locator('section[aria-labelledby="work-title"] article').first();
    const link = card.locator('a').first();
    // Precondition: below the fold and not yet revealed, so the test proves the focus path.
    expect(
      await card.evaluate((article) =>
        [...article.querySelectorAll('[data-reveal]')].some((el) =>
          el.hasAttribute('data-revealed'),
        ),
      ),
    ).toBe(false);

    let onCard = false;
    for (let i = 0; i < 30 && !onCard; i += 1) {
      await page.keyboard.press('Tab');
      onCard = await link.evaluate((a) => document.activeElement === a);
    }
    expect(onCard, 'Tab should reach the first Latest-work card').toBe(true);

    const state = await card.evaluate(async (article) => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const parts = [...article.querySelectorAll<HTMLElement>('[data-reveal]')];
      const text = article.querySelector<HTMLElement>('[data-reveal="settle"]');
      return {
        count: parts.length,
        allRevealed: parts.every((el) => el.hasAttribute('data-revealed')),
        textOpacity: text ? getComputedStyle(text).opacity : null,
      };
    });
    expect(state.count).toBe(2);
    expect(state.allRevealed).toBe(true);
    expect(state.textOpacity).toBe('1');
  });
});

test.describe('LCP cover', () => {
  test('lcp cover: the first Projects card cover frame is never a reveal target', async ({
    page,
  }) => {
    await page.goto('/projects/');
    const frame = page.locator('#main article').first().locator('> div').first();
    await expect(frame.locator('picture img')).toHaveAttribute('loading', 'eager');
    expect(await frame.getAttribute('data-reveal')).toBeNull();
    // Later covers do shutter.
    const second = page.locator('#main article').nth(1).locator('> div').first();
    await expect(second).toHaveAttribute('data-reveal', 'shutter');
  });
});

// Projects page heading block and detail pages (Phase 6 D-04, amends Phase 4 D-04), both locales.
const firstDetail = (locale: 'en' | 'es'): string => {
  const detail = expectedDetails(locale)[0];
  if (detail === undefined) throw new Error(`no visible ${locale} project`);
  return detail.href;
};
const DETAIL_PATHS = [firstDetail('en'), firstDetail('es')];
const PROJECT_PAGES = ['/projects/', '/es/projects/', ...DETAIL_PATHS];
/** The edge-to-edge module stack (ProjectDetailView): the article's direct child after the intro. */
const STACK = 'article[aria-labelledby="project-title"] > div';

const hiddenCount = (states: RevealState[]): number =>
  states.filter((r) => r.opacity !== '1' || !openClip(r.clipPath) || r.translate !== 'none').length;

/** Detail pages run tens of thousands of pixels: wheel in larger steps, sampling as we go. */
async function scrollDetailToBottom(page: Page, onStep?: () => Promise<void>): Promise<void> {
  for (let i = 0; i < 400; i += 1) {
    const atBottom = await page.evaluate(
      () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
    );
    if (atBottom) break;
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(60);
    if (onStep) await onStep();
  }
}

test.describe('Projects and detail reveals without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  for (const path of PROJECT_PAGES) {
    test(`${path} without JavaScript shows every [data-reveal]`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('html')).not.toHaveAttribute('data-motion', /on|reduced/);
      const states = await readReveals(page);
      expect(states.length).toBeGreaterThan(0);
      expect(hiddenCount(states)).toBe(0);
    });
  }
});

test.describe('Projects and detail reveals when every script fails', () => {
  for (const path of PROJECT_PAGES) {
    test(`${path} fails safe: every [data-reveal] is visible by 1.6 s`, async ({ page }) => {
      await page.route('**/_astro/**/*.js', (route) => route.abort());
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      expect(await page.locator('[data-reveal]').count()).toBeGreaterThan(0);
      await expect
        .poll(async () => hiddenCount(await readReveals(page)), {
          timeout: 1700,
          intervals: [100],
        })
        .toBe(0);
    });
  }
});

test.describe('Projects and detail scroll reveals', () => {
  for (const path of PROJECT_PAGES) {
    test(`${path} scroll at 1440x900 reveals everything once and never re-hides`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      await page.waitForLoadState('load');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      await page.mouse.move(720, 450);
      await scrollDetailToBottom(page);

      await expect
        .poll(async () => (await readReveals(page)).filter((r) => !r.revealed).length, {
          timeout: 3000,
        })
        .toBe(0);

      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(200);
      await expect
        .poll(
          async () =>
            (await readReveals(page)).filter((r) => !r.revealed || r.opacity !== '1').length +
            hiddenCount(await readReveals(page)),
          { timeout: 3000 },
        )
        .toBe(0);
    });
  }
});

test.describe('detail module stack', () => {
  for (const path of DETAIL_PATHS) {
    test(`${path} static stack: no reveal inside, every module image opaque while scrolling`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      await page.waitForLoadState('load');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');

      const stack = page.locator(STACK);
      await expect(stack).toHaveCount(1);
      expect(await stack.evaluate((el) => el.hasAttribute('data-reveal'))).toBe(false);
      // Text modules settle as one block; nothing else in the stack (images, grids, embeds) does.
      const kinds = await stack.evaluate((el) =>
        [...el.querySelectorAll('[data-reveal]')].map(
          (node) =>
            `${node.tagName}:${node.getAttribute('data-reveal') ?? ''}:${String(node.querySelector('img') !== null)}`,
        ),
      );
      for (const kind of kinds) expect(kind).toBe('DIV:settle:false');
      expect(await stack.locator('img').count()).toBeGreaterThan(0);

      const faded: string[] = [];
      const sample = async (): Promise<void> => {
        const low = await stack.evaluate((el) =>
          [...el.querySelectorAll('img')].flatMap((img) => {
            let opacity = 1;
            for (let node: Element | null = img; node; node = node.parentElement) {
              opacity *= Number.parseFloat(getComputedStyle(node).opacity);
            }
            return opacity < 1 ? [`${img.currentSrc || img.src}@${String(opacity)}`] : [];
          }),
        );
        faded.push(...low);
      };
      await sample();
      await scrollDetailToBottom(page, sample);
      expect(faded).toEqual([]);
    });
  }
});
