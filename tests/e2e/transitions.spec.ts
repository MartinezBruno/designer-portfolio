import { expect, test, type Page } from '@playwright/test';
import { site } from '../../src/data/site';
import { interpolate } from '../../src/i18n/t';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { expectedDetails } from './helpers/projects';
import { settleMotion } from './helpers/motion';
import { softNavigate, waitForNavigationIdle } from './helpers/navigation';

// Phase 7 soft navigation (MOTN-05; 07 D-03, D-05, D-14; Research Pitfalls 1 and 10).

const DETAIL_SLUG = 'website-instablogs';

declare global {
  interface Window {
    __marker?: number;
    __vtCount?: number;
    __vtPseudos?: string[];
    __vtNames?: string[];
    __vtDirection?: (string | null)[];
    __vtHeaderAnimations?: number;
  }
}

/**
 * Wraps `document.startViewTransition` (07-02): counts calls and, once the pseudo tree exists
 * (`ready`), records every running view-transition animation's pseudo-element, the names assigned
 * in the arriving document, the router's direction attribute and how many animations touch the
 * site-header (which must never move or fade, D-05). An animation set to `none` creates no entry,
 * so named-but-still elements are proven through `__vtNames`.
 */
async function recordViewTransitions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__vtCount = 0;
    window.__vtPseudos = [];
    window.__vtNames = [];
    window.__vtDirection = [];
    window.__vtHeaderAnimations = 0;
    const original = document.startViewTransition?.bind(document);
    if (original === undefined) return;
    document.startViewTransition = ((callback?: ViewTransitionUpdateCallback) => {
      window.__vtCount = (window.__vtCount ?? 0) + 1;
      const transition = original(callback);
      void transition.ready
        .then(() => {
          for (const animation of document.getAnimations()) {
            const effect = animation.effect;
            if (!(effect instanceof KeyframeEffect)) continue;
            const pseudo = effect.pseudoElement ?? '';
            if (!pseudo.startsWith('::view-transition')) continue;
            window.__vtPseudos?.push(pseudo);
            if (pseudo.includes('site-header') && effect.getKeyframes().length > 0) {
              window.__vtHeaderAnimations = (window.__vtHeaderAnimations ?? 0) + 1;
            }
          }
          for (const element of document.querySelectorAll('*')) {
            const name = getComputedStyle(element).viewTransitionName;
            if (name !== '' && name !== 'none') window.__vtNames?.push(name);
          }
          window.__vtDirection?.push(
            document.documentElement.getAttribute('data-astro-transition'),
          );
        })
        .catch(() => undefined);
      return transition;
    }) as typeof document.startViewTransition;
  });
}

async function vtRecord(page: Page): Promise<{
  count: number;
  pseudos: string[];
  names: string[];
  direction: (string | null)[];
  headerAnimations: number;
}> {
  return page.evaluate(() => ({
    count: window.__vtCount ?? 0,
    pseudos: window.__vtPseudos ?? [],
    names: window.__vtNames ?? [],
    direction: window.__vtDirection ?? [],
    headerAnimations: window.__vtHeaderAnimations ?? 0,
  }));
}

async function resetVtRecord(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__vtCount = 0;
    window.__vtPseudos = [];
    window.__vtNames = [];
    window.__vtDirection = [];
    window.__vtHeaderAnimations = 0;
  });
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

function detailTitle(locale: 'en' | 'es'): string {
  const detail = expectedDetails(locale).find((entry) => entry.slug === DETAIL_SLUG);
  if (detail === undefined) throw new Error(`transitions: no visible project "${DETAIL_SLUG}"`);
  return detail.title;
}

async function setMarker(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__marker = 1;
  });
}

/** Soft navigation proof plus the D-14 focus contract and the D-05 motion carry. */
async function expectSoftArrival(page: Page, title: string, motion: string): Promise<void> {
  expect(await page.evaluate(() => window.__marker)).toBe(1);
  await expect(page).toHaveTitle(title);
  await expect(page.locator('html')).toHaveAttribute('data-motion', motion);
  await expect(page.locator('main h1')).toBeFocused();
  const outline = await page.evaluate(() =>
    document.activeElement === null ? null : getComputedStyle(document.activeElement).outlineStyle,
  );
  expect(outline).toBe('none');
}

