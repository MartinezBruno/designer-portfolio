import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { interpolate } from '../../src/i18n/t';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

const cases = [
  ['/', en],
  ['/es/', es],
] as const;

// h1 is text-5xl (48px) with line-height 1.1 = 52.8px per line; allow 2 lines plus rounding.
const MAX_H1_HEIGHT = 2 * 52.8 + 4;

for (const [path, dict] of cases) {
  test.describe(`footer on ${path}`, () => {
    test('has the contact heading, email, Behance link and copyright', async ({ page }) => {
      await page.goto(path);

      const footer = page.getByRole('contentinfo');
      await expect(footer).toHaveAttribute('id', 'contact');
      await expect(footer.getByRole('heading', { level: 2 })).toHaveText(dict['footer.heading']);

      const email = footer.getByRole('link', { name: site.email });
      await expect(email).toHaveAttribute('href', `mailto:${site.email}`);
      await expect(email).toHaveText(site.email);

      const behance = footer.getByRole('link', { name: dict['footer.behance'] });
      await expect(behance).toHaveAttribute('href', site.socials.behance);
      await expect(behance).toHaveAttribute('target', '_blank');
      await expect(behance).toHaveAttribute('rel', /\bnoopener\b/);
      await expect(behance).toHaveAttribute('rel', /\bnoreferrer\b/);
      await expect(behance.locator('.sr-only')).toHaveText(dict['a11y.newTab']);

      const copyright = interpolate(dict['footer.copyright'], { year: new Date().getFullYear() });
      await expect(footer.getByText(copyright, { exact: true })).toBeVisible();
    });

    test('header Main nav Contact link jumps to the footer', async ({ page }) => {
      await page.goto(path);
      const nav = page.getByRole('navigation', { name: dict['nav.label'], exact: true });
      const contact = nav.getByRole('link', { name: dict['nav.contact'], exact: true });
      await expect(contact).toHaveAttribute('href', '#contact');

      await contact.click();
      await expect(page).toHaveURL(/#contact$/);
      await expect(page.getByRole('contentinfo')).toBeInViewport();
    });

    test('at 320px there is no horizontal overflow and h1 is at most 2 lines', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(path);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(320);

      const box = await page.getByRole('heading', { level: 1 }).boundingBox();
      expect(box).not.toBeNull();
      expect(box?.height ?? Infinity).toBeLessThanOrEqual(MAX_H1_HEIGHT);
    });
  });
}

test.describe('footer icons without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('icons render as visible inline svg', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer svg').first()).toBeVisible();
  });

  test('raw HTML has inline svg in the footer, all aria-hidden', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const footer = /<footer[\s\S]*?<\/footer>/.exec(html)?.[0] ?? '';
    const svgs = footer.match(/<svg[^>]*>/g) ?? [];
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg).toContain('aria-hidden="true"');
    }
  });
});
