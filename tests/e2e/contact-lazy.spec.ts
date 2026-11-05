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

// 07-18: the lazy form (07-15) had no reserved height, so a reader below #contact saw the footer
// jump by the form's height when the chunk mounted. These tests hold the lazy chunk until the
// reader is at the bottom, release it, and compare the footer and page height before and after.
const CAPTURE_CONTACT = process.env['CAPTURE_CONTACT'] === '1';

interface FooterMetrics {
  docTop: number;
  viewTop: number;
  scrollHeight: number;
  scrollY: number;
}

async function twoFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

async function footerMetrics(page: Page): Promise<FooterMetrics> {
  return page.evaluate(() => {
    const footer = document.querySelector('footer');
    if (!footer) throw new Error('no footer');
    const rect = footer.getBoundingClientRect();
    return {
      docTop: rect.top + window.scrollY,
      viewTop: rect.top,
      scrollHeight: document.documentElement.scrollHeight,
      scrollY: window.scrollY,
    };
  });
}

async function captureContact(page: Page, name: string): Promise<void> {
  if (!CAPTURE_CONTACT) return;
  await page.evaluate(() => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  // Let the section's reveals finish so the shot shows the layout, not a mid-fade frame.
  await settleMotion(page);
  await page.locator('#contact').screenshot({ path: `.taste-skill/inspect/07-18/${name}.png` });
}

async function expectNoShiftOnMount(
  page: Page,
  path: string,
  viewport: { width: number; height: number },
): Promise<void> {
  const label = `${viewport.width}x${viewport.height} ${path}`;
  const locale = path.startsWith('/es') ? 'es' : 'en';
  const shot = `${viewport.width}x${viewport.height}-${locale}`;
  await page.setViewportSize(viewport);
  await fakeTurnstile(page, []);

  let held = false;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/_astro/contact-form-boot.*.js', async (route) => {
    held = true;
    await gate;
    await route.continue();
  });

  await page.goto(path);
  await settleMotion(page);

  const form = page.locator('form[data-contact-form]');
  const nojs = page.locator('[data-contact-nojs]');
  await expect(form).toBeHidden();
  await expect(nojs).toBeVisible();

  await page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
  });
  await twoFrames(page);
  await expect.poll(() => held, { timeout: 10000 }).toBe(true);
  await expect(nojs).toBeVisible();
  await expect(page.getByRole('contentinfo')).toHaveCount(1);

  const before = await footerMetrics(page);
  if (CAPTURE_CONTACT) {
    await captureContact(page, `${shot}-pre`);
    await page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: 'instant' });
    }, before.scrollY);
    await twoFrames(page);
  }

  release();
  await expect(form).toBeVisible({ timeout: 10000 });
  await expect(nojs).toBeHidden();
  await expect(page.locator('[data-turnstile] [data-fake-widget]')).toHaveCount(1, {
    timeout: 10000,
  });
  await twoFrames(page);

  const after = await footerMetrics(page);
  const deltas = {
    docTop: Math.abs(after.docTop - before.docTop),
    scrollHeight: Math.abs(after.scrollHeight - before.scrollHeight),
    viewTop: Math.abs(after.viewTop - before.viewTop),
  };
  expect(deltas.docTop, `${label}: footer document top moved`).toBeLessThanOrEqual(1);
  expect(deltas.scrollHeight, `${label}: scrollHeight changed`).toBeLessThanOrEqual(1);
  expect(deltas.viewTop, `${label}: footer viewport top moved`).toBeLessThanOrEqual(1);

  await captureContact(page, `${shot}-post`);
}

test.describe('no layout shift when the lazy form mounts (07-18)', () => {
  const viewports = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ];

  for (const viewport of viewports) {
    for (const path of ['/', '/es/']) {
      test(`${viewport.width}x${viewport.height} ${path}: footer stays put when the form mounts below the reader`, async ({
        page,
      }) => {
        await expectNoShiftOnMount(page, path, viewport);
      });
    }
  }

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('390x844 / reduced: footer stays put when the form mounts below the reader', async ({
      page,
    }) => {
      await expectNoShiftOnMount(page, '/', { width: 390, height: 844 });
    });
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    for (const viewport of viewports) {
      test(`${viewport.width}x${viewport.height} /: no blank reserve, column is the mailto block height`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.goto('/');
        const nojs = page.locator('[data-contact-nojs]');
        await expect(nojs).toBeVisible();
        await expect(page.locator('form[data-contact-form]')).toBeHidden();
        // From lg the grid stretches the column to the row (the left column can be taller), so
        // measure the column's rendered content: from its top to the lowest rendered child. A
        // laid-out invisible form would push that past the mailto block.
        const extent = await page.locator('[data-contact-column]').evaluate((column) => {
          const top = column.getBoundingClientRect().top;
          let bottom = top;
          for (const child of Array.from(column.children)) {
            if (child.getClientRects().length === 0) continue;
            bottom = Math.max(bottom, child.getBoundingClientRect().bottom);
          }
          return bottom - top;
        });
        const nojsBox = await nojs.boundingBox();
        expect(nojsBox).not.toBeNull();
        if (!nojsBox) return;
        expect(Math.abs(extent - nojsBox.height)).toBeLessThanOrEqual(1);
      });
    }
  });
});