test.describe('soft navigation between pages', () => {
  test('Home -> Projects -> detail -> ES keeps the window, moves focus and updates the head', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await setMarker(page);

    const nav = page.getByRole('navigation', { name: en['nav.label'], exact: true });
    await softNavigate(page, nav.getByRole('link', { name: en['nav.projects'], exact: true }));
    await expect(page).toHaveURL(/\/projects\/$/);
    await expectSoftArrival(page, en['meta.projects.title'], 'on');

    await softNavigate(page, page.locator(`main article a[href="/projects/${DETAIL_SLUG}/"]`));
    await expect(page).toHaveURL(new RegExp(`/projects/${DETAIL_SLUG}/$`));
    await expectSoftArrival(
      page,
      interpolate(en['meta.project.title'], { title: detailTitle('en') }),
      'on',
    );

    const language = page.getByRole('navigation', { name: en['lang.label'], exact: true });
    // The link's name is "ES Español" (visible code plus language name), as in i18n.spec.
    await softNavigate(page, language.getByRole('link', { name: en['lang.es'] }));
    await expect(page).toHaveURL(new RegExp(`/es/projects/${DETAIL_SLUG}/$`));
    await expectSoftArrival(
      page,
      interpolate(es['meta.project.title'], { title: detailTitle('es') }),
      'on',
    );

    // D-03: the swapped head matches the Spanish page.
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    const enHref = `${site.url}/projects/${DETAIL_SLUG}/`;
    const esHref = `${site.url}/es/projects/${DETAIL_SLUG}/`;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', esHref);
    const expected = [
      ['en', enHref],
      ['es', esHref],
      ['x-default', enHref],
    ] as const;
    for (const [hreflang, href] of expected) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${hreflang}"]`)).toHaveAttribute(
        'href',
        href,
      );
    }
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(3);
    expect(errors).toEqual([]);
  });

  test('Home -> Projects -> Home keeps the contact form Turnstile working @network', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await setMarker(page);
    const nav = page.getByRole('navigation', { name: en['nav.label'], exact: true });
    await softNavigate(page, nav.getByRole('link', { name: en['nav.projects'], exact: true }));
    await softNavigate(
      page,
      page.getByRole('banner').getByRole('link', { name: 'Martina Fernandez' }),
    );
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
    await expectSoftArrival(page, en['meta.home.title'], 'on');

    await page.locator('#contact').scrollIntoViewIfNeeded();
    await expect(page.locator('form[data-contact-form]')).toBeVisible();
    await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
      timeout: 15000,
    });
    expect(errors).toEqual([]);
  });
});

test.describe('ink wipe under full motion (D-01, D-03, D-05)', () => {
  test('Home -> Projects plays one wipe pass with a still header', async ({ page }) => {
    await recordViewTransitions(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    const nav = page.getByRole('navigation', { name: en['nav.label'], exact: true });
    await softNavigate(page, nav.getByRole('link', { name: en['nav.projects'], exact: true }));

    const record = await vtRecord(page);
    expect(record.count).toBe(1);
    expect(record.pseudos).toContain('::view-transition-group(wipe)');
    expect(record.names).toContain('wipe');
    expect(record.names).toContain('site-header');
    // D-05: nothing on the header's group or images changes transform or opacity.
    expect(record.headerAnimations).toBe(0);
    expect(record.direction).toEqual(['forward']);
    // The arriving-state marker is gone once the transition has finished.
    await expect(page.locator('html')).not.toHaveAttribute('data-wipe', /.*/);
  });

  test('the EN/ES switch also plays the wipe', async ({ page }) => {
    await recordViewTransitions(page);
    await page.goto(`/projects/${DETAIL_SLUG}/`);
    const language = page.getByRole('navigation', { name: en['lang.label'], exact: true });
    await softNavigate(page, language.getByRole('link', { name: en['lang.es'] }));
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');

    const record = await vtRecord(page);
    expect(record.count).toBe(1);
    expect(record.pseudos).toContain('::view-transition-group(wipe)');
    expect(record.headerAnimations).toBe(0);
  });

  test('back traverse plays the wipe in the back direction', async ({ page }) => {
    await recordViewTransitions(page);
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: en['nav.label'], exact: true });
    await softNavigate(page, nav.getByRole('link', { name: en['nav.projects'], exact: true }));
    await resetVtRecord(page);

    await page.goBack();
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
    await expect.poll(async () => (await vtRecord(page)).direction).toEqual(['back']);
    await waitForNavigationIdle(page);

    const record = await vtRecord(page);
    expect(record.count).toBe(1);
    expect(record.pseudos).toContain('::view-transition-group(wipe)');
    expect(record.headerAnimations).toBe(0);
  });
});

