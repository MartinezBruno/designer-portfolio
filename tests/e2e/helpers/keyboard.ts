import { expect, type Page } from '@playwright/test';
import { site } from '../../../src/data/site';
import type { Dictionary } from '../../../src/i18n/ui.en';

// Keyboard helpers shared by a11y.spec.ts and keyboard-journeys.spec.ts (08-06). Not a spec file,
// so Playwright does not collect it.

/** One expected Tab stop: what the focused element must look like, and where its ring is drawn. */
export interface Step {
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

export const projectsHrefFor = (homeHref: string): string => `${homeHref}projects/`;

/** Header stops on every page: skip link, wordmark, Projects, Contact, EN, ES, motion toggle. */
export function headerSteps(
  dict: Dictionary,
  homeHref: string,
  enHref: string,
  esHref: string,
): Step[] {
  return [
    { name: dict['a11y.skipToContent'], href: '#main' },
    { name: site.name, href: homeHref },
    { name: dict['nav.projects'], href: projectsHrefFor(homeHref) },
    { name: dict['nav.contact'], href: `${homeHref}#contact` },
    { name: `EN ${dict['lang.en']}`, href: enHref },
    { name: `ES ${dict['lang.es']}`, href: esHref },
    // Phase 6 (D-16, V-16): the motion toggle is last in the header at every width.
    { name: dict['motion.toggle'], tag: 'BUTTON' },
  ];
}

/** Tab once and describe the newly focused element against one expected step (visible focus too). */
export async function tabAndExpect(page: Page, step: Step): Promise<void> {
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

/**
 * Presses Tab (or Shift+Tab) until the focused element matches `selector`, so :focus-visible is real
 * keyboard focus. Fails after `max` presses.
 */
export async function tabUntil(
  page: Page,
  selector: string,
  { max = 30, reverse = false }: { max?: number; reverse?: boolean } = {},
): Promise<void> {
  for (let presses = 0; presses < max; presses += 1) {
    await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
    const matched = await page.evaluate(
      (sel) => document.activeElement?.matches(sel) ?? false,
      selector,
    );
    if (matched) return;
  }
  throw new Error(`Tab never reached ${selector} within ${String(max)} presses`);
}
