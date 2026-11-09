import { expect, test, type Page } from '@playwright/test';
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
      test(`${path} hero portrait is a 3:4 arch on the accent ground at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await expectArch(page, width, maxSide);
      });
    }
  }
});

test.describe('hero portrait arch with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('/ keeps the same static arch at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/');
    await expectArch(page, 375, 128);
    const picture = page.locator('#main section[aria-labelledby="hero-title"] picture');
    expect(await picture.evaluate((el) => getComputedStyle(el).clipPath)).toBe('none');
  });
});

/** Sketch 001 arch: 3:4, semicircle top, 1.25rem bottom corners, accent ground, real dimensions. */
async function expectArch(page: Page, width: number, maxSide: number): Promise<void> {
  const picture = page.locator('#main section[aria-labelledby="hero-title"] picture');
  const img = picture.locator('img');
  await expect(img).toHaveAttribute('width', '600');
  await expect(img).toHaveAttribute('height', '800');
  const box = await img.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width).toBe(maxSide);
  expect(Math.abs((box?.height ?? 0) - (maxSide * 4) / 3)).toBeLessThanOrEqual(1);
  const imgStyle = await img.evaluate((el) => {
    const style = getComputedStyle(el);
    return { bg: style.backgroundColor, fit: style.objectFit, position: style.objectPosition };
  });
  // The cutout's transparent pixels show the picture's accent ground, not an img fill.
  expect(imgStyle.bg).toBe('rgba(0, 0, 0, 0)');
  expect(imgStyle.fit).toBe('cover');
  expect(imgStyle.position).toBe('50% 6%');
  const frame = await picture.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      bg: style.backgroundColor,
      overflowX: style.overflowX,
      bottomLeft: style.borderBottomLeftRadius,
      topLeft: style.borderTopLeftRadius,
    };
  });
  expect(frame.bg).toBe('rgb(15, 112, 183)');
  expect(frame.overflowX).toBe('hidden');
  expect(frame.bottomLeft).toBe('20px');
  expect(frame.topLeft).toBe('50% 37.5%');
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(width);
}

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
