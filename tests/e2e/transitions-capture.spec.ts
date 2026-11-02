import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { en, type Dictionary } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { wipeRelease } from '../../src/lib/motion/tokens';
import { settleMotion } from './helpers/motion';
import { expectedProjects, type ExpectedProject } from './helpers/projects';
import { softNavigate, waitForNavigationIdle } from './helpers/navigation';

// Opt-in capture of the Phase 7 navigation-transition screenshots (07 UI-SPEC "Verification",
// extra items 1 to 6) for the taste-skill review. The behaviour itself is gated by
// transitions.spec.ts and transitions-reduced.spec.ts. Run with
//   CAPTURE_TRANSITIONS=1 pnpm exec playwright test tests/e2e/transitions-capture.spec.ts
// PNGs go to .taste-skill/transitions/ (gitignored), named {item}-{locale}-{width}-{pct}.png.
const CAPTURE = process.env['CAPTURE_TRANSITIONS'] === '1';
test.skip(!CAPTURE, 'set CAPTURE_TRANSITIONS=1 to capture the transition screenshots');

const OUT = '.taste-skill/transitions';
if (CAPTURE) mkdirSync(OUT, { recursive: true });

declare global {
  interface Window {
    __captureAt?: number;
    __capturePaused?: boolean;
  }
}

const LOCALES = [
  { locale: 'en', home: '/', dict: en },
  { locale: 'es', home: '/es/', dict: es },
] as const satisfies readonly { locale: 'en' | 'es'; home: string; dict: Dictionary }[];

const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;

const FRACTIONS = [0.25, 0.5, 0.7, 1] as const;
const MORPH_FRACTIONS = [0, 0.3, 0.5, 0.7, 1] as const;
const DETAIL_SLUG = 'website-instablogs';

/**
 * Item 2 subjects (07-06): InstaBlogs and the visible project whose ES title is longest, read from
 * the committed overrides at capture time (the one-line card title that may land on two lines).
 */
function morphSubjects(locale: 'en' | 'es'): { key: string; href: string }[] {
  const visible = (l: 'en' | 'es'): ExpectedProject[] =>
    expectedProjects(l).filter((project) => !project.hidden);
  const longest = [...visible('es')].sort((a, b) => b.title.length - a.title.length)[0];
  const local = visible(locale);
  const insta = local.find((project) => project.slug === DETAIL_SLUG);
  const long = local.find((project) => project.id === longest?.id);
  if (insta === undefined || long === undefined) throw new Error('capture: no morph subjects');
  return [
    { key: 'instablogs', href: insta.href },
    { key: 'longest-es', href: long.href },
  ];
}

/**
 * Pauses the next view transition at `window.__captureAt` (a fraction of each animation's own
 * duration: --t-wipe under 'on', --t-nav-fade under 'reduced'). Without `__captureAt` the
 * transition runs normally, so set-up navigations are not frozen.
 */
async function pauseTransitions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = document.startViewTransition?.bind(document);
    if (original === undefined) return;
    document.startViewTransition = ((callback?: ViewTransitionUpdateCallback) => {
      const transition = original(callback);
      const at = window.__captureAt;
      if (at === undefined) return transition;
      void transition.ready
        .then(() => {
          for (const animation of document.getAnimations()) {
            const effect = animation.effect;
            if (!(effect instanceof KeyframeEffect)) continue;
            if (!(effect.pseudoElement ?? '').startsWith('::view-transition')) continue;
            const duration = Number(effect.getComputedTiming().duration);
            animation.pause();
            // Just short of the end at 100%, so the frame is still the transition's own.
            animation.currentTime = Math.min(at * duration, duration - 1);
          }
          window.__capturePaused = true;
        })
        .catch(() => undefined);
      return transition;
    }) as typeof document.startViewTransition;
  });
}

async function armCapture(page: Page, fraction: number): Promise<void> {
  await page.evaluate((at) => {
    window.__captureAt = at;
    window.__capturePaused = false;
  }, fraction);
}