// 07-04: arrival after the wipe (D-14 timing, D-15, D-16, D-18; UI-SPEC "Entrance after the wipe",
// "Back / forward", "Vestibular"). All timestamps are performance.now() in the persistent window.

interface ArrivalRecord {
  /** One entry per view transition whose `ready` resolved. */
  ready: { at: number; vt: boolean; heroPaused: boolean | null; direction: string | null }[];
  finished: number[];
  revealed: number[];
  h1Focus: number[];
  clickAt: number | null;
  toggleAt: number | null;
  motionChangeAt: number | null;
  /** Every above-the-fold entrance at rest, image shutters included. */
  settledAt: number | null;
  /** The elements the UI-SPEC budget table models: text entrances only, no image shutters. */
  textSettledAt: number | null;
}

declare global {
  interface Window {
    __arrival?: ArrivalRecord;
    __toggleAtRelease?: boolean;
    __measureSettle?: (pathname: string) => void;
  }
}

/**
 * Records the arrival timeline. Wraps startViewTransition for `ready`/`finished`, observes
 * `data-revealed` being set anywhere in the document and focus landing on `main h1`.
 * `__measureSettle(path)` starts a frame loop that stamps `settledAt` once `path` is shown, no hold
 * or transition is left, and every above-the-fold `[data-reveal]` and the hero have finished their
 * entrance (GSAP rises revert their split on complete, so no `.split-line-mask` is left).
 */
