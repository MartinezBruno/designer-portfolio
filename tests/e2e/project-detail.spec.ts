import { expect, test } from '@playwright/test';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { expectedDetails } from './helpers/projects';

const cases = [
  { lang: 'en', dict: en },
  { lang: 'es', dict: es },
] as const;

for (const { lang, dict } of cases) {
  test.describe(`project detail pages (${lang})`, () => {
    const details = expectedDetails(lang);

    test('every visible project has a detail page', () => {
      expect(details.length).toBeGreaterThan(0);
    });

    for (const detail of details) {
      test.describe(detail.href, () => {
        test('renders a localized page', async ({ page }) => {
          const response = await page.goto(detail.href);
          expect(response?.status()).toBe(200);
          await expect(page.locator('html')).toHaveAttribute('lang', lang);
        });

        test('opens with the title-first intro band', async ({ page }) => {
          await page.goto(detail.href);
          const heading = page.locator('h1#project-title');
          await expect(page.locator('h1')).toHaveCount(1);
          await expect(heading).toHaveText(detail.title);
          if (detail.titleLang === null) {
            await expect(heading.locator('span[lang]')).toHaveCount(0);
          } else {
            await expect(heading.locator(`span[lang="${detail.titleLang}"]`)).toHaveCount(1);
          }
          const header = page.locator('article header');
          if (detail.summary !== null) {
            await expect(header.locator('p', { hasText: detail.summary })).toHaveText(
              detail.summary,
            );
          }
        });

        test('shows labelled category and tools', async ({ page }) => {
          await page.goto(detail.href);
          const header = page.locator('article header');
          const categoryGroup = header.locator('dl > div', {
            has: page.locator('dt', { hasText: dict['projects.meta.category'] }),
          });
          if (detail.category === null) {
            await expect(categoryGroup).toHaveCount(0);
          } else {
            await expect(categoryGroup.locator('dt')).toBeVisible();
            await expect(categoryGroup.locator('dd')).toHaveText(detail.category);
          }
          const toolsGroup = header.locator('dl > div', {
            has: page.locator('dt', { hasText: dict['projects.meta.tools'] }),
          });
          if (detail.tools.length === 0) {
            await expect(toolsGroup).toHaveCount(0);
            return;
          }
          await expect(toolsGroup.locator('dt')).toBeVisible();
          const items = toolsGroup.locator('li');
          await expect(items).toHaveCount(detail.tools.length);
          for (const [index, tool] of detail.tools.entries()) {
            const item = items.nth(index);
            await expect(item).toHaveText(tool.name);
            await expect(item.locator('svg')).toHaveCount(tool.hasIcon ? 1 : 0);
          }
        });

        test('links to Behance in a new tab', async ({ page }) => {
          await page.goto(detail.href);
          const link = page.locator('article header a', { hasText: dict['detail.viewOnBehance'] });
          await expect(link).toHaveCount(1);
          await expect(link).toHaveAttribute('href', detail.behanceUrl);
          await expect(link).toHaveAttribute('target', '_blank');
          await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
          await expect(link).toHaveAttribute('rel', /\bnoreferrer\b/);
          const name = await link.evaluate((el) => el.textContent?.replace(/\s+/g, ' ').trim());
          expect(name?.endsWith(dict['a11y.newTab'])).toBe(true);
          await expect(link).toHaveAccessibleName(
            new RegExp(`${dict['a11y.newTab'].replace(/[()]/g, '\\$&')}$`),
          );
        });

        test('shows no project date (D-12)', async ({ page }) => {
          await page.goto(detail.href);
          await expect(page.locator('article header')).not.toContainText(detail.year);
          const metaContents = await page
            .locator('head meta[content]')
            .evaluateAll((els) => els.map((el) => el.getAttribute('content') ?? ''));
          // URLs (og:image, og:url) may carry numeric ids; only the copy must be date-free.
          const copy = metaContents.filter((content) => !/^(https?:)?\//.test(content));
          for (const content of copy) expect(content).not.toContain(detail.year);
          await expect(page).not.toHaveTitle(new RegExp(detail.year));
        });

        test('does not repeat the cover (D-11)', async ({ page }) => {
          await page.goto(detail.href);
          const sources = await page
            .locator('article img, article source')
            .evaluateAll((els) =>
              els.flatMap((el) => [el.getAttribute('src') ?? '', el.getAttribute('srcset') ?? '']),
            );
          for (const source of sources) expect(source).not.toContain(detail.coverStem);
        });
      });
    }
  });
}
