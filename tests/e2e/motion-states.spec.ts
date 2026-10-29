import { mkdirSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { en, type Dictionary } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { settleMotion } from './helpers/motion';
import { expectedDetails } from './helpers/projects';

// Opt-in capture of the Phase 6 UI-SPEC motion-state screenshots (UI-SPEC "Verification", items
// 1-6) for the taste-skill review. Nothing is asserted beyond what a capture needs to be valid:
// the behaviour itself is gated by the motion-*.spec.ts files and a11y.spec.ts. Run with
//   CAPTURE_MOTION_STATES=1 pnpm playwright test tests/e2e/motion-states.spec.ts
// PNGs go to .taste-skill/motion-states/ (gitignored).
const CAPTURE = process.env['CAPTURE_MOTION_STATES'] === '1';
test.skip(!CAPTURE, 'set CAPTURE_MOTION_STATES=1 to capture the motion-state screenshots');

const OUT = '.taste-skill/motion-states';
if (CAPTURE) mkdirSync(OUT, { recursive: true });

const shot = (name: string): string => `${OUT}/${name}.png`;

const LOCALES = [
  { locale: 'en', home: '/', projects: '/projects/', dict: en },
  { locale: 'es', home: '/es/', projects: '/es/projects/', dict: es },
] as const satisfies readonly {
  locale: 'en' | 'es';
  home: string;
  projects: string;
  dict: Dictionary;
}[];

const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;

const DETAIL_SLUG = 'website-instablogs';
const WORK_TILE = 'section[aria-labelledby="work-title"] article[data-card]';
const HERO_CTA = '[data-hero-cta] [data-magnetic="pill"]';
const LAYER = '[data-cursor-layer]';

function detailHref(locale: 'en' | 'es'): string {
  const detail = expectedDetails(locale).find((entry) => entry.slug === DETAIL_SLUG);
  if (detail === undefined) throw new Error(`motion-states: no project "${DETAIL_SLUG}"`);
  return detail.href;
}

/** A viewport clip around `target`, padded and kept inside the viewport. */
async function clipAround(
  page: Page,
  target: Locator,
  pad: number,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await target.boundingBox();
  if (box === null) throw new Error('motion-states: target has no box');
  const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  return {
    x,
    y,
    width: Math.min(viewport.width - x, box.width + pad * 2),
    height: Math.min(viewport.height - y, box.height + pad * 2),
  };
}

async function heroPlayed(page: Page): Promise<void> {
  await expect(page.locator('[data-hero]')).toHaveAttribute('data-hero-played', '');
}

// 1. The hero sequence at 0, 300, 600 and 1000ms. The CSS animations are paused as soon as the
// document is parsed and scrubbed to each time, so the frames are exact rather than "whenever
// the screenshot landed". They then resume, so hero.ts still sees animationend.
for (const { locale, home } of LOCALES) {
  for (const size of WIDTHS) {
    test.describe(`1 hero ${locale} ${String(size.width)}`, () => {
      test.use({ viewport: size });

      test('hero at 0, 300, 600 and 1000ms', async ({ page }) => {
        await page.goto(home, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
        const paused = await page.evaluate(() => {
          const hero = document.querySelector('[data-hero]');
          if (hero === null || hero.hasAttribute('data-hero-played')) return 0;
          const running = hero.getAnimations({ subtree: true });
          for (const animation of running) animation.pause();
          return running.length;
        });
        expect(paused, 'hero animations caught before they ended').toBeGreaterThan(0);
        await page.waitForLoadState('load');
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        for (const ms of [0, 300, 600, 1000]) {
          await page.evaluate((t) => {
            const hero = document.querySelector('[data-hero]');
            for (const animation of hero?.getAnimations({ subtree: true }) ?? []) {
              animation.currentTime = t;
            }
          }, ms);
          await page.screenshot({
            path: shot(`1-hero-${locale}-${String(size.width)}-${String(ms).padStart(4, '0')}ms`),
          });
        }
        await page.evaluate(() => {
          const hero = document.querySelector('[data-hero]');
          for (const animation of hero?.getAnimations({ subtree: true }) ?? []) animation.play();
        });
        await heroPlayed(page);
      });
    });
  }
}

// 2. One Home section (Services: line-rise heading, row-by-row cards) 200ms after scrolling to it,
// then settled.
for (const { locale, home } of LOCALES) {
  for (const size of WIDTHS) {
    test.describe(`2 section ${locale} ${String(size.width)}`, () => {
      test.use({ viewport: size });

      test('services mid-reveal and settled', async ({ page }) => {
        await page.goto(home);
        await heroPlayed(page);
        await settleMotion(page);
        await page.locator('#services-title').evaluate((el) => {
          el.scrollIntoView({ block: 'start', behavior: 'instant' });
        });
        await page.waitForTimeout(200);
        await page.screenshot({ path: shot(`2-services-${locale}-${String(size.width)}-0200ms`) });
        // At 390 the section is taller than one screen: scroll through so its lower cards reveal,
        // then come back to the same position for the settled frame.
        await settleMotion(page, { scrollThrough: true });
        await page.locator('#services-title').evaluate((el) => {
          el.scrollIntoView({ block: 'start', behavior: 'instant' });
        });
        await settleMotion(page);
        await page.screenshot({ path: shot(`2-services-${locale}-${String(size.width)}-settled`) });
      });
    });
  }
}

// 3 and 4. A Latest-work tile at rest, hovered (with the cursor "View" pill), keyboard-focused,
// and the cursor dot over the hero pill CTA.
for (const { locale, home } of LOCALES) {
  test.describe(`3-4 tile and cursor ${locale} 1440`, () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('tile rest, hover with pill, focus; dot over the pill CTA', async ({ page }) => {
      await page.goto(home);
      await heroPlayed(page);

      // Dot over the pill CTA (item 4), while the hero is still in view.
      const cta = page.locator(HERO_CTA);
      const ctaBox = await cta.boundingBox();
      if (ctaBox === null) throw new Error('motion-states: no hero CTA');
      await page.mouse.move(ctaBox.x - 40, ctaBox.y + ctaBox.height / 2);
      await page.mouse.move(ctaBox.x + ctaBox.width / 2, ctaBox.y + ctaBox.height / 2, {
        steps: 8,
      });
      await expect(page.locator(LAYER)).toBeAttached();
      await page.waitForTimeout(700);
      await page.screenshot({
        path: shot(`4-cursor-dot-over-cta-${locale}-1440`),
        clip: await clipAround(page, cta, 48),
      });
      await page.mouse.move(4, 4);

      const tile = page.locator(WORK_TILE).first();
      await tile.scrollIntoViewIfNeeded();
      await settleMotion(page, { scrollThrough: true });
      await tile.evaluate((el) => {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
      });
      await settleMotion(page);
      await page.mouse.move(4, 4);
      await page.waitForTimeout(300);
      await page.screenshot({
        path: shot(`3-tile-rest-${locale}-1440`),
        clip: await clipAround(page, tile, 32),
      });

      const cover = tile.locator('[data-card-mat]');
      const coverBox = await cover.boundingBox();
      if (coverBox === null) throw new Error('motion-states: no tile cover');
      await page.mouse.move(coverBox.x + coverBox.width / 2, coverBox.y + coverBox.height / 2, {
        steps: 10,
      });
      await expect(page.locator(`${LAYER} [data-cursor-pill]`)).toBeVisible();
      await page.waitForTimeout(900);
      await page.screenshot({
        path: shot(`3-4-tile-hover-pill-${locale}-1440`),
        clip: await clipAround(page, tile, 32),
      });

      await page.mouse.move(4, 4);
      await page.waitForTimeout(900);
      await page.keyboard.press('Tab');
      await tile.getByRole('link').first().focus();
      await page.waitForTimeout(900);
      await page.screenshot({
        path: shot(`3-tile-focus-${locale}-1440`),
        clip: await clipAround(page, tile, 32),
      });
    });
  });

  test.describe(`3 tile focus ${locale} 390`, () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('tile keyboard-focused', async ({ page }) => {
      await page.goto(home);
      await heroPlayed(page);
      await settleMotion(page, { scrollThrough: true });
      const tile = page.locator(WORK_TILE).first();
      await tile.evaluate((el) => {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
      });
      await settleMotion(page);
      await page.keyboard.press('Tab');
      await tile.getByRole('link').first().focus();
      await page.waitForTimeout(900);
      await page.screenshot({
        path: shot(`3-tile-focus-${locale}-390`),
        clip: await clipAround(page, tile, 16),
      });
    });
  });
}

