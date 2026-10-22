import { expect, test, type Locator, type Page } from '@playwright/test';
import profile from '../../src/data/profile.json' with { type: 'json' };
import roles from '../../src/data/roles.json' with { type: 'json' };
import services from '../../src/data/services.json' with { type: 'json' };
import tools from '../../src/data/tools.json' with { type: 'json' };
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

// The JSON files are the source of truth (D-03..D-13); the page must mirror them per locale.
const sortedRoles = [...roles].sort((a, b) => a.order - b.order);
const sortedServices = [...services].sort((a, b) => a.order - b.order);
const sortedTools = [...tools].sort((a, b) => a.order - b.order);
const toolNames = sortedTools.map((tool) => tool.name);

const cases = [
  ['/', en, 'en'],
  ['/es/', es, 'es'],
] as const;

const INK = 'rgb(26, 23, 20)';
const SURFACE = 'rgb(250, 247, 242)';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Presses Tab until the focused element matches `selector`, so :focus-visible is real keyboard focus. */
async function tabUntil(page: Page, selector: string): Promise<void> {
  for (let presses = 0; presses < 30; presses += 1) {
    await page.keyboard.press('Tab');
    const matched = await page.evaluate(
      (sel) => document.activeElement?.matches(sel) ?? false,
      selector,
    );
    if (matched) return;
  }
  throw new Error(`Tab never reached ${selector} within 30 presses`);
}

const style = (locator: Locator, prop: 'animationName' | 'animationPlayState'): Promise<string> =>
  locator.evaluate((el, key) => getComputedStyle(el)[key], prop);

const marquee = (page: Page) => page.locator('[data-marquee]');
const copyA = (page: Page) => page.locator('[data-marquee] ul:not([aria-hidden])').first();
const copyB = (page: Page) => page.locator('[data-marquee] ul[aria-hidden="true"]');
const servicesSection = (page: Page) => page.locator('section[aria-labelledby="services-title"]');
const toolsSection = (page: Page) => page.locator('section[aria-labelledby="tools-title"]');

