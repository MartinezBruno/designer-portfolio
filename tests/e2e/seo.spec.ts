import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { interpolate } from '../../src/i18n/t';
import { expectedDetails } from './helpers/projects';

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

const detailCases = [
  { locale: 'en', lang: 'en', dict: en },
  { locale: 'es', lang: 'es', dict: es },
] as const;

for (const { locale, lang, dict } of detailCases) {
  for (const detail of expectedDetails(locale)) {
    test.describe(`SEO head on ${detail.href}`, () => {
      test('has localized title, description, canonical and alternates', async ({ page }) => {
        await page.goto(detail.href);
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        await expect(page).toHaveTitle(
          interpolate(dict['meta.project.title'], { title: detail.title }),
        );
        const description =
          detail.summary ?? interpolate(dict['meta.project.description'], { title: detail.title });
        await expect(page.locator('meta[name="description"]')).toHaveAttribute(
          'content',
          description,
        );
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
          'href',
          `${site.url}${detail.href}`,
        );
        const enHref = `${site.url}/projects/${detail.slug}/`;
        const esHref = `${site.url}/es/projects/${detail.slug}/`;
        const expected = [
          ['en', enHref],
          ['es', esHref],
          ['x-default', enHref],
        ] as const;
        for (const [hreflang, href] of expected) {
          await expect(
            page.locator(`link[rel="alternate"][hreflang="${hreflang}"]`),
          ).toHaveAttribute('href', href);
        }
      });

      test('has a same-origin absolute JPG og:image that is served', async ({ page, request }) => {
        await page.goto(detail.href);
        const ogImage = page.locator('meta[property="og:image"]');
        await expect(ogImage).toHaveCount(1);
        const content = await ogImage.getAttribute('content');
        if (content === null) throw new Error('og:image has no content');
        const url = new URL(content);
        expect(url.origin).toBe(new URL(site.url).origin);
        expect(url.pathname).toMatch(/\.jpg$/);
        const response = await request.get(url.pathname);
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toMatch(/^image\//);
      });

      test('has no project year in any meta tag (D-12)', async ({ page }) => {
        await page.goto(detail.href);
        const contents = await page
          .locator('meta[content]')
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('content') ?? ''));
        // Whole-token match: cover file names are numeric ids that can contain year digits.
        const year = new RegExp(`\\b${detail.year}\\b`);
        for (const content of contents) expect(content).not.toMatch(year);
      });
    });
  }
}

for (const path of ['/', '/projects/', '/es/', '/es/projects/', '/no-such-page/']) {
  test(`${path} has no og:image`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
  });
}