// 5. The header toggle: full, reduced by the visitor, OS-locked, each with its tooltip open by
// keyboard focus, at 1440 and 320 (ES at 320 carries the longest hint).
const HEADER_CASES = [
  { locale: 'en', home: '/', dict: en, width: 1440 },
  { locale: 'en', home: '/', dict: en, width: 320 },
  { locale: 'es', home: '/es/', dict: es, width: 1440 },
  { locale: 'es', home: '/es/', dict: es, width: 320 },
] as const;

async function focusToggle(page: Page, dict: Dictionary): Promise<Locator> {
  const toggle = page.getByRole('button', { name: dict['motion.toggle'], exact: true });
  await toggle.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(toggle).toBeFocused();
  await expect(page.locator('[data-motion-tooltip]')).toBeVisible();
  await page.waitForTimeout(300);
  return toggle;
}

async function headerShot(page: Page, name: string): Promise<void> {
  const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
  await page.screenshot({
    path: shot(name),
    clip: { x: 0, y: 0, width: viewport.width, height: 200 },
  });
}

for (const { locale, home, dict, width } of HEADER_CASES) {
  test.describe(`5 toggle ${locale} ${String(width)}`, () => {
    test.use({ viewport: { width, height: 700 } });

    test('full and reduced by the visitor', async ({ page }) => {
      await page.goto(home);
      await heroPlayed(page);
      await settleMotion(page);
      await page.mouse.move(4, 600);
      await headerShot(page, `5-toggle-full-rest-${locale}-${String(width)}`);
      const toggle = await focusToggle(page, dict);
      await headerShot(page, `5-toggle-full-tooltip-${locale}-${String(width)}`);
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
      await page.waitForTimeout(300);
      await headerShot(page, `5-toggle-reduced-tooltip-${locale}-${String(width)}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await headerShot(page, `5-toggle-reduced-rest-${locale}-${String(width)}`);
    });
  });

  test.describe(`5 toggle os-locked ${locale} ${String(width)}`, () => {
    test.use({ viewport: { width, height: 700 }, reducedMotion: 'reduce' });

    test('OS-locked with the hint tooltip', async ({ page }) => {
      await page.goto(home);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
      await settleMotion(page);
      const toggle = await focusToggle(page, dict);
      await expect(toggle).toHaveAttribute('aria-disabled', 'true');
      await headerShot(page, `5-toggle-oslocked-tooltip-${locale}-${String(width)}`);
      // The tooltip must stay inside the viewport (320px with the long ES hint).
      const tip = await page.locator('[data-motion-tooltip] > span').boundingBox();
      expect(tip, 'tooltip box').not.toBeNull();
      if (tip !== null) {
        expect(tip.x).toBeGreaterThanOrEqual(0);
        expect(tip.x + tip.width).toBeLessThanOrEqual(width);
      }
    });
  });
}

// 6. Home, Projects and one detail page in 'reduced' after scrolling to the bottom (full page).
for (const { locale, home, projects } of LOCALES) {
  for (const size of WIDTHS) {
    test.describe(`6 reduced ${locale} ${String(size.width)}`, () => {
      test.use({ viewport: size, reducedMotion: 'reduce' });

      for (const [name, path] of [
        ['home', home],
        ['projects', projects],
        ['detail', detailHref(locale)],
      ] as const) {
        test(`${name} reduced after scrolling to the bottom`, async ({ page }) => {
          await page.goto(path);
          await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
          await settleMotion(page, { scrollThrough: true });
          await page.screenshot({
            path: shot(`6-reduced-${name}-${locale}-${String(size.width)}`),
            fullPage: true,
          });
        });
      }
    });
  }
}