for (const [path, dict, locale] of cases) {
  test.describe(`home story on ${path}`, () => {
    let errors: string[] = [];

    test.beforeEach(async ({ page }) => {
      errors = collectErrors(page);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    });

    test.afterEach(() => {
      expect(errors).toEqual([]);
    });

    test('roles: each role is announced once, in order', async ({ page }) => {
      const band = marquee(page);
      await expect(
        band.getByRole('heading', { level: 2, name: dict['roles.heading'] }),
      ).toHaveCount(1);
      await expect(band.getByRole('listitem')).toHaveText(
        sortedRoles.map((role) => role.label[locale]),
      );
    });

    test('marquee: animates and the invisible band toggle pauses it', async ({ page }) => {
      const band = marquee(page);
      await expect(copyB(page)).toBeVisible();
      expect(await style(copyA(page), 'animationName')).toBe('marquee');
      expect(await style(copyA(page), 'animationPlayState')).toBe('running');

      const button = page.getByRole('button', { name: dict['roles.pause'] });
      // No visible play/pause icon: the toggle is an empty, transparent overlay on the band.
      await expect(button.locator('svg')).toHaveCount(0);
      expect(await button.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
        'rgba(0, 0, 0, 0)',
      );
      const [bandBox, buttonBox] = await Promise.all([band.boundingBox(), button.boundingBox()]);
      expect(buttonBox?.width).toBe(bandBox?.width);
      expect(buttonBox?.height).toBe(bandBox?.height);
      expect(buttonBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      // WR-01: the visible play state must match aria-pressed while the pointer is still over
      // the band and the button still has focus (hover/focus must not contradict the toggle).
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(() => style(copyA(page), 'animationPlayState')).toBe('paused');
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(() => style(copyA(page), 'animationPlayState')).toBe('running');
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(() => style(copyA(page), 'animationPlayState')).toBe('paused');

      // Re-enter with the keyboard so the button has real :focus-visible focus.
      await page.mouse.move(0, 0);
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      expect(await button.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
      await page.keyboard.press('Space');
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(() => style(copyA(page), 'animationPlayState')).toBe('running');
      await page.keyboard.press('Enter');
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(() => style(copyA(page), 'animationPlayState')).toBe('paused');
      await page.keyboard.press('Enter');
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(() => style(copyA(page), 'animationPlayState')).toBe('running');
      await expect(button).toHaveAttribute('aria-label', dict['roles.pause']);

      // D-16: white role text on the accent band.
      expect(await band.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
        'rgb(15, 112, 183)',
      );
      const firstRole = band.getByRole('listitem').first();
      expect(await firstRole.evaluate((el) => getComputedStyle(el).color)).toBe(
        'rgb(255, 255, 255)',
      );
    });

    test('marquee: hovering the band pauses the animation', async ({ page }) => {
      await page.mouse.move(0, 0);
      expect(await style(copyA(page), 'animationPlayState')).toBe('running');
      await marquee(page).hover();
      await expect.poll(() => style(copyA(page), 'animationPlayState')).toBe('paused');
      await page.mouse.move(0, 0);
      await expect.poll(() => style(copyA(page), 'animationPlayState')).toBe('running');
    });

    test('marquee: keyboard focus pauses the band and shows a white outline', async ({ page }) => {
      await page.mouse.move(0, 0);
      expect(await style(copyA(page), 'animationPlayState')).toBe('running');
      await tabUntil(page, '[data-marquee-toggle]');
      const button = page.locator('[data-marquee-toggle]');
      const outline = await button.evaluate((el) => {
        const computed = getComputedStyle(el);
        return {
          style: computed.outlineStyle,
          color: computed.outlineColor,
          offset: computed.outlineOffset,
        };
      });
      expect(outline.style).not.toBe('none');
      expect(outline.color).toBe('rgb(255, 255, 255)');
      // Inset so the outline sits inside the band and is never clipped.
      expect(outline.offset).toBe('-4px');
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(() => style(copyA(page), 'animationPlayState')).toBe('paused');

      await page.keyboard.press('Tab');
      await expect.poll(() => style(copyA(page), 'animationPlayState')).toBe('running');
    });

    test('tools: tiles invert colors on hover and keyboard focus', async ({ page }) => {
      const tiles = toolsSection(page).locator('[data-tool]');
      const colors = (index: number) =>
        tiles.nth(index).evaluate((el) => {
          const computed = getComputedStyle(el);
          return { bg: computed.backgroundColor, fg: computed.color };
        });

      await page.mouse.move(0, 0);
      expect(await colors(2)).toEqual({ bg: SURFACE, fg: INK });
      await tiles.nth(2).hover();
      await expect.poll(() => colors(2)).toEqual({ bg: INK, fg: SURFACE });
      await page.mouse.move(0, 0);
      await expect.poll(() => colors(2)).toEqual({ bg: SURFACE, fg: INK });

      await tabUntil(page, '[data-tool]');
      await expect.poll(() => colors(0)).toEqual({ bg: INK, fg: SURFACE });
      // Esc hides the tooltip, so the tile returns to its resting colors.
      await page.keyboard.press('Escape');
      await expect.poll(() => colors(0)).toEqual({ bg: SURFACE, fg: INK });
    });

    test('services: four cards in order with their bullets', async ({ page }) => {
      const section = servicesSection(page);
      await expect(section.getByRole('heading', { level: 2 })).toHaveText(dict['services.heading']);
      await expect(section.getByRole('heading', { level: 3 })).toHaveText(
        sortedServices.map((service) => service.title[locale]),
      );

      const cards = section.locator(':scope > ul > li');
      await expect(cards).toHaveCount(4);
      for (const [index, service] of sortedServices.entries()) {
        await expect(cards.nth(index).locator('ul > li')).toHaveText(service.items[locale]);
      }

      const branding = cards.filter({ has: page.getByRole('heading', { name: 'Branding' }) });
      await expect(branding.locator('ul > li').first()).toHaveText(
        locale === 'en' ? 'Visual identity' : 'Identidad visual',
      );
      // HOME-08 (05-07): one "Ask about this" link per card, the only interactive element.
      await expect(section.getByRole('link')).toHaveCount(4);
    });

    test('tools: five icon-only tiles named by brand', async ({ page }) => {
      const section = toolsSection(page);
      await expect(section.getByRole('img')).toHaveCount(5);
      for (const name of toolNames) {
        await expect(section.getByRole('img', { name, exact: true })).toHaveCount(1);
      }

      const tooltips = section.locator('[data-tooltip]');
      for (let index = 0; index < 5; index += 1) {
        await expect(tooltips.nth(index)).toBeHidden();
      }

      // Keyboard focus shows the tooltip; Esc hides it while focus stays (WCAG 1.4.13).
      const tiles = section.locator('[data-tool]');
      await tabUntil(page, '[data-tool]');
      await expect(tooltips.first()).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(tooltips.first()).toBeHidden();
      expect(await tiles.first().evaluate((el) => el === document.activeElement)).toBe(true);

      // Hover shows it, and hovering the tooltip itself keeps it open.
      await tiles.nth(2).hover();
      await expect(tooltips.nth(2)).toBeVisible();
      await tooltips.nth(2).hover();
      await expect(tooltips.nth(2)).toBeVisible();

      const bubble = tooltips.nth(2).locator('span').first();
      expect(await bubble.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(INK);
    });

    test('availability: badge follows profile.json', async ({ page }) => {
      const hero = page.locator('section[aria-labelledby="hero-title"]');
      const badge = hero.getByText(dict['availability.open'], { exact: true });
      if (!profile.availability.available) {
        await expect(badge).toHaveCount(0);
        return;
      }
      await expect(badge).toBeVisible();
      // The badge is a plain line in the action row, after the CTA: no pill, no eyebrow.
      const cta = hero.getByRole('link', { name: dict['hero.cta'] });
      const badgeAfterCta = await cta.evaluate((link, badgeText) => {
        const badgeEl = [...document.querySelectorAll('#main p')].find(
          (p) => p.textContent.trim() === badgeText,
        );
        if (!badgeEl) return false;
        return Boolean(link.compareDocumentPosition(badgeEl) & Node.DOCUMENT_POSITION_FOLLOWING);
      }, dict['availability.open']);
      expect(badgeAfterCta).toBe(true);
      const look = await badge.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          bg: style.backgroundColor,
          radius: style.borderTopLeftRadius,
          pad: style.paddingLeft,
        };
      });
      expect(look).toEqual({ bg: 'rgba(0, 0, 0, 0)', radius: '0px', pad: '0px' });
    });

    test('accent: hero CTA uses the client primary color', async ({ page }) => {
      const cta = page.getByRole('link', { name: dict['hero.cta'] });
      expect(await cta.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
        'rgb(15, 112, 183)',
      );
    });
  });
}

