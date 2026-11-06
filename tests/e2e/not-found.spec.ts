import { expect, type Page, test } from '@playwright/test';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

// The Cloudflare adapter's preview serves the Spanish 404 for /es/* misses and the English 404
// (with a Spanish cross-link) for every other miss. /es/404/ itself also returns HTTP 404
// (Phase 1 WR-03 / Phase 8 D-17): src/pages/es/404.astro sets `prerender = false`, so no static
// dist/client/es/404/index.html exists for the asset layer to serve as 200. The Worker renders the
// route on demand and Astro gives localized 404 routes status 404.

async function expectNoIndexWithoutCanonical(page: Page): Promise<void> {
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
}

const spanishCrossLink = 'main [lang="es"] a[href="/es/"]';

test.describe('root 404', () => {
  test('/does-not-exist returns a localized, noindexed 404', async ({ page }) => {
    const response = await page.goto('/does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en['notFound.heading']);
    await expect(page.getByRole('link', { name: en['notFound.cta'] })).toHaveAttribute('href', '/');

    const crossLink = page.locator(spanishCrossLink);
    await expect(crossLink).toHaveCount(1);
    await expect(crossLink).toHaveText(es['notFound.altLocaleLink']);

    await expectNoIndexWithoutCanonical(page);
  });

  test('the language toggle points to the Spanish home, not /es/404/', async ({ page }) => {
    await page.goto('/does-not-exist');
    const toggle = page.getByRole('navigation', { name: 'Language' });
    await expect(toggle.getByRole('link', { name: 'Español' })).toHaveAttribute('href', '/es/');
  });

  test('/es/does-not-exist returns the Spanish 404', async ({ page }) => {
    const response = await page.goto('/es/does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(es['notFound.heading']);
  });
});

test.describe('Spanish 404', () => {
  test('/es/404/ returns the Spanish 404 with status 404', async ({ page }) => {
    const response = await page.goto('/es/404/');
    expect(response?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(es['notFound.heading']);
    await expect(page.getByRole('link', { name: es['notFound.cta'] })).toHaveAttribute(
      'href',
      '/es/',
    );
    await expectNoIndexWithoutCanonical(page);

    const toggle = page.getByRole('navigation', { name: 'Idioma' });
    await expect(toggle.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/');
  });

  test('/es/404 (no trailing slash) returns the Spanish 404 with status 404', async ({ page }) => {
    const response = await page.goto('/es/404');
    expect(response?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(es['notFound.heading']);
    await expectNoIndexWithoutCanonical(page);
  });
});
