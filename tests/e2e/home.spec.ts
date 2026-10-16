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
  }
});
