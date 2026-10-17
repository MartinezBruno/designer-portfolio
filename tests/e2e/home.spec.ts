import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

const cases = [
  ['/', en],
  ['/es/', es],
] as const;

test.describe('hero without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const [path, dict] of cases) {
    test(`${path} shows the full hero`, async ({ page }) => {
      await page.goto(path);

      const hero = page.locator('section[aria-labelledby="hero-title"]');
      await expect(hero).toBeVisible();
      await expect(page.getByRole('region', { name: site.name })).toBeVisible();

      await expect(hero.getByText(dict['hero.greeting'], { exact: true })).toBeVisible();
      const h1 = hero.getByRole('heading', { level: 1 });
      await expect(h1).toHaveText(site.name);
      await expect(h1).toHaveAttribute('id', 'hero-title');
      await expect(hero.getByText(dict['hero.title'], { exact: true })).toBeVisible();
      await expect(hero.getByText(dict['hero.description'], { exact: true })).toBeVisible();

      const img = page.locator('#main picture img');
      await expect(img).toBeVisible();
      await expect(img).toHaveAttribute('alt', dict['hero.imageAlt']);
      await expect(img).toHaveAttribute('loading', 'eager');
      await expect(img).toHaveAttribute('fetchpriority', 'high');
      await expect(img).toHaveAttribute('width', /^\d+$/);
      await expect(img).toHaveAttribute('height', /^\d+$/);

      const cta = hero.getByRole('link', { name: dict['hero.cta'] });
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute('href', '#contact');
    });

    test(`${path} hero picture offers avif and webp sources`, async ({ page }) => {
      await page.goto(path);
      const picture = page.locator('#main picture');
      await expect(picture.locator('source[type="image/avif"]')).toHaveCount(1);
      await expect(picture.locator('source[type="image/webp"]')).toHaveCount(1);
    });

    for (const [width, maxSide] of [
      [375, 256],
      [1280, 320],
    ] as const) {
      test(`${path} hero portrait is a capped circle at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        const img = page.locator('#main picture img');
        await expect(img).toHaveAttribute('width', '321');
        await expect(img).toHaveAttribute('height', '324');
        const box = await img.boundingBox();
        expect(box).not.toBeNull();
        // Square, and capped near the 321px source so it is not upscaled much.
        expect(Math.abs((box?.width ?? 0) - (box?.height ?? 0))).toBeLessThanOrEqual(1);
        expect(box?.width).toBe(maxSide);
        const computed = await img.evaluate((el) => {
          const style = getComputedStyle(el);
          return { bg: style.backgroundColor, fit: style.objectFit, radius: style.borderRadius };
        });
        // Transparent corners show the page: no placeholder fill, no cover crop.
        expect(computed.bg).toBe('rgba(0, 0, 0, 0)');
        expect(computed.fit).toBe('contain');
        expect(computed.radius).not.toBe('0px');
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(width);
      });
    }
  }
});
