import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { en, type Dictionary } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { softNavigate } from './helpers/navigation';

// Opt-in capture of the Phase 7 navigation-transition screenshots (07 UI-SPEC "Verification",
// extra items 1, 4 and 5) for the taste-skill review. The behaviour itself is gated by
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
const DETAIL_SLUG = 'website-instablogs';

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
