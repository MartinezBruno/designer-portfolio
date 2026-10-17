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
      await expect(
        page.locator('#main section[aria-labelledby="hero-title"] picture img'),
      ).toBeVisible();
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
      await expect(
        page.locator('#main section[aria-labelledby="hero-title"] picture img'),
      ).toBeVisible();
      await expect(page.locator('footer svg').first()).toBeVisible();
    });
  }
});

test.describe('motion gate follows a reduced-motion change after load', () => {
  // Phone width: a non-wrapping row would clip most roles inside the band's overflow-hidden.
  test.use({ viewport: { width: 375, height: 800 } });

  for (const path of paths) {
    test(`${path} turns the roles band static and hides the pause toggle live`, async ({
      page,
    }) => {
      const errors = collectErrors(page);
      await page.goto(path);
      const html = page.locator('html');
      const band = page.locator('[data-marquee]');
      const copyA = band.locator('ul:not([aria-hidden])').first();
      const copyB = band.locator('ul[aria-hidden="true"]');
      const toggle = page.locator('[data-marquee-toggle]');
      await expect(html).toHaveAttribute('data-motion', 'on');
      await expect(copyB).toBeVisible();
      await expect(toggle).toBeVisible();

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(html).toHaveAttribute('data-motion', 'off');
      await expect(copyB).toBeHidden();
      await expect(toggle).toBeHidden();
      expect(await copyA.evaluate((el) => getComputedStyle(el).flexWrap)).toBe('wrap');
      expect(await copyA.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
      // Every role sits fully inside the band's clipping box (nothing cut off by overflow-hidden).
      const clipped = await band.evaluate((section) => {
        const clip = section.querySelector('.overflow-hidden')?.getBoundingClientRect();
        if (!clip) return ['missing clip box'];
        return [...section.querySelectorAll('ul:not([aria-hidden]) > li')]
          .filter((li) => {
            const r = li.getBoundingClientRect();
            return (
              r.left < clip.left ||
              r.right > clip.right ||
              r.top < clip.top ||
              r.bottom > clip.bottom
            );
          })
          .map((li) => li.textContent.trim());
      });
      expect(clipped).toEqual([]);

      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect(html).toHaveAttribute('data-motion', 'on');
      await expect(copyB).toBeVisible();
      await expect(toggle).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});
