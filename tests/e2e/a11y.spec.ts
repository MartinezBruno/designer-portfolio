import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import snapshot from '../../src/data/behance/snapshot.json' with { type: 'json' };
import { site } from '../../src/data/site';
import services from '../../src/data/services.json' with { type: 'json' };
import tools from '../../src/data/tools.json' with { type: 'json' };
import { interpolate } from '../../src/i18n/t';
import { en, type Dictionary } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import {
  expectedDetails,
  expectedHome,
  expectedProjects,
  type ExpectedDetail,
  type ExpectedProject,
} from './helpers/projects';

// Detail pages under axe: one with prose links, one with an embed, one image-led. The slugs are
// resolved through the helper (snapshot + overrides), so a renamed or hidden project fails here.
const AXE_DETAIL_SLUGS = ['website-instablogs', 'portfolio-web', 'sistema-visual'] as const;

function detailPaths(): string[] {
  return (['en', 'es'] as const).flatMap((locale) =>
    AXE_DETAIL_SLUGS.map((slug) => {
      const detail = expectedDetails(locale).find((entry) => entry.slug === slug);
      if (detail === undefined) throw new Error(`a11y: no visible project with slug "${slug}"`);
      return detail.href;
    }),
  );
}

const detailPages = detailPaths();

const pages = [
  '/',
  '/es/',
  '/projects/',
  '/es/projects/',
  '/does-not-exist',
  '/es/404/',
  ...detailPages,
];

for (const path of pages) {
  test(`${path} has zero WCAG 2.2 AA axe violations`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(violations).toEqual([]);
  });
}

// Home with the form revealed and the Turnstile test widget rendered (05-05). Needs a real token
// from challenges.cloudflare.com, hence @network.
for (const path of ['/', '/es/']) {
  test(`${path}#contact has zero WCAG 2.2 AA axe violations with the widget rendered @network`, async ({
    page,
  }) => {
    await page.goto(`${path}#contact`);
    await expect(page.locator('form[data-contact-form]')).toBeVisible();
    await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
      timeout: 15000,
    });
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(violations).toEqual([]);
  });
}

// UI-SPEC keyboard order on Home: skip link, wordmark, Projects, Contact, EN, ES, hero CTA,
// invisible marquee pause toggle (button over the band), 4 service card links, 3 project links, See all, 5 tool tiles,
// Contact section email, Behance, service radio, name, email, message (then Send message from the
// footer with Shift+Tab), footer email, Behance. On the Projects pages: skip
// link, wordmark, Projects, Contact, EN, ES, 7 project links (newest first), footer email, Behance.
interface Step {
  name: string;
  href?: string;
  /** Asserted on top of `href`: the project detail URL shape. */
  hrefPattern?: RegExp;
  /** The focus ring is drawn on the stretched link's ::after (project tiles). */
  ringOnAfter?: boolean;
  tag?: 'BUTTON' | 'INPUT' | 'TEXTAREA';
  role?: 'img';
  /** The focus ring is drawn on the control's <label> (sr-only radio chips, peer-focus-visible). */
  ringOnLabel?: boolean;
}

const PROJECT_HREF = /^\/(es\/)?projects\/[a-z0-9-]+\/$/;

// Project links are asserted by href and followed (expect 200): detail pages exist since Phase 4.
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

// HOME-08 card links (05-07): one stop per service card, in services.json `order`.
function serviceSteps(dict: Dictionary, homeHref: string): Step[] {
  const locale = homeHref === '/' ? 'en' : 'es';
  return [...services]
    .sort((a, b) => a.order - b.order)
    .map((service) => ({
      name: `${dict['services.ask']}${interpolate(dict['services.askTarget'], { title: service.title[locale] })}`,
      href: `${homeHref}?service=${service.id}#contact`,
    }));
}

