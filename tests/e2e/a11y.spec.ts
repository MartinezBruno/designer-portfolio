import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { site } from '../../src/data/site';
import tools from '../../src/data/tools.json' with { type: 'json' };
import { en, type Dictionary } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

const pages = ['/', '/es/', '/does-not-exist', '/es/404/'] as const;

for (const path of pages) {
  test(`${path} has zero WCAG 2.2 AA axe violations`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(violations).toEqual([]);
  });
}

// UI-SPEC keyboard order on Home: skip link, wordmark, Contact, EN, ES, hero CTA,
// invisible marquee pause toggle (button over the band), 5 tool tiles, footer email, Behance.
interface Step {
  name: string;
  href?: string;
  tag?: 'BUTTON';
  role?: 'img';
}

const toolSteps: Step[] = [...tools]
  .sort((a, b) => a.order - b.order)
  .map((tool) => ({ name: tool.name, role: 'img' }));

function expectedOrderFor(dict: Dictionary, homeHref: string): Step[] {
  return [
    { name: dict['a11y.skipToContent'], href: '#main' },
    { name: site.name, href: homeHref },
    { name: dict['nav.contact'], href: '#contact' },
    { name: `EN ${dict['lang.en']}`, href: '/' },
    { name: `ES ${dict['lang.es']}`, href: '/es/' },
    { name: dict['hero.cta'], href: '#contact' },
    { name: dict['roles.pause'], tag: 'BUTTON' },
    ...toolSteps,
    { name: site.email, href: `mailto:${site.email}` },
    { name: dict['footer.behance'], href: site.socials.behance },
  ];
}

const keyboardCases = [
  ['/', en, '/'],
  ['/es/', es, '/es/'],
] as const;

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Tab once and describe the newly focused element against one expected step.
async function tabAndExpect(page: Page, step: Step): Promise<void> {
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return null;
    // Accessible name: aria-labelledby target, else aria-label, else text content.
    const labelledBy = el.getAttribute('aria-labelledby');
    const raw =
      (labelledBy ? document.getElementById(labelledBy)?.textContent : null) ??
      el.getAttribute('aria-label') ??
      el.textContent;
    return {
      tag: el.tagName,
      role: el.getAttribute('role'),
      href: el.getAttribute('href'),
      name: raw.replace(/\s+/g, ' ').trim(),
      outline: getComputedStyle(el).outlineStyle,
    };
  });
  expect(focused, `expected focus on ${step.name}`).not.toBeNull();
  if (step.href !== undefined) expect(focused?.href).toBe(step.href);
  if (step.tag !== undefined) expect(focused?.tag).toBe(step.tag);
  if (step.role !== undefined) expect(focused?.role).toBe(step.role);
  expect(focused?.name).toContain(step.name);
  expect(focused?.outline).not.toBe('none');
}

for (const [path, dict, homeHref] of keyboardCases) {
  test(`keyboard Tab order on ${path} matches the UI-SPEC with visible focus`, async ({ page }) => {
    await page.goto(path);

    for (const step of expectedOrderFor(dict, homeHref)) {
      await tabAndExpect(page, step);
    }
  });
}

test.describe('with prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const [path, dict, homeHref] of keyboardCases) {
    test(`${path} has zero WCAG 2.2 AA axe violations under reduced motion`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(violations).toEqual([]);
    });

    test(`reduced-motion keyboard Tab order on ${path} skips the pause button`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
      await expect(page.locator('[data-marquee-toggle]')).toBeHidden();

      // With motion off the pause button is display:none, so it drops out of the order.
      const steps = expectedOrderFor(dict, homeHref).filter((step) => step.tag !== 'BUTTON');
      for (const step of steps) {
        await tabAndExpect(page, step);
      }
    });
  }
});

for (const [path] of keyboardCases) {
  test(`axe stays clean with a tool tooltip open on ${path}`, async ({ page }) => {
    await page.goto(path);

    let onTool = false;
    for (let i = 0; i < 30 && !onTool; i++) {
      await page.keyboard.press('Tab');
      onTool = await page.evaluate(() => document.activeElement?.matches('[data-tool]') ?? false);
    }
    expect(onTool, 'Tab should reach a [data-tool] tile').toBe(true);

    const tooltip = page.locator('[data-tool]:focus [data-tooltip]');
    await expect(tooltip).toBeVisible();

    const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(violations).toEqual([]);
  });
}
