import { expect, test, type Page } from '@playwright/test';
import { en } from '../../src/i18n/ui.en';
import { openContactForm } from './helpers/contact';
import { settleMotion } from './helpers/motion';
import { softNavigate } from './helpers/navigation';

// 07-15: the contact form controller is not in the eager bundle. It loads when #contact nears the
// viewport, on focus or press inside it, or at once for #contact / ?service=. Until then the
// mailto block stays visible (CONT-05).

declare global {
  interface Window {
    __turnstileRenders?: number;
  }
}

// Hermetic Turnstile: answers the script request locally with a fake API whose render() leaves
// one marker child in the slot, so the test can count widgets without calling Cloudflare.
const FAKE_TURNSTILE = `window.turnstile = {
  render(el) {
    window.__turnstileRenders = (window.__turnstileRenders || 0) + 1;
    const host = typeof el === 'string' ? document.querySelector(el) : el;
    const widget = document.createElement('div');
    widget.setAttribute('data-fake-widget', '');
    host.appendChild(widget);
    return 'w' + window.__turnstileRenders;
  },
  reset() {},
  remove() {},
  getResponse() { return undefined; },
};`;

async function fakeTurnstile(page: Page, requests: string[]): Promise<void> {
  await page.route('https://challenges.cloudflare.com/**', (route) => {
    requests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_TURNSTILE });
  });
}

test.describe('contact form loads on demand (07-15)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('at the top of Home the controller is not loaded and the mailto block shows', async ({
    page,
  }) => {
    const requests: string[] = [];
    await fakeTurnstile(page, requests);
    await page.goto('/');
    await settleMotion(page);
    await page.waitForTimeout(500);

    await expect(page.locator('form[data-contact-form]')).toBeHidden();
    await expect(page.locator('[data-contact-nojs]')).toBeVisible();
    expect(await page.evaluate(() => typeof window.turnstile)).toBe('undefined');
    expect(requests).toEqual([]);
  });

  test('scrolling to #contact mounts the form and requests Turnstile', async ({ page }) => {
    const requests: string[] = [];
    await fakeTurnstile(page, requests);
    await page.goto('/');
    await settleMotion(page);

    await openContactForm(page);
    await expect(page.locator('[data-contact-nojs]')).toBeHidden();
    await expect.poll(() => requests.length, { timeout: 10000 }).toBeGreaterThan(0);
  });

  for (const path of ['/#contact', '/?service=branding#contact']) {
    test(`${path} shows the form without the test scrolling`, async ({ page }) => {
      await fakeTurnstile(page, []);
      await page.goto(path);
      await expect(page.locator('form[data-contact-form]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-contact-nojs]')).toBeHidden();
    });
  }

  test('Home -> Projects -> Home mounts exactly one controller and one widget', async ({
    page,
  }) => {
    await fakeTurnstile(page, []);
    await page.goto('/');
    await settleMotion(page);
    await openContactForm(page);
    const slot = page.locator('[data-turnstile]');
    await expect(slot.locator('[data-fake-widget]')).toHaveCount(1, { timeout: 10000 });
    const singleVisit = await slot.evaluate((el) => el.childElementCount);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

    const nav = page.getByRole('navigation', { name: en['nav.label'], exact: true });
    await softNavigate(page, nav.getByRole('link', { name: en['nav.projects'], exact: true }));
    await softNavigate(
      page,
      page.getByRole('banner').getByRole('link', { name: 'Martina Fernandez' }),
    );
    await settleMotion(page);
    await openContactForm(page);

    await expect(page.locator('form[data-contact-form]')).toHaveCount(1);
    await expect(page.locator('form[data-contact-form]:visible')).toHaveCount(1);
    await expect(slot).toHaveCount(1);
    await expect(slot.locator('[data-fake-widget]')).toHaveCount(1, { timeout: 10000 });
    expect(await slot.evaluate((el) => el.childElementCount)).toBe(singleVisit);
    // One render per mounted page: the first visit and the return, never a duplicate controller.
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__turnstileRenders)).toBe(2);
  });
});
