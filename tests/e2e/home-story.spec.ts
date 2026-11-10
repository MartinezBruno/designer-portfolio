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
const marqueeToggle = (page: Page) => page.locator('[data-marquee-toggle]');

/**
 * 08 WR-01 (option-a): aria-pressed exposes only the explicit choice; the visible play state
 * also includes the transient hover/focus pause. Both are always asserted. `paused` defaults to
 * `pressed` (an explicit choice, or no choice and no transient pause).
 */
async function expectBand(page: Page, pressed: boolean, paused = pressed): Promise<void> {
  await expect(marqueeToggle(page)).toHaveAttribute('aria-pressed', pressed ? 'true' : 'false');
  await expect
    .poll(() => style(copyA(page), 'animationPlayState'))
    .toBe(paused ? 'paused' : 'running');
}
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
      // 08 WR-01: the first click always pauses (even though clicking moves the pointer onto
      // the band), the next resumes, the next pauses again.
      await button.click();
      await expectBand(page, true);
      await button.click();
      await expectBand(page, false);
      await button.click();
      await expectBand(page, true);

      // Re-enter with the keyboard so the button has real :focus-visible focus. The explicit
      // pause still holds; Space and Enter flip the explicit choice.
      await page.mouse.move(0, 0);
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      expect(await button.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
      await expectBand(page, true);
      await page.keyboard.press('Space');
      await expectBand(page, false);
      await page.keyboard.press('Enter');
      await expectBand(page, true);
      await page.keyboard.press('Enter');
      await expectBand(page, false);
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

    test('marquee: hovering pauses the band visually, aria-pressed stays false', async ({
      page,
    }) => {
      await page.mouse.move(0, 0);
      await expectBand(page, false);
      await marquee(page).hover();
      await expectBand(page, false, true);
      await page.mouse.move(0, 0);
      await expectBand(page, false);
    });

    test('marquee: the first click pauses, the next click resumes', async ({ page }) => {
      const button = marqueeToggle(page);
      await page.mouse.move(0, 0);
      await marquee(page).hover();
      await expectBand(page, false, true);
      // WR-01: the first click while hovered is an explicit pause that survives leaving.
      await button.click();
      await expectBand(page, true);
      await page.mouse.move(0, 0);
      await expectBand(page, true);

      // The next click is an explicit resume that survives leaving.
      await button.click();
      await expectBand(page, false);
      await page.mouse.move(0, 0);
      await expectBand(page, false);
    });

    test('marquee: keyboard focus pauses visually with a white outline', async ({ page }) => {
      await page.mouse.move(0, 0);
      await expectBand(page, false);
      await tabUntil(page, '[data-marquee-toggle]');
      const button = marqueeToggle(page);
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
      // Inset so the outline sits inside the band and is never clipped (D-12).
      expect(outline.offset).toBe('-4px');
      // Focus alone is a transient pause: visible, but not announced as pressed (08 WR-01).
      await expectBand(page, false, true);

      // The first Space is an explicit pause, kept after focus moves on.
      await page.keyboard.press('Space');
      await expect(button).toBeFocused();
      await expectBand(page, true);
      await page.keyboard.press('Tab');
      await expectBand(page, true);

      // Back on the toggle, Space is an explicit resume, kept after focus moves on.
      await page.keyboard.press('Shift+Tab');
      await expect(button).toBeFocused();
      await page.keyboard.press('Space');
      await expectBand(page, false);
      await page.keyboard.press('Tab');
      await expectBand(page, false);
    });

    test('services: five cards in order with their bullets', async ({ page }) => {
      const section = servicesSection(page);
      await expect(section.getByRole('heading', { level: 2 })).toHaveText(dict['services.heading']);
      await expect(section.getByRole('heading', { level: 3 })).toHaveText(
        sortedServices.map((service) => service.title[locale]),
      );

      const cards = section.locator(':scope > ul > li');
      await expect(cards).toHaveCount(sortedServices.length);
      expect(sortedServices).toHaveLength(5);
      for (const [index, service] of sortedServices.entries()) {
        await expect(cards.nth(index).locator('ul > li')).toHaveText(service.items[locale]);
      }

      const branding = cards.filter({ has: page.getByRole('heading', { name: 'Branding' }) });
      await expect(branding.locator('ul > li').first()).toHaveText(
        locale === 'en' ? 'Visual identity' : 'Identidad visual',
      );
      // HOME-08 (05-07): one "Ask about this" link per card, the only interactive element.
      await expect(section.getByRole('link')).toHaveCount(sortedServices.length);
    });

    test('tools: five tools with visible names and no tab stops', async ({ page }) => {
      const section = toolsSection(page);
      const items = section.locator('[data-tool]');
      await expect(items).toHaveCount(5);
      for (const [index, name] of toolNames.entries()) {
        await expect(items.nth(index)).toHaveText(name);
        await expect(items.nth(index)).toBeVisible();
      }
      expect(await section.locator('[tabindex], a, button').count()).toBe(0);
      await expect(section.locator('[data-tooltip]')).toHaveCount(0);
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
      // Since 06-07 the accent fill sits on the moving face inside the stationary shell.
      const face = page
        .getByRole('link', { name: dict['hero.cta'] })
        .locator('[data-magnetic-face]');
      expect(await face.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
        'rgb(15, 112, 183)',
      );
    });
  });
}

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

// Phase 6 (D-14): OS reduce resolves to 'reduced'; only no-JS stays 'off'. Both are static.
async function expectStaticMarquee(
  page: Page,
  locale: 'en' | 'es',
  state: 'reduced' | 'off',
): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-motion', state);
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
        await expectStaticMarquee(page, locale, 'reduced');
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
        await expectStaticMarquee(page, locale, 'off');
        await expect(servicesSection(page).getByRole('heading', { level: 3 })).toHaveCount(
          sortedServices.length,
        );
        const items = toolsSection(page).locator('[data-tool]');
        await expect(items).toHaveCount(5);
        for (const [index, name] of toolNames.entries()) {
          await expect(items.nth(index)).toHaveText(name);
        }
      });
    });
  }
});
