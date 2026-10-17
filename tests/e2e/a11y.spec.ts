import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { site } from '../../src/data/site';
import tools from '../../src/data/tools.json' with { type: 'json' };
import { en, type Dictionary } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { expectedHome, expectedProjects, type ExpectedProject } from './helpers/projects';

const pages = ['/', '/es/', '/projects/', '/es/projects/', '/does-not-exist', '/es/404/'] as const;

for (const path of pages) {
  test(`${path} has zero WCAG 2.2 AA axe violations`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(violations).toEqual([]);
  });
}

// UI-SPEC keyboard order on Home: skip link, wordmark, Projects, Contact, EN, ES, hero CTA,
// invisible marquee pause toggle (button over the band), 3 project links, See all, 5 tool tiles,
// footer email, Behance. On the Projects pages: skip link, wordmark, Projects, Contact, EN, ES,
// 7 project links (newest first), footer email, Behance.
interface Step {
  name: string;
  href?: string;
  /** Asserted on top of `href`: the project detail URL shape. */
  hrefPattern?: RegExp;
  /** The focus ring is drawn on the stretched link's ::after (project tiles). */
  ringOnAfter?: boolean;
  tag?: 'BUTTON';
  role?: 'img';
}

const PROJECT_HREF = /^\/(es\/)?projects\/[a-z0-9-]+\/$/;

// TODO(phase-4): remove — detail pages land in Phase 4 (D-09)
// Project links are asserted by href, never followed: the detail pages do not exist yet.
function projectSteps(rows: readonly ExpectedProject[]): Step[] {
  return rows.map((row) => ({
    name: row.title,
    href: row.href,
    hrefPattern: PROJECT_HREF,
    ringOnAfter: true,
  }));
}

const projectsHrefFor = (homeHref: string): string => `${homeHref}projects/`;

const toolSteps: Step[] = [...tools]
  .sort((a, b) => a.order - b.order)
  .map((tool) => ({ name: tool.name, role: 'img' }));

function headerSteps(dict: Dictionary, homeHref: string, enHref: string, esHref: string): Step[] {
  return [
    { name: dict['a11y.skipToContent'], href: '#main' },
    { name: site.name, href: homeHref },
    { name: dict['nav.projects'], href: projectsHrefFor(homeHref) },
    { name: dict['nav.contact'], href: '#contact' },
    { name: `EN ${dict['lang.en']}`, href: enHref },
    { name: `ES ${dict['lang.es']}`, href: esHref },
  ];
}

function footerSteps(dict: Dictionary): Step[] {
  return [
    { name: site.email, href: `mailto:${site.email}` },
    { name: dict['footer.behance'], href: site.socials.behance },
  ];
}

function expectedOrderFor(dict: Dictionary, homeHref: string): Step[] {
  const locale = homeHref === '/' ? 'en' : 'es';
  return [
    ...headerSteps(dict, homeHref, '/', '/es/'),
    { name: dict['hero.cta'], href: '#contact' },
    { name: dict['roles.pause'], tag: 'BUTTON' },
    ...projectSteps(expectedHome(locale)),
    { name: dict['work.seeAll'], href: projectsHrefFor(homeHref) },
    ...toolSteps,
    ...footerSteps(dict),
  ];
}

function expectedProjectsOrderFor(dict: Dictionary, homeHref: string): Step[] {
  const locale = homeHref === '/' ? 'en' : 'es';
  return [
    ...headerSteps(dict, homeHref, '/projects/', '/es/projects/'),
    ...projectSteps(expectedProjects(locale)),
    ...footerSteps(dict),
  ];
}

const projectsKeyboardCases = [
  ['/projects/', en, '/'],
  ['/es/projects/', es, '/es/'],
] as const;

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
      afterOutline: getComputedStyle(el, '::after').outlineStyle,
    };
  });
  expect(focused, `expected focus on ${step.name}`).not.toBeNull();
  if (step.href !== undefined) expect(focused?.href).toBe(step.href);
  if (step.hrefPattern !== undefined) expect(focused?.href).toMatch(step.hrefPattern);
  if (step.tag !== undefined) expect(focused?.tag).toBe(step.tag);
  if (step.role !== undefined) expect(focused?.role).toBe(step.role);
  expect(focused?.name).toContain(step.name);
  if (step.ringOnAfter === true) {
    expect(focused?.afterOutline, `visible ::after ring on ${step.name}`).toBe('solid');
  } else {
    expect(focused?.outline).not.toBe('none');
  }
}

for (const [path, dict, homeHref] of keyboardCases) {
  test(`keyboard Tab order on ${path} matches the UI-SPEC with visible focus`, async ({ page }) => {
    await page.goto(path);

    for (const step of expectedOrderFor(dict, homeHref)) {
      await tabAndExpect(page, step);
    }
  });
}

for (const [path, dict, homeHref] of projectsKeyboardCases) {
  test(`keyboard Tab order on ${path} matches the UI-SPEC with visible focus`, async ({ page }) => {
    await page.goto(path);

    for (const step of expectedProjectsOrderFor(dict, homeHref)) {
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

  for (const path of ['/projects/', '/es/projects/'] as const) {
    test(`${path} has zero WCAG 2.2 AA axe violations under reduced motion`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(violations).toEqual([]);
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

// WCAG 1.4.13 persistent: pointer movement over a neighbour must not hide the focused tooltip.
for (const [path] of keyboardCases) {
  test(`focused tool tooltip persists while another tile is hovered on ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    await page.mouse.move(0, 0);

    let onTool = false;
    for (let i = 0; i < 30 && !onTool; i++) {
      await page.keyboard.press('Tab');
      onTool = await page.evaluate(() => document.activeElement?.matches('[data-tool]') ?? false);
    }
    expect(onTool, 'Tab should reach a [data-tool] tile').toBe(true);

    const tiles = page.locator('[data-tool]');
    const focusedTooltip = page.locator('[data-tool]:focus [data-tooltip]');
    await expect(focusedTooltip).toBeVisible();

    await tiles.nth(2).hover();
    await expect(tiles.nth(2).locator('[data-tooltip]')).toBeVisible();
    await expect(focusedTooltip).toBeVisible();

    await page.mouse.move(0, 0);
    await expect(focusedTooltip).toBeVisible();
    await expect(tiles.nth(2).locator('[data-tooltip]')).toBeHidden();
  });
}
