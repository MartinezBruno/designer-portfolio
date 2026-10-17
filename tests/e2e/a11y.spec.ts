import { expect, test } from '@playwright/test';
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
// marquee pause button, 5 tool tiles, footer email, Behance.
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

for (const [path, dict, homeHref] of keyboardCases) {
  test(`keyboard Tab order on ${path} matches the UI-SPEC with visible focus`, async ({ page }) => {
    await page.goto(path);

    for (const step of expectedOrderFor(dict, homeHref)) {
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
  });
}