test.describe('tools tap on touch', () => {
  test.use({ hasTouch: true });

  test('tools: tap toggles one tooltip at a time', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    const section = toolsSection(page);
    const tiles = section.locator('[data-tool]');
    const tooltips = section.locator('[data-tooltip]');

    await tiles.nth(0).tap();
    await expect(tiles.nth(0)).toHaveAttribute('data-open', '');
    await expect(tooltips.nth(0)).toBeVisible();

    await tiles.nth(1).tap();
    await expect(tiles.nth(1)).toHaveAttribute('data-open', '');
    await expect(tiles.nth(0)).not.toHaveAttribute('data-open');
    await expect(tooltips.nth(1)).toBeVisible();
    // The open (tapped) tile is inverted like on hover and focus.
    await expect
      .poll(() => tiles.nth(1).evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(INK);
    expect(errors).toEqual([]);
  });
});

test.describe('marquee tap on touch', () => {
  test.use({ hasTouch: true });

  test('marquee: tapping the band toggles the pause state', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    const band = marquee(page);
    const toggle = page.locator('[data-marquee-toggle]');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await band.tap();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(band).toHaveAttribute('data-paused', '');
    await expect.poll(() => style(copyA(page), 'animationPlayState')).toBe('paused');

    await band.tap();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(band).not.toHaveAttribute('data-paused');
    expect(errors).toEqual([]);
  });
});

async function expectStaticMarquee(page: Page, locale: 'en' | 'es'): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await expect(copyB(page)).toBeHidden();
  await expect(page.locator('[data-marquee-toggle]')).toBeHidden();
  expect(await style(copyA(page), 'animationName')).toBe('none');
  const items = marquee(page).getByRole('listitem');
  await expect(items).toHaveText(sortedRoles.map((role) => role.label[locale]));
  for (let index = 0; index < sortedRoles.length; index += 1) {
    await expect(items.nth(index)).toBeVisible();
  }
}

test.describe('static marquee with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const [path, , locale] of cases) {
    test.describe(path, () => {
      test('static: reduced motion shows one list without button', async ({ page }) => {
        const errors = collectErrors(page);
        await page.goto(path);
        await expectStaticMarquee(page, locale);
        expect(errors).toEqual([]);
      });
    });
  }
});

test.describe('static marquee without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const [path, , locale] of cases) {
    test.describe(path, () => {
      test('static: no-JS shows roles, services and tool names', async ({ page }) => {
        await page.goto(path);
        await expectStaticMarquee(page, locale);
        await expect(servicesSection(page).getByRole('heading', { level: 3 })).toHaveCount(4);
        await expect(toolsSection(page).getByRole('img')).toHaveCount(5);
        for (const name of toolNames) {
          await expect(toolsSection(page).getByRole('img', { name, exact: true })).toHaveCount(1);
        }
      });
    });
  }
});
