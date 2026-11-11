import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { interpolate } from '../../src/i18n/t';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

// SiteConfig makes Instagram optional; it is configured, so fail loudly if that ever changes.
const INSTAGRAM_HREF: string = (() => {
  const href: string | undefined = site.socials.instagram;
  if (href === undefined) throw new Error('site.socials.instagram is not configured');
  return href;
})();

const cases = [
  ['/', en],
  ['/es/', es],
] as const;

// h1 is text-5xl (48px) with line-height 1.1 = 52.8px per line; allow 2 lines plus rounding.
const MAX_H1_HEIGHT = 2 * 52.8 + 4;

for (const [path, dict] of cases) {
  test.describe(`footer on ${path}`, () => {
    test('has the contact heading, email, Behance and Instagram links and copyright', async ({
      page,
    }) => {
      await page.goto(path);

      const footer = page.getByRole('contentinfo');
      // The id moved to the Home Contact section (D-03).
      await expect(footer).not.toHaveAttribute('id', 'contact');
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

      const instagram = footer.getByRole('link', { name: dict['footer.instagram'] });
      await expect(instagram).toHaveAttribute('href', INSTAGRAM_HREF);
      await expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/martif_ph/');
      await expect(instagram).toHaveAttribute('target', '_blank');
      await expect(instagram).toHaveAttribute('rel', /\bnoopener\b/);
      await expect(instagram).toHaveAttribute('rel', /\bnoreferrer\b/);
      await expect(instagram.locator('.sr-only')).toHaveText(dict['a11y.newTab']);

      const copyright = interpolate(dict['footer.copyright'], { year: new Date().getFullYear() });
      await expect(footer.getByText(copyright, { exact: true })).toBeVisible();
    });

    test('header Main nav Contact link jumps to the Contact section', async ({ page }) => {
      await page.goto(path);
      const nav = page.getByRole('navigation', { name: dict['nav.label'], exact: true });
      const contact = nav.getByRole('link', { name: dict['nav.contact'], exact: true });
      await expect(contact).toHaveAttribute('href', `${path}#contact`);

      await contact.click();
      await expect(page).toHaveURL(/#contact$/);
      await expect(page.locator('section#contact')).toBeInViewport();
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

    test('at 320px every tool name is visible without horizontal overflow', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(path);
      const items = page.locator('[data-tool]');
      await expect(items).toHaveCount(5);
      for (let index = 0; index < 5; index++) {
        const box = await items.nth(index).boundingBox();
        expect(box).not.toBeNull();
        expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
        expect((box?.x ?? 0) + (box?.width ?? Infinity)).toBeLessThanOrEqual(320);
      }
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(320);
    });

    test('at 320px the roles band is full-bleed', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(path);

      const band = page.locator('section[data-marquee]');
      await expect(band.getByRole('heading', { level: 2 })).toHaveText(dict['roles.heading']);
      const box = await band.boundingBox();
      expect(box).not.toBeNull();
      expect(box?.x).toBe(0);
      expect(box?.width).toBe(320);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(320);
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

// Motion on (default context): copy A of the 4-role loop must cover its track so the
// translateX(-50%) loop never exposes a blank gap at wide desktop viewports.
test.describe('marquee track fill', () => {
  for (const [path] of cases) {
    for (const width of [1280, 1920, 2560]) {
      test(`on ${path} at ${width}px copy A is at least as wide as the track`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');

        const track = page.locator('section[data-marquee] .overflow-hidden');
        const copyA = track.locator('ul').first();
        const trackBox = await track.boundingBox();
        const copyBox = await copyA.boundingBox();
        expect(trackBox).not.toBeNull();
        expect(copyBox).not.toBeNull();

        const trackWidth = trackBox?.width ?? Infinity;
        const copyWidth = copyBox?.width ?? 0;
        testInfo.annotations.push({
          type: 'track-fill',
          description: `${path} @${width}: track=${trackWidth.toFixed(1)} copyA=${copyWidth.toFixed(1)}`,
        });
        const bandHeight = (await page.locator('section[data-marquee]').boundingBox())?.height;
        console.log(
          `[track-fill] ${path} @${width}: track=${trackWidth} copyA=${copyWidth} band=${bandHeight}`,
        );
        // 1px tolerance for subpixel rounding.
        expect(copyWidth).toBeGreaterThanOrEqual(trackWidth - 1);
      });
    }
  }
});

// Phase 3 (D-20, UI-SPEC Header nav): two-row header below sm, one 64px row from sm, and the
// sticky header never covers a focused project tile (scroll-pt on html, WCAG 2.4.11).
test.describe('phase 3 header and layout', () => {
  const phase3Pages = [
    ['/', en],
    ['/es/', es],
    ['/projects/', en],
    ['/es/projects/', es],
  ] as const;

  for (const [path, dict] of phase3Pages) {
    test(`at 320px ${path} has no horizontal overflow and a one-line wordmark`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(path);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(320);

      const wordmark = page.getByRole('banner').getByRole('link', { name: site.name });
      const box = await wordmark.boundingBox();
      expect(box).not.toBeNull();
      expect(box?.height ?? Infinity).toBeLessThanOrEqual(44 + 2);
    });

    test(`header on ${path} is one 64px row at 640px and two rows at 390px`, async ({ page }) => {
      const header = page.getByRole('banner');

      await page.setViewportSize({ width: 640, height: 800 });
      await page.goto(path);
      const wide = (await header.boundingBox())?.height ?? 0;
      expect(Math.abs(wide - 64)).toBeLessThanOrEqual(1);

      await page.setViewportSize({ width: 390, height: 844 });
      const narrow = (await header.boundingBox())?.height ?? 0;
      expect(Math.abs(narrow - 89)).toBeLessThanOrEqual(2);
    });

    test(`nav on ${path} lists Projects before Contact`, async ({ page }) => {
      await page.goto(path);
      const nav = page.getByRole('navigation', { name: dict['nav.label'], exact: true });
      const names = await nav.getByRole('link').allTextContents();
      expect(names.map((name) => name.trim())).toEqual([dict['nav.projects'], dict['nav.contact']]);
    });
  }

  test('on /projects/ a focused tile is never hidden under the sticky header', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/projects/');

    await page.getByRole('contentinfo').getByRole('link', { name: site.email }).focus();
    let onProject = false;
    for (let presses = 0; presses < 10 && !onProject; presses++) {
      await page.keyboard.press('Shift+Tab');
      onProject = await page.evaluate(
        () => document.activeElement?.matches('main article a') ?? false,
      );
    }
    expect(onProject, 'Shift+Tab should reach a project link').toBe(true);

    // WCAG 2.4.11 is about the focused control. At max scroll the last tile's cover may tuck under
    // the header (real summaries make it taller), but the focused link must be fully visible.
    const { linkTop, tileBottom, headerBottom } = await page.evaluate(() => {
      const link = document.activeElement?.getBoundingClientRect();
      const tile = document.activeElement?.closest('article')?.getBoundingClientRect();
      const header = document.querySelector('header')?.getBoundingClientRect();
      return {
        linkTop: link?.top ?? -Infinity,
        tileBottom: tile?.bottom ?? -Infinity,
        headerBottom: header?.bottom ?? Infinity,
      };
    });
    expect(linkTop).toBeGreaterThanOrEqual(headerBottom);
    expect(tileBottom).toBeGreaterThan(headerBottom);
  });
});

// Phase 6 (D-16, UI-SPEC Motion Toggle): the header toggle keeps the header heights; below sm it
// sits at row 1's right end, opposite the wordmark, and its OS-lock tooltip never overflows 320px.
test.describe('phase 6 header motion toggle layout', () => {
  for (const [path, dict] of cases) {
    test(`header on ${path} keeps 64px from sm and 89px below sm with the toggle`, async ({
      page,
    }) => {
      const header = page.getByRole('banner');
      const toggle = header.getByRole('button', { name: dict['motion.toggle'], exact: true });

      await page.setViewportSize({ width: 640, height: 800 });
      await page.goto(path);
      await expect(toggle).toBeVisible();
      const wide = (await header.boundingBox())?.height ?? 0;
      expect(Math.abs(wide - 64)).toBeLessThanOrEqual(1);

      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        const narrow = (await header.boundingBox())?.height ?? 0;
        expect(Math.abs(narrow - 89), `header height at ${width}`).toBeLessThanOrEqual(2);
      }
    });

    test(`at 320px ${path} puts the toggle on row 1, right-aligned`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(path);
      const header = page.getByRole('banner');
      const toggle = await header
        .getByRole('button', { name: dict['motion.toggle'], exact: true })
        .boundingBox();
      const nav = await header
        .getByRole('navigation', { name: dict['nav.label'], exact: true })
        .boundingBox();
      expect(toggle).not.toBeNull();
      expect(nav).not.toBeNull();
      expect(toggle?.y ?? Infinity).toBeLessThan(nav?.y ?? -Infinity);
      const right = (toggle?.x ?? 0) + (toggle?.width ?? 0);
      expect(320 - right).toBeLessThanOrEqual(16);
      expect(toggle?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(toggle?.height ?? 0).toBeGreaterThanOrEqual(44);
    });
  }

  test.describe('with the OS reducing motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('at 320px the ES OS-lock tooltip does not overflow', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto('/es/');
      const toggle = page
        .getByRole('banner')
        .getByRole('button', { name: es['motion.toggle'], exact: true });
      await toggle.hover();
      const tooltip = page.locator('[data-motion-tooltip]');
      await expect(tooltip).toBeVisible();
      const box = await tooltip.boundingBox();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      );
      expect(overflow).toBe(true);
    });
  });
});