async function shoot(page: Page, name: string): Promise<void> {
  await expect.poll(() => page.evaluate(() => window.__capturePaused === true)).toBe(true);
  // Two frames so the paused pseudo-tree is painted.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

const pct = (fraction: number): string => String(Math.round(fraction * 100));

for (const { width, height } of WIDTHS) {
  for (const { locale, home, dict } of LOCALES) {
    test.describe(`${locale} ${width}`, () => {
      test.use({ viewport: { width, height } });

      // 1. Home -> Projects forward wipe, and Projects -> Home back wipe.
      for (const fraction of FRACTIONS) {
        test(`1 forward wipe at ${pct(fraction)}%`, async ({ page }) => {
          await pauseTransitions(page);
          await page.goto(home);
          await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
          await armCapture(page, fraction);
          const nav = page.getByRole('navigation', { name: dict['nav.label'], exact: true });
          await nav.getByRole('link', { name: dict['nav.projects'], exact: true }).click();
          await shoot(page, `1-forward-${locale}-${width}-${pct(fraction)}`);
        });

        test(`1 back wipe at ${pct(fraction)}%`, async ({ page }) => {
          await pauseTransitions(page);
          await page.goto(home);
          const nav = page.getByRole('navigation', { name: dict['nav.label'], exact: true });
          await softNavigate(
            page,
            nav.getByRole('link', { name: dict['nav.projects'], exact: true }),
          );
          await armCapture(page, fraction);
          await page.goBack();
          await shoot(page, `1-back-${locale}-${width}-${pct(fraction)}`);
        });
      }

      // 2. Projects card -> detail title morph (07-06, D-02) for InstaBlogs and the project with
      //    the longest ES title, at 0/30/50/70/100% of the flight.
      for (const { key, href } of morphSubjects(locale)) {
        test(`2 morph ${key}`, async ({ page }) => {
          for (const fraction of MORPH_FRACTIONS) {
            await pauseTransitions(page);
            await page.goto(`${home}projects/`);
            const link = page.locator(`main article a[href="${href}"]`).first();
            await link.scrollIntoViewIfNeeded();
            await settleMotion(page);
            await armCapture(page, fraction);
            await link.click();
            await shoot(page, `2-${key}-${locale}-${width}-${pct(fraction)}`);
          }
        });
      }

      // 3. Home compact card -> detail morph at 50% (the 16px -> 36px case).
      test('3 home card morph at 50%', async ({ page }) => {
        await pauseTransitions(page);
        await page.goto(home);
        const link = page.locator('section[aria-labelledby="work-title"] article h3 a').first();
        await link.scrollIntoViewIfNeeded();
        await settleMotion(page);
        await armCapture(page, 0.5);
        await link.click();
        await shoot(page, `3-${locale}-${width}-50`);
      });

      // 4. Language switch on the InstaBlogs detail page at 50% (header still, labels switched).
      test('4 language switch at 50%', async ({ page }) => {
        await pauseTransitions(page);
        await page.goto(`${home}projects/${DETAIL_SLUG}/`);
        await armCapture(page, 0.5);
        const language = page.getByRole('navigation', { name: dict['lang.label'], exact: true });
        const target = locale === 'en' ? dict['lang.es'] : dict['lang.en'];
        // The link's name is "<code> <language>", as in i18n.spec.
        await language.getByRole('link', { name: target }).click();
        await shoot(page, `4-${locale}-${width}-50`);
      });

      // 6. The arriving InstaBlogs detail page at release (wipe frozen at 70%, the release point)
      //    and at settle (07-04, D-16): nothing on the arriving page animates while covered.
      test('6 detail arrival at release and at settle', async ({ page }) => {
        await pauseTransitions(page);
        await page.goto(`${home}projects/`);
        await settleMotion(page);
        await armCapture(page, wipeRelease);
        await page
          .locator(`main article a[href="${home}projects/${DETAIL_SLUG}/"]`)
          .first()
          .click();
        await expect.poll(() => page.evaluate(() => window.__capturePaused === true)).toBe(true);
        // The release timer runs at ready + 392 ms whatever the frozen frame shows.
        await expect
          .poll(() => page.evaluate(() => !document.documentElement.hasAttribute('data-vt')))
          .toBe(true);
        await page.evaluate(
          () =>
            new Promise((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(resolve));
            }),
        );
        await page.screenshot({ path: `${OUT}/6-release-${locale}-${width}.png` });

        await page.evaluate(() => {
          for (const animation of document.getAnimations()) {
            const effect = animation.effect;
            if (!(effect instanceof KeyframeEffect)) continue;
            if ((effect.pseudoElement ?? '').startsWith('::view-transition')) animation.play();
          }
        });
        await waitForNavigationIdle(page);
        await settleMotion(page);
        await page.screenshot({ path: `${OUT}/6-settle-${locale}-${width}.png` });
      });

      // 5. Reduced crossfade at 50% (no panel anywhere).
      test.describe('reduced', () => {
        test.use({ reducedMotion: 'reduce' });

        test('5 reduced crossfade at 50%', async ({ page }) => {
          await pauseTransitions(page);
          await page.goto(home);
          await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
          await armCapture(page, 0.5);
          const nav = page.getByRole('navigation', { name: dict['nav.label'], exact: true });
          await nav.getByRole('link', { name: dict['nav.projects'], exact: true }).click();
          await shoot(page, `5-${locale}-${width}-50`);
        });
      });
    });
  }
}
