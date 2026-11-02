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

// 7. Card parallax (07-08): one Home card, one Projects card and the Next-project teaser with the
// frame entering (15% visible at the bottom), centred and leaving (15% visible at the top). The
// images are the same in both locales, so EN only. Named 7-{subject}-{width}-{position}.png.
const PARALLAX_SUBJECTS = [
  { key: 'home', path: '/', card: 'section[aria-labelledby="work-title"] article[data-card]' },
  // The second tile: the first is the eager LCP cover, which never drifts.
  { key: 'projects', path: '/projects/', card: '#main article[data-card] >> nth=1' },
  {
    key: 'teaser',
    path: (expectedProjects('en').find((project) => project.slug === DETAIL_SLUG) ?? { href: '/' })
      .href,
    card: 'section[aria-labelledby="next-project-title"] article[data-card]',
  },
] as const;

for (const { width, height } of WIDTHS) {
  test.describe(`7 parallax ${width}`, () => {
    test.use({ viewport: { width, height } });

    for (const subject of PARALLAX_SUBJECTS) {
      test(`7 ${subject.key} card at three scroll positions`, async ({ page }) => {
        await page.goto(subject.path);
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
        const card = page.locator(subject.card).first();
        const frame = card.locator('[data-parallax-frame]');
        await expect(frame).toHaveCount(1);
        for (const position of ['entering', 'centred', 'leaving'] as const) {
          await frame.evaluate((element, where) => {
            const rect = element.getBoundingClientRect();
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
          if (position === 'entering') {
            // Let the shutter open on the first pass so later frames show the image itself.
            await frame.evaluate((element) => element.scrollIntoView({ block: 'center' }));
            await expect(frame).toHaveAttribute('data-revealed');
            await page.waitForTimeout(1000);
            await frame.evaluate((element) => {
              const rect = element.getBoundingClientRect();
              const top = rect.top + window.scrollY;
              const max = document.documentElement.scrollHeight - window.innerHeight;
              const target = top - window.innerHeight + rect.height * 0.15;
              window.scrollTo({ top: Math.max(0, Math.min(max, target)), behavior: 'instant' });
            });
          }
          await page.waitForTimeout(300);
          await page.evaluate(
            () =>
              new Promise((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
              }),
          );
          await page.screenshot({ path: `${OUT}/7-${subject.key}-${width}-${position}.png` });
        }
      });
    }
  });
}

// 7 (stack seams, 07-09 D-11a): every seam between two consecutive ImageModules where at least one
// slides in from the side, at three positions of the moving frame's entry: entering (its top 40 px
// inside the viewport bottom), mid (about half of its entry range) and settled (the range end).
// InstaBlogs and Cabrera's are required by the plan; the other detail pages also continue one
// composition across seams, so they are captured too. EN only (the images are the same).
// Named 07-stack-{slug}-seam{N}-{position}-{width}.png, N = the lower module's stack index.
const SEAM_SLUGS = [
  DETAIL_SLUG,
  'cabreras-motos-posts',
  'portfolio-web',
  'website-reciclick',
  'purov',
  'mart',
] as const;
const STACK = 'article[aria-labelledby="project-title"] > div.max-w-\\[1400px\\]';

for (const { width, height } of WIDTHS) {
  test.describe(`7 stack seams ${width}`, () => {
    test.use({ viewport: { width, height } });

    for (const slug of SEAM_SLUGS) {
      test(`7 stack seams ${slug}`, async ({ page }) => {
        test.setTimeout(240_000);
        const href = expectedProjects('en').find((project) => project.slug === slug)?.href;
        if (href === undefined) throw new Error(`capture: no project ${slug}`);
        await page.goto(href);
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
        // Load every lazy image first, so no capture shows an empty frame.
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
            window.scrollTo({ top: y, behavior: 'instant' });
            await new Promise((resolve) => setTimeout(resolve, 40));
          }
          await Promise.all(
            [...document.images].map((image) =>
              image.complete
                ? null
                : new Promise((resolve) => {
                    image.addEventListener('load', resolve, { once: true });
                    image.addEventListener('error', resolve, { once: true });
                  }),
            ),
          );
        });
        // Seams: [lower stack index, index of the moving module whose entry is captured].
        const seams = await page.locator(STACK).evaluate((stack) => {
          const children = [...stack.children];
          const isImageModule = (element: Element | undefined): boolean =>
            element !== undefined &&
            element.querySelectorAll('img').length === 1 &&
            element.querySelector('[class*="sm:grow-"]') === null;
          const moves = (element: Element | undefined): boolean =>
            element?.querySelector('[data-stack-enter]') != null;
          const result: [number, number][] = [];
          children.forEach((lower, index) => {
            const upper = children[index - 1];
            if (!isImageModule(upper) || !isImageModule(lower)) return;
            if (moves(lower)) result.push([index, index]);
            else if (moves(upper)) result.push([index, index - 1]);
          });
          return result;
        });
        for (const [seam, moving] of seams) {
          for (const position of ['entering', 'mid', 'settled'] as const) {
            await page.locator(STACK).evaluate(
              (stack, [index, where]) => {
                const frame = stack.children[index]?.querySelector('[data-stack-frame]');
                if (frame === null || frame === undefined) throw new Error('capture: no frame');
                const rect = frame.getBoundingClientRect();
                const top = rect.top + window.scrollY;
                const vh = window.innerHeight;
                const pad =
                  Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) ||
                  0;
                const entry = Math.min(rect.height, vh - pad);
                const frameTop =
                  where === 'entering'
                    ? vh - 40
                    : where === 'mid'
                      ? vh - 40 - (entry - 40) / 2
                      : rect.height < vh - pad
                        ? vh - rect.height
                        : pad;
                window.scrollTo({ top: top - frameTop, behavior: 'instant' });
              },
              [moving, position] as const,
            );
            await page.waitForTimeout(250);
            await page.evaluate(
              () =>
                new Promise((resolve) => {
                  requestAnimationFrame(() => requestAnimationFrame(resolve));
                }),
            );
            await page.screenshot({
              path: `${OUT}/07-stack-${slug}-seam${String(seam)}-${position}-${String(width)}.png`,
            });
          }
        }
      });
    }
  });
}
