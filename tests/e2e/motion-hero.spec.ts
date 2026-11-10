import { expect, test, type Page } from '@playwright/test';

// Hero load sequence (D-03, UI-SPEC "Hero load sequence"): CSS only, ends by 960ms, never replays,
// static under reduced/off, and its accessible name never changes.
const pages = [
  { path: '/', name: "Hi, I'm Martina." },
  { path: '/es/', name: 'Hola, soy Martina.' },
] as const;

const HOOKS =
  '[data-hero-line-inner], picture[data-hero-portrait], picture[data-hero-portrait] img, [data-hero-lead], [data-hero-cta]';

/** Resolves once the page clock passes `ms` since navigation start. */
async function waitUntil(page: Page, ms: number): Promise<void> {
  await page.waitForFunction((t) => performance.now() >= t, ms);
}

interface HookState {
  count: number;
  running: number;
  notAtRest: string[];
}

/**
 * Hero-hook elements with a running hero-* animation, and any not at the rest values. `strict`
 * demands the computed `none` that data-hero-played leaves; otherwise the forwards fill of a
 * finished keyframe (no script to set the marker) may serialize the same rest pose as `0px 0%`,
 * `1` or `inset(0% 0px 0px)`.
 */
async function heroState(page: Page, strict = true): Promise<HookState> {
  return page.evaluate(
    ([selector, exact]) => {
      const zero = (v: string): boolean => /^0(px|%)?( 0(px|%)?){0,2}$/.test(v);
      const restTranslate = (v: string): boolean => v === 'none' || (!exact && zero(v));
      const restScale = (v: string): boolean => v === 'none' || (!exact && v === '1');
      const restClip = (v: string): boolean =>
        v === 'none' || v === 'inset(0px)' || (!exact && /^inset\((0(px|%)? ?)+\)$/.test(v));
      const els = [...document.querySelectorAll<HTMLElement>(selector)];
      let running = 0;
      const notAtRest: string[] = [];
      for (const el of els) {
        running += el
          .getAnimations()
          .filter(
            (a) =>
              a instanceof CSSAnimation &&
              a.animationName.startsWith('hero-') &&
              a.playState === 'running',
          ).length;
        const cs = getComputedStyle(el);
        const clip = cs.clipPath;
        if (
          cs.opacity !== '1' ||
          !restTranslate(cs.translate) ||
          !restScale(cs.scale) ||
          !restClip(clip)
        ) {
          notAtRest.push(
            `${el.tagName}${el.getAttributeNames().join(',')}: o=${cs.opacity} t=${cs.translate} s=${cs.scale} c=${clip}`,
          );
        }
      }
      return { count: els.length, running, notAtRest };
    },
    [HOOKS, strict] as const,
  );
}

test.describe('hero load sequence with full motion', () => {
  for (const { path, name } of pages) {
    test(`${path} plays the CSS sequence once and settles by 1100ms`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      const title = page.locator('#hero-title');
      await expect(title).toHaveAccessibleName(name);

      await waitUntil(page, 200);
      await expect(title).toHaveAccessibleName(name);

      await waitUntil(page, 1100);
      await expect(page.locator('[data-hero]')).toHaveAttribute('data-hero-played', '');
      const state = await heroState(page);
      expect(state.count).toBe(6);
      expect(state.running).toBe(0);
      expect(state.notAtRest).toEqual([]);
      await expect(title).toHaveAccessibleName(name);
    });

    test(`${path} starts on the first frame (mid-sequence the headline is moving)`, async ({
      page,
    }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      const names = await page.evaluate(() =>
        document
          .querySelector('[data-hero-line-inner]')
          ?.getAnimations()
          .map((a) => (a instanceof CSSAnimation ? a.animationName : '')),
      );
      // Either still running, or (on a very slow first paint) already marked played.
      const played = await page.locator('[data-hero]').getAttribute('data-hero-played');
      if (played === null) expect(names).toContain('hero-rise');
    });
  }

  test('the first frame is never blank (UI-SPEC fallback start values)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    // Seek every hero animation to its start so the check is the frame-0 pose, not a later one.
    const frame0 = await page.evaluate(() => {
      for (const a of document.getAnimations()) {
        if (a instanceof CSSAnimation && a.animationName.startsWith('hero-')) {
          a.pause();
          a.currentTime = 0;
        }
      }
      const lines = [...document.querySelectorAll<HTMLElement>('[data-hero-line]')].map((mask) => {
        const inner = mask.querySelector<HTMLElement>('[data-hero-line-inner]');
        const m = mask.getBoundingClientRect();
        const i = inner?.getBoundingClientRect();
        // Visible share of the inner line inside its mask.
        return i ? (Math.min(m.bottom, i.bottom) - Math.max(m.top, i.top)) / i.height : 0;
      });
      const picture = document.querySelector('picture[data-hero-portrait]');
      return {
        lines,
        clip: picture ? getComputedStyle(picture).clipPath : '',
        height: picture ? picture.getBoundingClientRect().height : 0,
        bg: picture ? getComputedStyle(picture).backgroundColor : '',
      };
    });
    // Line 1 starts at 60% down (about 40% showing); line 2 waits 90ms in its fill-backwards pose.
    for (const visible of frame0.lines) expect(visible).toBeGreaterThan(0.3);
    expect(frame0.clip).toBe('inset(35% 0px 0px)');
    // The arch keeps its box and accent ground on frame 0, so the unmask never shows a gap.
    expect(frame0.height).toBeGreaterThan(0);
    expect(frame0.bg).toBe('rgb(15, 112, 183)');
  });

  test('the sequence completes with every module script aborted (CSS only)', async ({ page }) => {
    await page.route('**/_astro/**/*.js', (route) => route.abort());
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await waitUntil(page, 1100);
    // No script, so no data-hero-played: the CSS fill alone must hold the visible rest pose.
    await expect(page.locator('[data-hero]')).not.toHaveAttribute('data-hero-played');
    const state = await heroState(page, false);
    expect(state.running).toBe(0);
    expect(state.notAtRest).toEqual([]);
  });

  test('the hero never replays after reduced -> on', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitUntil(page, 1100);
    const toggle = page.locator('button[data-motion-toggle]');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    const running = await page.evaluate(
      () =>
        [...document.querySelectorAll('[data-hero-line-inner]')].flatMap((el) =>
          el.getAnimations().filter((a) => a.playState === 'running'),
        ).length,
    );
    expect(running).toBe(0);
    expect((await heroState(page)).notAtRest).toEqual([]);
  });
});

