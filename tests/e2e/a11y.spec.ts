import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { site } from '../../src/data/site';
import { en } from '../../src/i18n/ui.en';

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

// UI-SPEC keyboard order on Home: skip link, wordmark, Contact, EN, ES, hero CTA, footer email, Behance.
const expectedOrder = [
  { name: en['a11y.skipToContent'], href: '#main' },
  { name: site.name, href: '/' },
  { name: en['nav.contact'], href: '#contact' },
  { name: `EN ${en['lang.en']}`, href: '/' },
  { name: `ES ${en['lang.es']}`, href: '/es/' },
  { name: en['hero.cta'], href: '#contact' },
  { name: site.email, href: `mailto:${site.email}` },
  { name: en['footer.behance'], href: site.socials.behance },
] as const;

test('keyboard Tab order on / matches the UI-SPEC with visible focus', async ({ page }) => {
  await page.goto('/');

  for (const step of expectedOrder) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLAnchorElement)) return null;
      return {
        name: (el.getAttribute('aria-label') ?? el.textContent).replace(/\s+/g, ' ').trim(),
        href: el.getAttribute('href'),
        outline: getComputedStyle(el).outlineStyle,
      };
    });
    expect(focused, `expected focus on ${step.name}`).not.toBeNull();
    expect(focused?.href).toBe(step.href);
    expect(focused?.name).toContain(step.name);
    expect(focused?.outline).not.toBe('none');
  }
});
