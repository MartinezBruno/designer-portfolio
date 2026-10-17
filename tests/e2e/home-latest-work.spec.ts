import { expect, test, type Locator } from '@playwright/test';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { expectedHome } from './helpers/projects';

const cases = [
  ['/', en, 'en', '/projects/'],
  ['/es/', es, 'es', '/es/projects/'],
] as const;

/** True when `a` comes before `b` in document order. */
async function precedes(a: Locator, b: Locator): Promise<boolean> {
  const other = await b.elementHandle();
  return a.evaluate(
    (el, target) =>
      target !== null &&
      Boolean(el.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING),
    other,
  );
}

test.describe('latest work', () => {
  for (const [path, dict, locale, projectsHref] of cases) {
    test.describe(`on ${path}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(path);
      });

      test('sits between services and tools with the localized heading', async ({ page }) => {
        const section = page.locator('section[aria-labelledby="work-title"]');
        await expect(section).toHaveCount(1);
        await expect(section.getByRole('heading', { level: 2 })).toHaveText(dict['work.heading']);

        const services = page.locator('section[aria-labelledby="services-title"]');
        const tools = page.locator('section[aria-labelledby="tools-title"]');
        expect(await precedes(services, section)).toBe(true);
        expect(await precedes(section, tools)).toBe(true);
      });

      test('shows the selection as one even row from md', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        const tiles = page.locator('section[aria-labelledby="work-title"] li');
        const boxes = [];
        for (let index = 0; index < (await tiles.count()); index++) {
          const box = await tiles.nth(index).locator('article > div').first().boundingBox();
          expect(box).not.toBeNull();
          if (box) boxes.push(box);
        }
        expect(boxes).toHaveLength(expectedHome(locale).length);
        const [first] = boxes;
        for (const box of boxes) {
          expect(Math.abs(box.y - (first?.y ?? 0))).toBeLessThanOrEqual(1);
          expect(Math.abs(box.width - (first?.width ?? 0))).toBeLessThanOrEqual(1);
          expect(Math.abs(box.height - (first?.height ?? 0))).toBeLessThanOrEqual(1);
        }
      });

      test('lists the Home selection in order with compact cards', async ({ page }) => {
        const section = page.locator('section[aria-labelledby="work-title"]');
        const expected = expectedHome(locale);
        const links = section.locator('article h3 a');
        await expect(links).toHaveCount(expected.length);
        for (const [index, row] of expected.entries()) {
          await expect(links.nth(index)).toHaveAttribute('href', row.href);
          await expect(links.nth(index)).toHaveText(row.title);
          // Every card opens a real detail page (Phase 4 closes the Phase 3 D-09 debt).
          expect((await page.request.get(row.href)).status(), `${row.href} resolves`).toBe(200);
        }

        // Compact: cover, title and category only (D-11, D-19; no date, user 2026-10-17).
        await expect(section.locator('dt', { hasText: dict['projects.meta.tools'] })).toHaveCount(
          0,
        );
        await expect(section.locator('article p')).toHaveCount(0);
        const articles = section.locator('article');
        await expect(articles).toHaveCount(expected.length);
        for (let index = 0; index < expected.length; index++) {
          await expect(articles.nth(index).locator('time')).toHaveCount(0);
        }
      });

      test('links to the Projects page after the grid', async ({ page }) => {
        const section = page.locator('section[aria-labelledby="work-title"]');
        const seeAll = section.getByRole('link', { name: dict['work.seeAll'], exact: true });
        await expect(seeAll).toHaveAttribute('href', projectsHref);
        expect(await precedes(section.locator('ul').first(), seeAll)).toBe(true);
      });

      test('header nav shows Projects before Contact without aria-current', async ({ page }) => {
        const nav = page.getByRole('navigation', { name: dict['nav.label'], exact: true });
        const projects = nav.getByRole('link', { name: dict['nav.projects'], exact: true });
        const contact = nav.getByRole('link', { name: dict['nav.contact'], exact: true });
        await expect(projects).toHaveAttribute('href', projectsHref);
        expect(await precedes(projects, contact)).toBe(true);
        await expect(projects).not.toHaveAttribute('aria-current', /.*/);
      });
    });
  }

  for (const [, dict, , projectsHref] of cases) {
    test(`header nav marks Projects as the current page on ${projectsHref}`, async ({ page }) => {
      await page.goto(projectsHref);
      const nav = page.getByRole('navigation', { name: dict['nav.label'], exact: true });
      const projects = nav.getByRole('link', { name: dict['nav.projects'], exact: true });
      await expect(projects).toHaveAttribute('aria-current', 'page');
      await expect(projects).toHaveAttribute('href', projectsHref);
    });
  }
});
