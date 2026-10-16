import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

const cases = [
  { path: '/', lang: 'en', dict: en, ogLocale: 'en_US', ogAlternate: 'es_ES' },
  { path: '/es/', lang: 'es', dict: es, ogLocale: 'es_ES', ogAlternate: 'en_US' },
] as const;

const enUrl = `${site.url}/`;
const esUrl = `${site.url}/es/`;

for (const { path, lang, dict, ogLocale, ogAlternate } of cases) {
  test.describe(`SEO head on ${path}`, () => {
    test('has localized title, description and html lang', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page).toHaveTitle(dict['meta.home.title']);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        dict['meta.home.description'],
      );
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    });

    test('has a self canonical and en/es/x-default alternates', async ({ page }) => {
      await page.goto(path);
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveCount(1);
      await expect(canonical).toHaveAttribute('href', `${site.url}${path}`);

      const expected = [
        ['en', enUrl],
        ['es', esUrl],
        ['x-default', enUrl],
      ] as const;
      for (const [hreflang, href] of expected) {
        const alternate = page.locator(`link[rel="alternate"][hreflang="${hreflang}"]`);
        await expect(alternate).toHaveCount(1);
        await expect(alternate).toHaveAttribute('href', href);
      }
      await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(3);
    });

    test('has Open Graph tags', async ({ page }) => {
      await page.goto(path);
      const og = (property: string) => page.locator(`meta[property="${property}"]`);
      await expect(og('og:title')).toHaveAttribute('content', dict['meta.home.title']);
      await expect(og('og:description')).toHaveAttribute('content', dict['meta.home.description']);
      await expect(og('og:locale')).toHaveAttribute('content', ogLocale);
      await expect(og('og:locale:alternate')).toHaveAttribute('content', ogAlternate);
      await expect(og('og:type')).toHaveAttribute('content', 'website');
      await expect(og('og:url')).toHaveAttribute('content', `${site.url}${path}`);
    });
  });
}
