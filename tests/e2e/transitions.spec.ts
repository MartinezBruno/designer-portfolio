import { expect, test, type Page } from '@playwright/test';
import { site } from '../../src/data/site';
import { interpolate } from '../../src/i18n/t';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { expectedDetails } from './helpers/projects';
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
