import { expect, test, type Page } from '@playwright/test';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { softNavigate } from './helpers/navigation';

// Phase 7 motion-state continuity across soft navigation (07 D-04, D-05; Research Pitfalls 1, 2, 9).

declare global {
  interface Window {
    __marker?: number;
    __pressedAfterSwap?: (string | null)[];
  }
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