function headerSteps(dict: Dictionary, homeHref: string, enHref: string, esHref: string): Step[] {
  return [
    { name: dict['a11y.skipToContent'], href: '#main' },
    { name: site.name, href: homeHref },
    { name: dict['nav.projects'], href: projectsHrefFor(homeHref) },
    { name: dict['nav.contact'], href: `${homeHref}#contact` },
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

// Home Contact section with JS (05-05): email link, socials, the service radio group (one stop,
// the checked chip), then name, email and message. The walk stops at the message: the Turnstile
// iframe's internal stops vary, so "Send message" is asserted from the footer with Shift+Tab.
function contactSteps(dict: Dictionary): Step[] {
  return [
    { name: site.email, href: `mailto:${site.email}` },
    { name: dict['footer.behance'], href: site.socials.behance },
    { name: dict['contact.service.other'], tag: 'INPUT', ringOnLabel: true },
    { name: dict['contact.name.label'], tag: 'INPUT' },
    { name: dict['contact.email.label'], tag: 'INPUT' },
    { name: dict['contact.message.label'], tag: 'TEXTAREA' },
  ];
}

function expectedOrderFor(dict: Dictionary, homeHref: string): Step[] {
  const locale = homeHref === '/' ? 'en' : 'es';
  return [
    ...headerSteps(dict, homeHref, '/', '/es/'),
    { name: dict['hero.cta'], href: `${homeHref}#contact` },
    { name: dict['roles.pause'], tag: 'BUTTON' },
    ...serviceSteps(dict, homeHref),
    ...projectSteps(expectedHome(locale)),
    { name: dict['work.seeAll'], href: projectsHrefFor(homeHref) },
    ...toolSteps,
    ...contactSteps(dict),
  ];
}

// Tail of the Home order: Shift+Tab from the footer email reaches "Send message"; Tab, Tab then
// returns to the footer email and Behance.
async function expectContactTail(page: Page, dict: Dictionary): Promise<void> {
  await page.getByRole('contentinfo').getByRole('link', { name: site.email, exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: dict['contact.submit'] })).toBeFocused();
  for (const step of footerSteps(dict)) {
    await tabAndExpect(page, step);
  }
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
    // Accessible name: aria-labelledby target, else aria-label, else <label for>, else text.
    const labelledBy = el.getAttribute('aria-labelledby');
    const label =
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
        ? (el.labels?.[0] ?? null)
        : null;
    const raw =
      (labelledBy ? document.getElementById(labelledBy)?.textContent : null) ??
      el.getAttribute('aria-label') ??
      label?.textContent ??
      el.textContent;
    return {
      tag: el.tagName,
      role: el.getAttribute('role'),
      href: el.getAttribute('href'),
      name: raw.replace(/\s+/g, ' ').trim(),
      outline: getComputedStyle(el).outlineStyle,
      afterOutline: getComputedStyle(el, '::after').outlineStyle,
      labelOutline: label ? getComputedStyle(label).outlineStyle : null,
    };
  });
  expect(focused, `expected focus on ${step.name}`).not.toBeNull();
  if (step.href !== undefined) expect(focused?.href).toBe(step.href);
  if (step.hrefPattern !== undefined) {
    expect(focused?.href).toMatch(step.hrefPattern);
    // Project links open real detail pages (Phase 4 closed the Phase 3 D-09 skip).
    const response = await page.request.get(focused?.href ?? '');
    expect(response.status(), `${step.name} resolves`).toBe(200);
  }
  if (step.tag !== undefined) expect(focused?.tag).toBe(step.tag);
  if (step.role !== undefined) expect(focused?.role).toBe(step.role);
  expect(focused?.name).toContain(step.name);
  if (step.ringOnLabel === true) {
    expect(focused?.labelOutline, `visible label ring on ${step.name}`).toBe('solid');
  } else if (step.ringOnAfter === true) {
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
    // The service radio group is one stop: the next Tab already left the chips.
    await expect(page.locator('input[name="service"]:focus')).toHaveCount(0);
    await expectContactTail(page, dict);
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

// Detail-page keyboard order (UI-SPEC): header, View on Behance, then the module stack in module
// order (prose links, facade button, facade fallback link, unknown-module links), the contact
// button, Previous, the next tile, footer. One page with an embed, one with a prose link.
const KEYBOARD_DETAIL_SLUGS = ['portfolio-web', 'website-instablogs'] as const;

function detailFor(locale: 'en' | 'es', slug: string): ExpectedDetail {
  const detail = expectedDetails(locale).find((entry) => entry.slug === slug);
  if (detail === undefined) throw new Error(`a11y: no visible project with slug "${slug}"`);
  return detail;
}

const decodeEntities = (text: string): string =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

/** Focus stops inside the module stack, derived from the snapshot's module order. */
function moduleSteps(dict: Dictionary, detail: ExpectedDetail): Step[] {
  const source = snapshot.projects.find((project) => project.url === detail.behanceUrl);
  if (source === undefined) throw new Error(`a11y: no snapshot project for ${detail.href}`);
  return source.content.flatMap((entry): Step[] => {
    if (entry.kind === 'text' && 'html' in entry) {
      return [...entry.html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(
        (match) => ({
          name: decodeEntities((match[2] ?? '').replace(/<[^>]+>/g, '')).trim(),
          href: decodeEntities(match[1] ?? ''),
        }),
      );
    }
    if (entry.kind === 'embed') {
      return [
        { name: dict['detail.embed.load'], tag: 'BUTTON' },
        { name: dict['detail.embed.fallback'], href: detail.behanceUrl },
      ];
    }
    if (entry.kind === 'unknown') {
      return [{ name: dict['detail.unknown.link'], href: detail.behanceUrl }];
    }
    return [];
  });
}

function expectedDetailOrderFor(dict: Dictionary, locale: 'en' | 'es', slug: string): Step[] {
  const homeHref = locale === 'en' ? '/' : '/es/';
  const detail = detailFor(locale, slug);
  const steps: Step[] = [
    ...headerSteps(dict, homeHref, detailFor('en', slug).href, detailFor('es', slug).href),
    { name: dict['detail.viewOnBehance'], href: detail.behanceUrl },
    ...moduleSteps(dict, detail),
    { name: dict['detail.cta.button'], href: `${homeHref}#contact` },
  ];
  if (detail.previous !== null) {
    steps.push({ name: dict['detail.previous'], href: detail.previous.href });
  }
  if (detail.next !== null) {
    steps.push({ name: detail.next.title, href: detail.next.href, ringOnAfter: true });
  }
  return [...steps, ...footerSteps(dict)];
}

const detailKeyboardCases = (['en', 'es'] as const).flatMap((locale) =>
  KEYBOARD_DETAIL_SLUGS.map((slug) => ({
    locale,
    slug,
    dict: locale === 'en' ? en : es,
    href: detailFor(locale, slug).href,
  })),
);

for (const { locale, slug, dict, href } of detailKeyboardCases) {
  test(`keyboard Tab order on ${href} matches the UI-SPEC with visible focus`, async ({ page }) => {
    await page.goto(href);

    for (const step of expectedDetailOrderFor(dict, locale, slug)) {
      await tabAndExpect(page, step);
    }
  });
}

// axe after the facade swaps in the iframe. Figma is stubbed locally: no real network.
const FIGMA_STUB =
  '<!doctype html><html lang="en"><head><title>Prototype stub</title></head><body><main><p>stub</p></main></body></html>';

async function activateFacade(page: Page, dict: Dictionary): Promise<void> {
  await page.route('https://embed.figma.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: FIGMA_STUB }),
  );
  await page.getByRole('button', { name: dict['detail.embed.load'] }).click();
  await expect(page.locator('[data-embed-facade] iframe')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('IFRAME');
}

const embedAxeCases = (['en', 'es'] as const).flatMap((locale) =>
  expectedDetails(locale)
    .filter((detail) => detail.hasEmbed)
    .map((detail) => ({ href: detail.href, dict: locale === 'en' ? en : es })),
);

test('at least one detail page carries an embed for the activation axe run', () => {
  expect(embedAxeCases.length).toBeGreaterThanOrEqual(2);
});

for (const { href, dict } of embedAxeCases) {
  test(`${href} has zero WCAG 2.2 AA axe violations after loading the prototype`, async ({
    page,
  }) => {
    await page.goto(href);
    await activateFacade(page, dict);
    const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(violations).toEqual([]);
  });
}

test.describe('with prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const { href, dict } of embedAxeCases) {
    test(`${href} has zero axe violations after loading the prototype under reduced motion`, async ({
      page,
    }) => {
      await page.goto(href);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
      await activateFacade(page, dict);
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(violations).toEqual([]);
    });
  }

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
      await expectContactTail(page, dict);
    });
  }

  for (const path of ['/projects/', '/es/projects/', ...detailPages]) {
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
