import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { interpolate } from '../../src/i18n/t';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { expectedProjects } from './helpers/projects';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const enUrl = `${site.url}/projects/`;
const esUrl = `${site.url}/es/projects/`;

const cases = [
  { path: '/projects/', lang: 'en', dict: en, canonical: enUrl, otherHref: '/es/projects/' },
  { path: '/es/projects/', lang: 'es', dict: es, canonical: esUrl, otherHref: '/projects/' },
] as const;

for (const { path, lang, dict, canonical, otherHref } of cases) {
  test.describe(`projects page ${path}`, () => {
    const expected = expectedProjects(lang);

    test('renders the localized page shell', async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page).toHaveTitle(dict['meta.projects.title']);
      await expect(page.locator('main h1')).toHaveText(dict['projects.heading']);
      await expect(page.locator('main p', { hasText: dict['projects.intro'] })).toHaveText(
        dict['projects.intro'],
      );
    });

    test('lists every project newest first with detail links', async ({ page }) => {
      await page.goto(path);
      const links = page.locator('main article h2 a');
      await expect(links).toHaveCount(expected.length);
      // TODO(phase-4): remove — detail pages land in Phase 4 (D-09)
      const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
      expect(hrefs).toEqual(expected.map((project) => project.href));
    });

    test('card titles carry the right language', async ({ page }) => {
      await page.goto(path);
      const links = page.locator('main article h2 a');
      for (const [index, project] of expected.entries()) {
        const link = links.nth(index);
        await expect(link).toHaveAccessibleName(project.title);
        if (project.titleLang === null) {
          await expect(link.locator('span[lang]')).toHaveCount(0);
        } else {
          await expect(link.locator(`span[lang="${project.titleLang}"]`)).toHaveCount(1);
        }
      }
    });

    test('covers have localized alt text', async ({ page }) => {
      await page.goto(path);
      const images = page.locator('main article img');
      await expect(images).toHaveCount(expected.length);
      const alts = await images.evaluateAll((els) => els.map((el) => el.getAttribute('alt')));
      for (const alt of alts) {
        expect(alt).toBeTruthy();
        expect(alt).not.toContain('Image may contain');
      }
      const title = expected[0]?.title ?? '';
      expect(alts[0]).toBe(interpolate(dict['projects.coverAlt'], { title }));
    });

    test('has a self canonical and en/es/x-default alternates', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
      const alternates = [
        ['en', enUrl],
        ['es', esUrl],
        ['x-default', enUrl],
      ] as const;
      for (const [hreflang, href] of alternates) {
        await expect(page.locator(`link[rel="alternate"][hreflang="${hreflang}"]`)).toHaveAttribute(
          'href',
          href,
        );
      }
    });

    test('language switcher points at the other locale', async ({ page }) => {
      await page.goto(path);
      const nav = page.getByRole('navigation', { name: dict['lang.label'] });
      const other = lang === 'en' ? 'es' : 'en';
      await expect(nav.locator(`a[hreflang="${other}"]`)).toHaveAttribute('href', otherHref);
    });

    test('has zero WCAG 2.2 AA axe violations', async ({ page }) => {
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(violations).toEqual([]);
    });

    test('serves only local covers', async ({ page }) => {
      await page.goto(path);
      const sources = await page
        .locator('img, source')
        .evaluateAll((els) =>
          els.flatMap((el) => [el.getAttribute('src') ?? '', el.getAttribute('srcset') ?? '']),
        );
      for (const source of sources) expect(source).not.toContain('behance.net');
    });
  });
}