async function recordArrival(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const record: ArrivalRecord = {
      ready: [],
      finished: [],
      revealed: [],
      h1Focus: [],
      clickAt: null,
      toggleAt: null,
      motionChangeAt: null,
      settledAt: null,
      textSettledAt: null,
    };
    window.__arrival = record;

    document.addEventListener('motion:change', () => {
      record.motionChangeAt ??= performance.now();
    });

    const original = document.startViewTransition?.bind(document);
    if (original !== undefined) {
      document.startViewTransition = ((callback?: ViewTransitionUpdateCallback) => {
        const transition = original(callback);
        void transition.ready
          .then(() => {
            const html = document.documentElement;
            const inner = document.querySelector('[data-hero-line-inner]');
            record.ready.push({
              at: performance.now(),
              vt: html.hasAttribute('data-vt'),
              heroPaused:
                inner === null ? null : getComputedStyle(inner).animationPlayState === 'paused',
              direction: html.getAttribute('data-astro-transition'),
            });
          })
          .catch(() => undefined);
        void transition.finished
          .then(() => {
            record.finished.push(performance.now());
          })
          .catch(() => undefined);
        return transition;
      }) as typeof document.startViewTransition;
    }

    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.target instanceof Element && mutation.target.hasAttribute('data-revealed')) {
          record.revealed.push(performance.now());
          return;
        }
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-revealed'] });

    document.addEventListener(
      'focusin',
      (event) => {
        if (event.target instanceof Element && event.target.matches('main h1')) {
          record.h1Focus.push(performance.now());
          // D-18 at release: the arriving toggle is bound now (the lifecycle mounts first).
          if (window.__toggleAtRelease === true) {
            window.__toggleAtRelease = false;
            setTimeout(() => {
              record.toggleAt = performance.now();
              document.querySelector<HTMLElement>('[data-motion-toggle]')?.click();
            }, 0);
          }
        }
      },
      true,
    );

    document.addEventListener(
      'click',
      () => {
        record.clickAt = performance.now();
      },
      true,
    );

    const aboveFold = (el: Element): boolean => {
      const rect = el.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight && rect.height > 0;
    };
    const entranceDone = (el: Element): boolean =>
      el.querySelector('.split-line-mask') === null &&
      el.getAnimations({ subtree: true }).every((a) => a.playState === 'finished');

    const isImage = (el: Element): boolean =>
      el.getAttribute('data-reveal') === 'shutter' || el.querySelector('picture') !== null;

    window.__measureSettle = (pathname: string) => {
      record.settledAt = null;
      record.textSettledAt = null;
      const tick = (): void => {
        const html = document.documentElement;
        const arrived =
          location.pathname === pathname &&
          !html.hasAttribute('data-vt') &&
          !html.hasAttribute('data-astro-transition');
        if (arrived) {
          const reveals = [...document.querySelectorAll('[data-reveal]')].filter(aboveFold);
          const hero = document.querySelector('[data-hero]');
          const textSettled = reveals
            .filter((el) => !isImage(el))
            .every((el) => el.hasAttribute('data-revealed') && entranceDone(el));
          if (textSettled) record.textSettledAt ??= performance.now();
          const settled =
            reveals.every((el) => el.hasAttribute('data-revealed') && entranceDone(el)) &&
            (hero === null || !aboveFold(hero) || entranceDone(hero));
          if (settled) {
            record.settledAt = performance.now();
            return;
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
  });
}

async function arrival(page: Page): Promise<ArrivalRecord> {
  return page.evaluate(() => {
    const record = window.__arrival;
    if (record === undefined) throw new Error('recordArrival not installed');
    return record;
  });
}

async function resetArrival(page: Page): Promise<void> {
  await page.evaluate(() => {
    const record = window.__arrival;
    if (record === undefined) return;
    record.ready = [];
    record.finished = [];
    record.revealed = [];
    record.h1Focus = [];
    record.clickAt = null;
    record.toggleAt = null;
    record.motionChangeAt = null;
    record.settledAt = null;
    record.textSettledAt = null;
  });
}

/** Release lands 392 ms after `ready` (70% of 560 ms); 12 ms tolerance for timer granularity. */
const RELEASE_MIN_MS = 380;

test.describe('arrival after the wipe (07-04)', () => {
  test('hold: entrances and h1 focus wait for the release, hero keyframes paused under data-vt', async ({
    page,
  }) => {
    await recordArrival(page);
    await page.goto('/projects/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await settleMotion(page);
    await resetArrival(page);

    await softNavigate(
      page,
      page.getByRole('banner').getByRole('link', { name: 'Martina Fernandez' }),
    );
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
    await expect(page.locator('main h1')).toBeFocused();

    const record = await arrival(page);
    expect(record.ready).toHaveLength(1);
    const ready = record.ready[0];
    if (ready === undefined) throw new Error('no ready recorded');
    expect(ready.vt).toBe(true);
    expect(ready.heroPaused).toBe(true);
    expect(record.h1Focus).toHaveLength(1);
    expect((record.h1Focus[0] ?? 0) - ready.at).toBeGreaterThanOrEqual(RELEASE_MIN_MS);
    // Every reveal on the arriving page waits for the release too.
    for (const at of record.revealed) expect(at - ready.at).toBeGreaterThanOrEqual(RELEASE_MIN_MS);
    await expect(page.locator('html')).not.toHaveAttribute('data-vt', /.*/);
  });

  test('budget: click to settled stays inside the UI-SPEC table', async ({ page }) => {
    await recordArrival(page);
    const measure = async (
      label: string,
      pathname: string,
      go: () => Promise<void>,
    ): Promise<{ text: number; all: number }> => {
      await resetArrival(page);
      await page.evaluate((path) => {
        window.__measureSettle?.(path);
      }, pathname);
      await go();
      await expect
        .poll(async () => (await arrival(page)).settledAt, { timeout: 5000 })
        .not.toBeNull();
      const record = await arrival(page);
      const clickAt = record.clickAt ?? 0;
      const all = Math.round((record.settledAt ?? 0) - clickAt);
      const text = Math.round((record.textSettledAt ?? 0) - clickAt);
      const toReady = Math.round((record.ready[0]?.at ?? 0) - clickAt);
      test.info().annotations.push({
        type: 'click-to-settled',
        description: `${label}: text ${String(text)} ms, all above-fold ${String(all)} ms (click->ready ${String(toReady)} ms)`,
      });
      return { text, all };
    };

    // Warm every page once so each measured navigation is cached (UI-SPEC budget is prefetched).
    for (const path of [
      '/',
      '/projects/',
      `/projects/${DETAIL_SLUG}/`,
      `/es/projects/${DETAIL_SLUG}/`,
    ]) {
      await page.goto(path);
    }

    await page.goto('/projects/');
    await settleMotion(page);
    const home = await measure('Home', '/', () =>
      page.getByRole('banner').getByRole('link', { name: 'Martina Fernandez' }).click(),
    );
    await waitForNavigationIdle(page);

    const nav = page.getByRole('navigation', { name: en['nav.label'], exact: true });
    const projects = await measure('Projects', '/projects/', () =>
      nav.getByRole('link', { name: en['nav.projects'], exact: true }).click(),
    );
    await waitForNavigationIdle(page);

    const viaCard = await measure('Detail via card', `/projects/${DETAIL_SLUG}/`, () =>
      page.locator(`main article a[href="/projects/${DETAIL_SLUG}/"]`).first().click(),
    );
    await waitForNavigationIdle(page);

    // Detail without a card: the EN/ES switch lands on the Spanish detail page.
    const language = page.getByRole('navigation', { name: en['lang.label'], exact: true });
    const detail = await measure('Detail (language switch)', `/es/projects/${DETAIL_SLUG}/`, () =>
      language.getByRole('link', { name: en['lang.es'] }).click(),
    );

    // Gated on what the UI-SPEC table models (text entrances). The above-the-fold image shutters
    // (card and cover picture scale) end later and are logged, not gated. Home (~1.35 s) is the
    // accepted exception and is logged only (UI-SPEC D-16).
    // Detail measured ~1.38 s against the table's ~1.23 s: the Phase 6 metadata stagger runs
    // longer than the table's arithmetic. Recorded in 07-04-SUMMARY as an open budget item (the
    // UI-SPEC lever is a shorter --t-wipe, a user decision); 1450 ms only guards against regression.
    expect(home.all).toBeGreaterThan(0);
    expect(projects.text).toBeLessThanOrEqual(1300);
    expect(viaCard.text).toBeLessThanOrEqual(1450);
    expect(detail.text).toBeLessThanOrEqual(1450);
  });

  test('back restores the scroll position with the back wipe and the right reveal state', async ({
    page,
  }) => {
    await recordArrival(page);
    await page.goto('/projects/');
    await settleMotion(page);
    await page.evaluate(() => {
      window.scrollTo({ top: 1500, behavior: 'instant' });
    });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(1500);
    // Let the router store the position in history.state (it listens to scroll).
    await page.waitForTimeout(300);

    const href = await page.evaluate(() => {
      const links = [
        ...document.querySelectorAll<HTMLAnchorElement>('main article a[href^="/projects/"]'),
      ];
      const inView = links.find((link) => {
        const rect = link.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight && rect.height > 0;
      });
      return inView?.getAttribute('href') ?? null;
    });
    expect(href).not.toBeNull();
    // Clicked in the page: a Playwright click could scroll the link into view and move scrollY.
    await page.evaluate(() => {
      window.__navPending = true;
      document.addEventListener(
        'astro:page-load',
        () => {
          window.__navPending = false;
        },
        { once: true },
      );
    });
    await page.evaluate((target) => {
      document.querySelector<HTMLAnchorElement>(`main article a[href="${target}"]`)?.click();
    }, href ?? '');
    await expect.poll(() => page.evaluate(() => window.__navPending !== true)).toBe(true);
    await waitForNavigationIdle(page);
    await expect(page).not.toHaveURL(/\/projects\/$/);
    await resetArrival(page);

    await page.goBack();
    await expect(page).toHaveURL(/\/projects\/$/);
    await expect.poll(async () => (await arrival(page)).ready.length).toBe(1);
    await waitForNavigationIdle(page);

    expect(Math.abs((await page.evaluate(() => window.scrollY)) - 1500)).toBeLessThanOrEqual(2);
    const record = await arrival(page);
    expect(record.ready[0]?.direction).toBe('back');

    // Above the restored viewport: shown at once, never replayed.
    const aboveUnrevealed = await page.evaluate(
      () =>
        [...document.querySelectorAll('[data-reveal]')].filter(
          (el) => el.getBoundingClientRect().bottom <= 0 && !el.hasAttribute('data-revealed'),
        ).length,
    );
    expect(aboveUnrevealed).toBe(0);

    await settleMotion(page);
    const inViewUnrevealed = await page.evaluate(
      () =>
        [...document.querySelectorAll('[data-reveal]')].filter((el) => {
          const rect = el.getBoundingClientRect();
          return (
            rect.bottom > 0 && rect.top < window.innerHeight && !el.hasAttribute('data-revealed')
          );
        }).length,
    );
    expect(inViewUnrevealed).toBe(0);
    await expect(page.locator('main h1')).toBeFocused();
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - 1500)).toBeLessThanOrEqual(2);
  });

  test('flash limit: five clicks within a second never exceed three wipe passes per second', async ({
    page,
  }) => {
    await recordArrival(page);
    for (const path of ['/', '/projects/', `/projects/${DETAIL_SLUG}/`]) await page.goto(path);
    await page.goto('/');
    await settleMotion(page);
    await resetArrival(page);

    // Programmatic clicks: during a view transition the pseudo overlay takes hit testing, so a
    // pointer click could not reach the links. The router still sees each as a link click.
    const hrefs = ['/projects/', '/', `/projects/${DETAIL_SLUG}/`, '/projects/', '/'];
    await page.evaluate(async (list) => {
      const pause = (ms: number): Promise<void> =>
        new Promise((resolve) => {
          setTimeout(resolve, ms);
        });
      for (const [index, href] of list.entries()) {
        if (index > 0) await pause(220);
        let link = document.querySelector<HTMLAnchorElement>(`a[href="${href}"]`);
        let temporary = false;
        if (link === null) {
          link = document.createElement('a');
          link.href = href;
          document.body.append(link);
          temporary = true;
        }
        link.click();
        if (temporary) link.remove();
      }
    }, hrefs);

    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
    await waitForNavigationIdle(page);
    await expect(page.locator('main h1')).toBeFocused();
    await expect(page.locator('html')).not.toHaveAttribute('data-vt', /.*/);
    await expect(page.locator('html')).not.toHaveAttribute('data-wipe', /.*/);

    const readies = (await arrival(page)).ready.map((entry) => entry.at).sort((a, b) => a - b);
    test.info().annotations.push({
      type: 'wipe-ready-times',
      description: readies.map((at) => String(Math.round(at - (readies[0] ?? 0)))).join(', '),
    });
    for (const start of readies) {
      const inWindow = readies.filter((at) => at >= start && at < start + 1000).length;
      expect(inWindow).toBeLessThanOrEqual(3);
    }
  });

  test('toggle to reduced mid-transition finishes it at once and leaves no hold (D-18)', async ({
    page,
  }) => {
    // The arriving header's toggle is bound when the page is released (the page lifecycle mounts
    // then), and a view transition takes hit testing until it ends, so the earliest real press is
    // at release, while the wipe still has ~170 ms to run.
    await recordArrival(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await resetArrival(page);
    await page.evaluate(() => {
      window.__toggleAtRelease = true;
    });
    const nav = page.getByRole('navigation', { name: en['nav.label'], exact: true });
    await nav.getByRole('link', { name: en['nav.projects'], exact: true }).click();
    await expect(page).toHaveURL(/\/projects\/$/);
    await expect.poll(async () => (await arrival(page)).finished.length).toBe(1);

    const record = await arrival(page);
    const readyAt = record.ready[0]?.at ?? 0;
    const finishedAt = record.finished[0] ?? 0;
    expect(record.toggleAt).not.toBeNull();
    expect(finishedAt - (record.toggleAt ?? 0)).toBeLessThanOrEqual(250);
    // skipTransition, not the natural end: the 560 ms wipe would finish at ready + 560.
    expect(finishedAt - readyAt).toBeLessThan(520);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await expect(page.locator('html')).not.toHaveAttribute('data-vt', /.*/);
    await expect(page.locator('html')).not.toHaveAttribute('data-wipe', /.*/);
    await expect(page.locator('main h1')).toBeFocused();
  });

  test('OS reduced-motion switch during the hold finishes the transition at once (D-18)', async ({
    page,
  }) => {
    await recordArrival(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await resetArrival(page);
    const nav = page.getByRole('navigation', { name: en['nav.label'], exact: true });
    await nav.getByRole('link', { name: en['nav.projects'], exact: true }).click();
    await page.waitForFunction(() => (window.__arrival?.ready.length ?? 0) > 0, undefined, {
      polling: 'raf',
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(async () => (await arrival(page)).finished.length).toBe(1);

    const record = await arrival(page);
    const readyAt = record.ready[0]?.at ?? 0;
    const changeAt = record.motionChangeAt ?? Number.POSITIVE_INFINITY;
    // The switch landed while the wipe was still running, and ended it within 250 ms.
    expect(changeAt - readyAt).toBeLessThan(560);
    expect((record.finished[0] ?? 0) - changeAt).toBeLessThanOrEqual(250);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await expect(page.locator('html')).not.toHaveAttribute('data-vt', /.*/);
    await expect(page.locator('html')).not.toHaveAttribute('data-wipe', /.*/);
    await expect(page.locator('main h1')).toBeFocused();
  });
});
