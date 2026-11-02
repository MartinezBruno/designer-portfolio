import { expect, test, type Page } from '@playwright/test';
import { site } from '../../src/data/site';
import { interpolate } from '../../src/i18n/t';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { expectedDetails } from './helpers/projects';
import { softNavigate } from './helpers/navigation';

// Phase 7 soft navigation (MOTN-05; 07 D-03, D-05, D-14; Research Pitfalls 1 and 10).

const DETAIL_SLUG = 'website-instablogs';

declare global {
  interface Window {
    __marker?: number;
  }
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
