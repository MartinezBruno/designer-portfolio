import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { settleMotion } from './helpers/motion';
import { listenerCounts, softNavigate } from './helpers/navigation';

// Phase 7 leak contract (MOTN-09, SC3, 07 D-05, D-17; Research "Leak counting via CDP", Pitfall 6).
// One warm-up cycle, then at least 10 counted soft navigations. Every URL's listener, animation and
// instance counts must be identical on each counted visit. The generic assertions (parallax count
// equals [data-parallax] count, at most one Lenis root) tighten automatically as later plans land.

const DETAIL_SLUG = 'website-instablogs';
/** Counted navigations after the warm-up cycle (two full cycles of six). */
const COUNTED_NAVIGATIONS = 12;

declare global {
  interface Window {
    __cursorLayer?: Element | null;
  }
}

interface Counts {
  window: number;
  document: number;
  animations: number;
}

interface Step {
  /** Expected pathname after the click. */
  path: string;
  link(page: Page): Locator;
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

const banner = (page: Page): Locator => page.getByRole('banner');

// / -> /projects/ -> detail -> ES detail -> /es/projects/ -> /es/ -> /
const CYCLE: readonly Step[] = [
  {
    path: '/projects/',
    link: (page) =>
      banner(page)
        .getByRole('navigation', { name: en['nav.label'], exact: true })
        .getByRole('link', { name: en['nav.projects'], exact: true }),
  },
  {
    path: `/projects/${DETAIL_SLUG}/`,
    link: (page) => page.locator(`main article a[href="/projects/${DETAIL_SLUG}/"]`).first(),
  },
  {
    path: `/es/projects/${DETAIL_SLUG}/`,
    // The link's name is "ES Español" (visible code plus language name), as in i18n.spec.
    link: (page) =>
      page
        .getByRole('navigation', { name: en['lang.label'], exact: true })
        .getByRole('link', { name: en['lang.es'] }),
  },
  {
    path: '/es/projects/',
    link: (page) =>
      banner(page)
        .getByRole('navigation', { name: es['nav.label'], exact: true })
        .getByRole('link', { name: es['nav.projects'], exact: true }),
  },
  {
    path: '/es/',
    link: (page) => banner(page).getByRole('link', { name: 'Martina Fernandez' }),
  },
  {
    path: '/',
    link: (page) =>
      page
        .getByRole('navigation', { name: es['lang.label'], exact: true })
        .getByRole('link', { name: es['lang.en'] }),
  },
];

let wiggle = 0;

/** Moves the pointer over a quiet edge of the page so the cursor session runs (fine pointer). */
async function movePointer(page: Page): Promise<void> {
  wiggle = (wiggle + 1) % 2;
  await page.mouse.move(6 + wiggle * 4, 300 + wiggle * 6);
}

/** Per-visit invariants plus the per-URL counts. */
async function inspect(page: Page, cdp: CDPSession, locale: 'en' | 'es'): Promise<Counts> {
  await settleMotion(page);
  await movePointer(page);
  await expect(page.locator('[data-cursor-layer]')).toHaveCount(1);
  await expect(page.locator('[data-cursor-layer] [data-cursor-pill]')).toHaveText(
    locale === 'en' ? en['cursor.view'] : es['cursor.view'],
  );
  // The pointer move starts finite CSS transitions on the layer; let them end before counting.
  // Scroll-linked parallax (07-08) never finishes while on screen, so timed ones only.
  await page.evaluate(async () => {
    const finite = document
      .getAnimations()
      .filter(
        (a) =>
          a.timeline instanceof DocumentTimeline &&
          a.effect?.getComputedTiming().endTime !== Infinity,
      );
    await Promise.allSettled(finite.map((a) => a.finished));
  });

  const invariants = await page.evaluate(() => {
    const all = [...document.querySelectorAll('*')];
    const animations = document.getAnimations();
    return {
      sameLayer:
        window.__cursorLayer === undefined ||
        document.querySelector('[data-cursor-layer]') === window.__cursorLayer,
      splitMasks: document.querySelectorAll('.split-line-mask').length,
      projectTitles: all.filter((el) => getComputedStyle(el).viewTransitionName === 'project-title')
        .length,
      parallaxAnimations: animations.filter(
        (a) => a instanceof CSSAnimation && a.animationName === 'parallax',
      ).length,
      parallaxElements: document.querySelectorAll('[data-parallax]').length,
      // 07-09 detail-stack side entrance: one stack-enter animation per moving image, never stale.
      stackAnimations: animations.filter(
        (a) => a instanceof CSSAnimation && a.animationName === 'stack-enter',
      ).length,
      stackElements: document.querySelectorAll('[data-stack-enter]').length,
      lenisRoots: document.querySelectorAll('html.lenis').length,
      animations: animations.length,
    };
  });
  expect(invariants.sameLayer, 'the persisted cursor layer is the same node').toBe(true);
  expect(invariants.splitMasks).toBe(0);
  expect(invariants.projectTitles).toBe(0);
  expect(invariants.parallaxAnimations).toBe(invariants.parallaxElements);
  expect(invariants.stackAnimations).toBe(invariants.stackElements);
  expect(invariants.lenisRoots).toBeLessThanOrEqual(1);

  const listeners = await listenerCounts(cdp);
  return { ...listeners, animations: invariants.animations };
}

test.describe('navigation leaks', () => {
  test('10 soft navigations keep listener, animation and instance counts constant per URL', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors = collectErrors(page);
    const cdp = await page.context().newCDPSession(page);
    await page.goto('/');

    const localeOf = (path: string): 'en' | 'es' => (path.startsWith('/es/') ? 'es' : 'en');
    const run = async (step: Step): Promise<Counts> => {
      await softNavigate(page, step.link(page));
      expect(new URL(page.url()).pathname).toBe(step.path);
      return inspect(page, cdp, localeOf(step.path));
    };

    // Warm-up (Pitfall 6): first visits load lazy chunks and register app-scope listeners once.
    await inspect(page, cdp, 'en');
    for (const step of CYCLE) await run(step);

    // Pin the live layer: from here on it must be the same node on every page (D-05).
    await page.evaluate(() => {
      window.__cursorLayer = document.querySelector('[data-cursor-layer]');
    });

    const seen = new Map<string, Counts[]>();
    for (let i = 0; i < COUNTED_NAVIGATIONS; i += 1) {
      const step = CYCLE[i % CYCLE.length];
      if (step === undefined) throw new Error('navigation-leaks: empty cycle');
      const counts = await run(step);
      seen.set(step.path, [...(seen.get(step.path) ?? []), counts]);
    }

    const table = [...seen].map(([path, visits]) => ({
      path,
      visits: visits.map((c) => `w${c.window}/d${c.document}/a${c.animations}`).join(' '),
    }));
    console.log(JSON.stringify(table, null, 2));
    for (const [path, visits] of seen) {
      expect(visits.length, `${path} visited more than once`).toBeGreaterThan(1);
      const [first] = visits;
      for (const visit of visits) expect(visit, `${path}: ${JSON.stringify(table)}`).toEqual(first);
    }
    expect(errors).toEqual([]);
  });
});
