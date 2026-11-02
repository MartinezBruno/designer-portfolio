import { expect, test, type Page } from '@playwright/test';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { softNavigate } from './helpers/navigation';

// Phase 7 motion-state continuity across soft navigation (07 D-04, D-05; Research Pitfalls 1, 2, 9).

declare global {
  interface Window {
    __marker?: number;
    __pressedAfterSwap?: (string | null)[];
    __vtAnimations?: { pseudo: string; duration: number }[];
    __vtNames?: string[];
  }
}

/**
 * Wraps `document.startViewTransition` (07-02) and, once the pseudo tree exists (`ready`),
 * records every view-transition animation (pseudo-element and duration in ms) plus the names
 * assigned in the arriving document.
 */
async function recordViewTransitions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__vtAnimations = [];
    window.__vtNames = [];
    const original = document.startViewTransition?.bind(document);
    if (original === undefined) return;
    document.startViewTransition = ((callback?: ViewTransitionUpdateCallback) => {
      const transition = original(callback);
      void transition.ready
        .then(() => {
          for (const animation of document.getAnimations()) {
            const effect = animation.effect;
            if (!(effect instanceof KeyframeEffect)) continue;
            const pseudo = effect.pseudoElement ?? '';
            if (!pseudo.startsWith('::view-transition')) continue;
            window.__vtAnimations?.push({
              pseudo,
              duration: Number(effect.getComputedTiming().duration),
            });
          }
          for (const element of document.querySelectorAll('*')) {
            const name = getComputedStyle(element).viewTransitionName;
            if (name !== '' && name !== 'none') window.__vtNames?.push(name);
          }
        })
        .catch(() => undefined);
      return transition;
    }) as typeof document.startViewTransition;
  });
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

// Records the toggle's aria-pressed the moment each new document is swapped in, before any
// page-load init can correct it (Pitfall 2: a wrong value there paints the wrong icon).
async function recordPressedAfterSwap(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__pressedAfterSwap = [];
    document.addEventListener('astro:after-swap', () => {
      window.__pressedAfterSwap?.push(
        document.querySelector('[data-motion-toggle]')?.getAttribute('aria-pressed') ?? null,
      );
    });
  });
}

test.describe('reduced motion survives soft navigation', () => {
  test.use({ reducedMotion: 'reduce' });

  test('three soft navigations keep data-motion reduced and the toggle pressed', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await recordPressedAfterSwap(page);
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-motion', 'reduced');
    await page.evaluate(() => {
      window.__marker = 1;
    });

    const nav = page.getByRole('navigation', { name: en['nav.label'], exact: true });
    await softNavigate(page, nav.getByRole('link', { name: en['nav.projects'], exact: true }));
    await expect(html).toHaveAttribute('data-motion', 'reduced');
    await expect(page.locator('main h1')).toBeFocused();

    await softNavigate(
      page,
      page.getByRole('banner').getByRole('link', { name: 'Martina Fernandez' }),
    );
    await expect(html).toHaveAttribute('data-motion', 'reduced');
    await expect(page.locator('main h1')).toBeFocused();

    const language = page.getByRole('navigation', { name: en['lang.label'], exact: true });
    // The link's name is "ES Español" (visible code plus language name), as in i18n.spec.
    await softNavigate(page, language.getByRole('link', { name: en['lang.es'] }));
    await expect(html).toHaveAttribute('data-motion', 'reduced');
    await expect(html).toHaveAttribute('lang', 'es');
    await expect(page.locator('main h1')).toBeFocused();
    await expect(
      page.getByRole('button', { name: es['motion.toggle'], exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');

    expect(await page.evaluate(() => window.__marker)).toBe(1);
    expect(await page.evaluate(() => window.__pressedAfterSwap ?? [])).toEqual([
      'true',
      'true',
      'true',
    ]);
    expect(errors).toEqual([]);
  });
});

test.describe('reduced navigation is a root crossfade (D-04)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('no panel, no title morph, roots fade over 320ms, header named still', async ({ page }) => {
    await recordViewTransitions(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    const nav = page.getByRole('navigation', { name: en['nav.label'], exact: true });
    await softNavigate(page, nav.getByRole('link', { name: en['nav.projects'], exact: true }));

    const animations = await page.evaluate(() => window.__vtAnimations ?? []);
    const names = await page.evaluate(() => window.__vtNames ?? []);
    const pseudos = animations.map((entry) => entry.pseudo);
    expect(pseudos.some((pseudo) => pseudo.includes('wipe'))).toBe(false);
    expect(pseudos.some((pseudo) => pseudo.includes('project-title'))).toBe(false);
    expect(pseudos.some((pseudo) => pseudo.includes('site-header'))).toBe(false);
    expect(names).not.toContain('wipe');
    expect(names).toContain('site-header');

    const roots = animations.filter(
      (entry) =>
        entry.pseudo === '::view-transition-old(root)' ||
        entry.pseudo === '::view-transition-new(root)',
    );
    // The UA pairs each root fade with a blend-mode animation; both take the same duration.
    expect([...new Set(roots.map((entry) => entry.pseudo))].sort()).toEqual([
      '::view-transition-new(root)',
      '::view-transition-old(root)',
    ]);
    for (const entry of roots) expect(entry.duration).toBe(320);
  });
});

test.describe('motion off keeps full page loads', () => {
  test('without matchMedia a link click reloads the document', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await page.evaluate(() => {
      window.__marker = 1;
    });

    const nav = page.getByRole('navigation', { name: en['nav.label'], exact: true });
    await softNavigate(page, nav.getByRole('link', { name: en['nav.projects'], exact: true }));
    await expect(page).toHaveURL(/\/projects\/$/);
    expect(await page.evaluate(() => window.__marker)).toBeUndefined();
    const navigationName = await page.evaluate(
      () => performance.getEntriesByType('navigation')[0]?.name ?? '',
    );
    expect(navigationName).toMatch(/\/projects\/$/);
  });
});
