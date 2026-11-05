import { expect, test, type Page } from '@playwright/test';
import { openContactForm } from './helpers/contact';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

// Phase 6 header motion toggle (MOTN-08, D-15..D-18; VALIDATION V-14, V-15).

const STORAGE_KEY = 'motion-preference';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

declare global {
  interface Window {
    __marker?: number;
    __motionWrites?: string[];
  }
}

// Records every value written to html[data-motion] from the first script on. The parser's own
// data-motion="off" is not a mutation, so a pre-paint gate leaves exactly one entry.
async function recordMotionWrites(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__motionWrites = [];
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.target instanceof HTMLElement && record.target === document.documentElement) {
          window.__motionWrites?.push(record.target.dataset['motion'] ?? '');
        }
      }
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-motion'] });
  });
}

const motionWrites = (page: Page): Promise<string[]> =>
  page.evaluate(() => window.__motionWrites ?? []);

test.describe('motion toggle switches live and persists', () => {
  test('reduces motion without a reload, keeps a typed message and persists pre-paint', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await recordMotionWrites(page);
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-motion', 'on');
    await page.evaluate(() => {
      window.__marker = 1;
    });

    // 07-15: the form controller loads on demand, so bring the form up before typing.
    await openContactForm(page);
    const message = page.getByLabel(en['contact.message.label'], { exact: true });
    await message.fill('Half a thought about a new logo');

    const toggle = page.getByRole('button', { name: en['motion.toggle'], exact: true });
    await toggle.click();
    await expect(html).toHaveAttribute('data-motion', 'reduced');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.__marker)).toBe(1);
    await expect(message).toHaveValue('Half a thought about a new logo');
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe('reduced');

    await page.goto('/projects/');
    await expect(html).toHaveAttribute('data-motion', 'reduced');
    expect(await motionWrites(page)).toEqual(['reduced']);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await toggle.click();
    await expect(html).toHaveAttribute('data-motion', 'on');
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
    await page.goto('/');
    expect(await motionWrites(page)).toEqual(['on']);
    expect(errors).toEqual([]);
  });

  test('keyboard Enter and Space toggle the state', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: en['motion.toggle'], exact: true });
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await page.keyboard.press('Space');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
  });

  test('ES header names the toggle in Spanish', async ({ page }) => {
    await page.goto('/es/');
    const toggle = page.getByRole('button', { name: es['motion.toggle'], exact: true });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('motion toggle storage safety', () => {
  test('storage: a tampered value resolves to on and never reaches the DOM', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, '<img src=x>');
    }, STORAGE_KEY);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    expect(await page.content()).not.toContain('<img src=x>');
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
  });

  test('storage: blocked localStorage falls back to the OS and the toggle still works', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-motion', 'on');
    const toggle = page.getByRole('button', { name: en['motion.toggle'], exact: true });
    await toggle.click();
    await expect(html).toHaveAttribute('data-motion', 'reduced');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(html).toHaveAttribute('data-motion', 'on');
    expect(errors).toEqual([]);
  });
});

test.describe('motion toggle when the OS reduces motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const [path, dict] of [
    ['/', en],
    ['/es/', es],
  ] as const) {
    test(`${path} locks the toggle, ignores clicks and shows the OS hint`, async ({ page }) => {
      await page.goto(path);
      const html = page.locator('html');
      const toggle = page.getByRole('button', { name: dict['motion.toggle'], exact: true });
      await expect(html).toHaveAttribute('data-motion', 'reduced');
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(toggle).toHaveAttribute('aria-disabled', 'true');
      await expect(toggle).toHaveAttribute('aria-describedby', 'motion-toggle-hint');
      await expect(page.locator('#motion-toggle-hint')).toHaveText(dict['motion.osLocked']);

      // force: Playwright treats aria-disabled as not enabled; a real click must still do nothing.
      await toggle.click({ force: true });
      await expect(html).toHaveAttribute('data-motion', 'reduced');
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();

      const tooltip = page.locator('[data-motion-tooltip]');
      await toggle.hover();
      await expect(tooltip).toBeVisible();
      await expect(tooltip.getByText(dict['motion.osLocked'], { exact: true })).toBeVisible();
      await expect(tooltip.getByText(dict['motion.toggle'], { exact: true })).toBeHidden();
    });
  }

  test('Escape hides the tooltip while focus stays', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: en['motion.toggle'], exact: true });
    const tooltip = page.locator('[data-motion-tooltip]');
    await toggle.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(toggle).toBeFocused();
    await expect(tooltip).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
    await expect(toggle).toBeFocused();
  });
});
