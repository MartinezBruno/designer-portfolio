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
      const headline = `${dict['hero.greeting']} ${site.firstName}.`;
      await expect(page.getByRole('region', { name: headline })).toBeVisible();

      // The greeting is the headline: one h1, no separate label paragraph.
      const h1 = hero.getByRole('heading', { level: 1, name: headline });
      await expect(h1).toBeVisible();
      await expect(h1).toHaveText(headline);
      await expect(h1).toHaveAttribute('id', 'hero-title');
      await expect(hero.locator('p').filter({ hasText: dict['hero.greeting'] })).toHaveCount(0);
      // Role and description read as one paragraph in full ink.
      const intro = hero.getByText(`${dict['hero.role']} ${dict['hero.description']}`, {
        exact: true,
      });
      await expect(intro).toBeVisible();
      expect(await intro.evaluate((el) => el.tagName)).toBe('P');
      expect(await intro.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(17, 17, 17)');

      const img = page.locator('#main section[aria-labelledby="hero-title"] picture img');
      await expect(img).toBeVisible();
      await expect(img).toHaveAttribute('alt', dict['hero.imageAlt']);
      await expect(img).toHaveAttribute('loading', 'eager');
      await expect(img).toHaveAttribute('fetchpriority', 'high');
      await expect(img).toHaveAttribute('width', /^\d+$/);
      await expect(img).toHaveAttribute('height', /^\d+$/);

      const cta = hero.getByRole('link', { name: dict['hero.cta'] });
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute('href', `${path}#contact`);
    });

    test(`${path} hero picture offers an avif source and a webp img`, async ({ page }) => {
      await page.goto(path);
      const picture = page.locator('#main section[aria-labelledby="hero-title"] picture');
      await expect(picture.locator('source[type="image/avif"]')).toHaveCount(1);
      await expect(picture.locator('source[type="image/webp"]')).toHaveCount(0);
      await expect(picture.locator('img')).toHaveAttribute('src', /\.webp(\?|$)/);
    });

    for (const [width, maxSide] of [
      [375, 128],
      [1280, 256],
    ] as const) {
      test(`${path} hero portrait is a capped circle at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        const img = page.locator('#main section[aria-labelledby="hero-title"] picture img');
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

test.describe('hero headline typography', () => {
  for (const [path, dict] of cases) {
    test(`${path} has no uppercase eyebrow above the headline`, async ({ page }) => {
      await page.goto(path);
      const hero = page.locator('section[aria-labelledby="hero-title"]');
      const eyebrows = await hero.evaluate((root) => {
        const h1 = root.querySelector('h1');
        if (!h1) return ['missing h1'];
        return [...root.querySelectorAll('p, span, div')]
          .filter((el) => el.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING)
          .filter((el) => !h1.contains(el) && !el.contains(h1))
          .filter((el) => el.textContent.trim() !== '')
          .map((el) => `${el.tagName}:${getComputedStyle(el).textTransform}`);
      });
      expect(eyebrows).toEqual([]);
    });

    for (const width of [320, 390, 768, 1024, 1280]) {
      test(`${path} headline sits on exactly two lines at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        const h1 = page.locator('#hero-title');
        await expect(h1).toHaveText(`${dict['hero.greeting']} ${site.firstName}.`);
        const metrics = await h1.evaluate((el) => {
          const style = getComputedStyle(el);
          const fontSize = Number.parseFloat(style.fontSize);
          const lineHeight = Number.parseFloat(style.lineHeight);
          const spans = [...el.querySelectorAll('span')];
          return {
            fontSize,
            lines: Math.round(el.getBoundingClientRect().height / lineHeight),
            fits: spans.every((span) => span.getClientRects().length === 1),
            overflow: el.scrollWidth > el.clientWidth + 1,
          };
        });
        expect(metrics.lines).toBe(2);
        expect(metrics.fits).toBe(true);
        expect(metrics.overflow).toBe(false);
        if (width === 1280) expect(metrics.fontSize).toBeGreaterThanOrEqual(96);
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(width);
      });
    }
  }
});
