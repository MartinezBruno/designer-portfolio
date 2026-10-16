import { expect, test, type Page } from '@playwright/test';

const paths = ['/', '/es/'] as const;

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test.describe('motion gate with JavaScript and no motion preference', () => {
  for (const path of paths) {
    test(`${path} resolves data-motion to on with zero console errors`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(path);
      await page.waitForLoadState('load');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      expect(errors).toEqual([]);
    });
  }
});

test.describe('motion gate with prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const path of paths) {
    test(`${path} resolves data-motion to off and keeps content visible`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('#main picture img')).toBeVisible();
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
    });
  }
});

test.describe('motion gate without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const path of paths) {
    test(`${path} keeps data-motion off and content visible`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('#main picture img')).toBeVisible();
      await expect(page.locator('footer svg').first()).toBeVisible();
    });
  }
});
