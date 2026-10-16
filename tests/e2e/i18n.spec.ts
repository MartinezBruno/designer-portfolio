import { expect, test } from '@playwright/test';

const MIN_TARGET = 44;

test.describe('language switcher', () => {
  test('on / the ES link leads to /es/', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Language' });
    const es = nav.getByRole('link', { name: 'Español' });
    await expect(es).toHaveAttribute('hreflang', 'es');
    await expect(es).toHaveAttribute('lang', 'es');
    await expect(nav.getByRole('link', { name: 'English' })).toHaveAttribute(
      'aria-current',
      'true',
    );

    await es.click();
    await expect(page).toHaveURL(/\/es\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('on /es/ the EN link leads to /', async ({ page }) => {
    await page.goto('/es/');
    const nav = page.getByRole('navigation', { name: 'Idioma' });
    const en = nav.getByRole('link', { name: 'English' });
    await expect(en).toHaveAttribute('hreflang', 'en');
    await expect(en).toHaveAttribute('lang', 'en');
    await expect(nav.getByRole('link', { name: 'Español' })).toHaveAttribute(
      'aria-current',
      'true',
    );

    await en.click();
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('each toggle link is at least 44x44', async ({ page }) => {
    await page.goto('/');
    const links = page.getByRole('navigation', { name: 'Language' }).getByRole('link');
    await expect(links).toHaveCount(2);
    for (const link of await links.all()) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TARGET);
    }
  });
});

test.describe('browser prefers Spanish', () => {
  test.use({
    locale: 'es-ES',
    extraHTTPHeaders: { 'Accept-Language': 'es-ES,es;q=0.9' },
  });

  test('/ is never redirected', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test.describe('skip link', () => {
  test('first Tab focuses "Skip to content" and Enter focuses main', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('first Tab on /es/ focuses "Saltar al contenido"', async ({ page }) => {
    await page.goto('/es/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
  });
});

test.describe('header', () => {
  const cases = [
    ['/', '/'],
    ['/es/', '/es/'],
  ] as const;

  for (const [path, home] of cases) {
    test(`wordmark on ${path} links to ${home} as the current page`, async ({ page }) => {
      await page.goto(path);
      const wordmark = page.getByRole('banner').getByRole('link', { name: 'Martina Fernandez' });
      await expect(wordmark).toHaveAttribute('href', home);
      await expect(wordmark).toHaveAttribute('aria-current', 'page');
    });
  }
});
