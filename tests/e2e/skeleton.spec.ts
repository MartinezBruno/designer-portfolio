import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { site } from '../../src/data/site';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

const pages = [
  ['/', 'en', en],
  ['/es/', 'es', es],
] as const;

for (const [path, locale, dict] of pages) {
  test(`${path} serves the ${locale} skeleton page`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveCount(1);
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(`${dict['hero.greeting']} ${site.firstName}.`);

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(violations).toEqual([]);
  });
}