test.describe('hero with prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const { path, name } of pages) {
    test(`${path} is static: no animation and rest values at 50ms`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
      await waitUntil(page, 50);
      const state = await heroState(page);
      expect(state.running).toBe(0);
      expect(state.notAtRest).toEqual([]);
      await expect(page.locator('#hero-title')).toHaveAccessibleName(name);
    });
  }
});

interface LineCheck {
  rects: number;
  overflow: number;
  topGap: number;
  bottomGap: number;
  text: string;
}

/** Per masked line: line boxes in the inner span and how far it sits inside its mask (px). */
async function lineChecks(page: Page): Promise<LineCheck[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-hero-line]')].map((mask) => {
      const inner = mask.querySelector<HTMLElement>('[data-hero-line-inner]');
      if (!inner) return { rects: 0, overflow: 0, topGap: 0, bottomGap: 0, text: '' };
      const m = mask.getBoundingClientRect();
      const i = inner.getBoundingClientRect();
      // One text node: its client rects are the rendered line boxes.
      const range = document.createRange();
      range.selectNodeContents(inner);
      const lineTops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
      return {
        rects: Math.max(inner.getClientRects().length, lineTops.size),
        overflow: inner.scrollHeight - mask.clientHeight,
        topGap: i.top - m.top,
        bottomGap: m.bottom - i.bottom,
        text: inner.textContent.trim(),
      };
    }),
  );
}

function expectLinesFit(checks: LineCheck[]): void {
  expect(checks).toHaveLength(2);
  for (const c of checks) {
    expect(c.rects, `${c.text}: one line box`).toBe(1);
    expect(c.overflow, `${c.text}: scrollHeight within mask`).toBeLessThanOrEqual(1);
    expect(c.topGap, `${c.text}: top inside mask`).toBeGreaterThanOrEqual(-1);
    expect(c.bottomGap, `${c.text}: bottom inside mask`).toBeGreaterThanOrEqual(-1);
  }
}

test.describe('hero line masks at narrow widths', () => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test.describe(`narrow ${reducedMotion}`, () => {
      test.use({ viewport: { width: 390, height: 844 }, reducedMotion });

      for (const { path } of pages) {
        test(`narrow 390x844 ${path}: each masked line is one unclipped line box`, async ({
          page,
        }) => {
          await page.goto(path, { waitUntil: 'domcontentloaded' });
          await page.evaluate(() => document.fonts.ready);
          await waitUntil(page, 1100);
          expectLinesFit(await lineChecks(page));
        });
      }
    });
  }

  // Recorded, not blocking (plan 06-05): 320px is below the design's smallest target.
  test.describe('narrow 320x640 (recorded)', () => {
    test.use({ viewport: { width: 320, height: 640 } });

    test('narrow 320x640 /es/: masked line report', async ({ page }) => {
      await page.goto('/es/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      await waitUntil(page, 1100);
      const checks = await lineChecks(page);
      await test.info().attach('hero-lines-320-es.json', {
        body: JSON.stringify(checks, null, 2),
        contentType: 'application/json',
      });
      console.log('hero lines 320x640 /es/', JSON.stringify(checks));
      expect(checks).toHaveLength(2);
    });
  });
});
