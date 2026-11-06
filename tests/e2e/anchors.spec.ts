import { expect, test, type Locator, type Page } from '@playwright/test';
import services from '../../src/data/services.json' with { type: 'json' };
import { interpolate } from '../../src/i18n/t';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { waitForNavigationIdle } from './helpers/navigation';
import { settleMotion } from './helpers/motion';

// Phase 7 anchors (MOTN-06, 07 D-08, UI-SPEC "Anchors and the skip link"). Same-page content
// anchors glide under 'on' and jump under 'reduced'/'off'; focus always lands on the target. The
// skip link is always instant. Cross-page hash links land on (and focus) the target. Home's "Ask
// about this" links stay on the page: no swap, the chip is checked and a typed message survives.

const STORAGE_KEY = 'motion-preference';

declare global {
  interface Window {
    __marker?: number;
    __vtCount?: number;
    __navPending?: boolean;
    __scrollEnded?: number;
  }
}

const scrollY = (page: Page): Promise<number> => page.evaluate(() => window.scrollY);

const activeId = (page: Page): Promise<string> =>
  page.evaluate(() => document.activeElement?.id ?? '');

/** Counts view transitions without changing them. */
async function countViewTransitions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__vtCount = 0;
    const original = document.startViewTransition?.bind(document);
    if (original === undefined) return;
    document.startViewTransition = ((callback?: ViewTransitionUpdateCallback) => {
      window.__vtCount = (window.__vtCount ?? 0) + 1;
      return original(callback);
    }) as typeof document.startViewTransition;
  });
}

async function useReduced(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, 'reduced');
  }, STORAGE_KEY);
}

async function blockTurnstile(page: Page): Promise<void> {
  await page.route('https://challenges.cloudflare.com/**', (route) => route.abort());
}

/**
 * Activates a link without Playwright's scroll-into-view (07-05: the sticky header counts as
 * obscured by scroll-padding-top, so click() would scroll the page first).
 */
async function pressInPlace(target: Locator): Promise<void> {
  await target.dispatchEvent('click', { button: 0 });
}

/** Resolves once the page has stopped moving (two equal samples 150 ms apart). */
async function waitForScrollRest(page: Page): Promise<number> {
  let last = -1;
  await expect
    .poll(
      async () => {
        const now = await scrollY(page);
        const still = now === last;
        last = now;
        return still;
      },
      { intervals: [150], timeout: 5000 },
    )
    .toBe(true);
  return last;
}

/** Where the target sits when scrolling stops at its snap position (padding + margin). */
async function expectAtScrollPadding(page: Page, id: string): Promise<void> {
  const { top, expected, atMax } = await page.evaluate((targetId) => {
    const html = document.documentElement;
    const target = document.getElementById(targetId);
    if (!target) throw new Error(`#${targetId} missing`);
    const padding = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    return {
      top: target.getBoundingClientRect().top,
      expected: padding + margin,
      atMax: Math.ceil(window.scrollY) >= html.scrollHeight - window.innerHeight - 1,
    };
  }, id);
  if (!atMax) expect(Math.abs(top - expected), `top ${top}, expected ${expected}`).toBeLessThan(4);
  else expect(top, `top ${top} at max scroll`).toBeLessThanOrEqual(expected + 4);
}

const contactLink = (page: Page): Locator =>
  page.getByRole('banner').getByRole('link', { name: en['nav.contact'], exact: true });

test.describe('same-page anchors', () => {
  test('on: the header Contact link glides to #contact and focuses it at the end', async ({
    page,
  }) => {
    await blockTurnstile(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await settleMotion(page);
    await page.evaluate(() => {
      window.__marker = 1;
    });
    const start = await scrollY(page);

    await pressInPlace(contactLink(page));
    await page.waitForTimeout(120);
    const mid = await scrollY(page);
    const end = await waitForScrollRest(page);

    expect(end).toBeGreaterThan(start);
    expect(mid, `start ${start}, mid ${mid}, end ${end}`).toBeGreaterThan(start);
    expect(mid, `start ${start}, mid ${mid}, end ${end}`).toBeLessThan(end);
    await expect(page).toHaveURL(/\/#contact$/);
    await expect.poll(() => activeId(page)).toBe('contact');
    await expectAtScrollPadding(page, 'contact');
    expect(await page.evaluate(() => window.__marker)).toBe(1);
    // The one-navigation smooth behaviour is restored afterwards.
    expect(await page.evaluate(() => document.documentElement.style.scrollBehavior)).toBe('');
  });

  test('on: Back during an anchor glide restores without gliding (WR-01, 07-20)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await blockTurnstile(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await settleMotion(page);
    const y0 = await scrollY(page);
    expect(y0).toBe(0);

    await pressInPlace(contactLink(page));
    await expect
      .poll(() => scrollY(page), { intervals: [10], timeout: 1000 })
      .toBeGreaterThan(y0 + 50);

    // The router's history restore runs on popstate; two frames later the page must be back.
    // Chromium's own fragment navigation focuses #contact (tabindex=-1) at the click, so the
    // focus point is cleared first: what is checked is that the hook's landing focus never comes.
    const after = await page.evaluate(
      () =>
        new Promise<{ y: number; behavior: string }>((resolve) => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          window.addEventListener(
            'popstate',
            () => {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  resolve({
                    y: window.scrollY,
                    behavior: document.documentElement.style.scrollBehavior,
                  });
                });
              });
            },
            { once: true },
          );
          history.back();
        }),
    );
    expect(Math.abs(after.y - y0), `y0 ${y0}, after two frames ${after.y}`).toBeLessThanOrEqual(1);
    expect(after.behavior).not.toBe('smooth');
    await page.waitForTimeout(1500);
    await expect(page.locator('#contact')).not.toBeFocused();
  });

  test('on: the hero CTA glides to #contact and focuses it', async ({ page }) => {
    await blockTurnstile(page);
    await page.goto('/');
    await settleMotion(page);
    const start = await scrollY(page);
    await pressInPlace(
      page.locator('[data-hero-cta]').getByRole('link', { name: en['hero.cta'], exact: true }),
    );
    await page.waitForTimeout(120);
    const mid = await scrollY(page);
    const end = await waitForScrollRest(page);
    expect(mid).toBeGreaterThan(start);
    expect(mid).toBeLessThan(end);
    await expect.poll(() => activeId(page)).toBe('contact');
  });

  test('reduced: the header Contact link jumps in one frame and focuses #contact', async ({
    page,
  }) => {
    await useReduced(page);
    await blockTurnstile(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await settleMotion(page);

    await pressInPlace(contactLink(page));
    await page.waitForTimeout(50);
    const early = await scrollY(page);
    const end = await waitForScrollRest(page);
    expect(early).toBeGreaterThan(0);
    expect(Math.abs(end - early), `early ${early}, end ${end}`).toBeLessThanOrEqual(1);
    await expect.poll(() => activeId(page)).toBe('contact');
    await expectAtScrollPadding(page, 'contact');
  });
});

test.describe('skip link', () => {
  for (const state of ['on', 'reduced'] as const) {
    test(`${state}: the skip link jumps instantly and focuses #main`, async ({ page }) => {
      if (state === 'reduced') await useReduced(page);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-motion', state);
      await settleMotion(page);
      await page.evaluate(() => {
        window.scrollTo({ top: 1500, behavior: 'instant' });
      });
      await page.waitForTimeout(200);
      const skip = page.getByRole('link', { name: en['a11y.skipToContent'], exact: true });
      await expect(skip).toHaveAttribute('data-skip-link', '');
      await skip.evaluate((el) => {
        (el as HTMLElement).focus({ preventScroll: true });
      });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(50);
      const early = await scrollY(page);
      const end = await waitForScrollRest(page);
      expect(Math.abs(end - early), `early ${early}, end ${end}`).toBeLessThanOrEqual(1);
      expect(end).toBeLessThan(1500);
      await expect(page.locator('#main')).toBeFocused();
    });
  }

  const skipCases = [
    { path: '/', label: en['a11y.skipToContent'] },
    { path: '/es/', label: es['a11y.skipToContent'] },
  ] as const;

  for (const { path, label } of skipCases) {
    test(`on: ${path} Tab once from the top keeps 16px padding, Enter focuses #main`, async ({
      page,
    }) => {
      await page.goto(path);
      await page.keyboard.press('Tab');
      const skip = page.getByRole('link', { name: label, exact: true });
      await expect(skip).toBeFocused();
      // Phase 1 WR-02 / Phase 8 D-18: focus:not-sr-only resets padding, so the focused link
      // needs its own horizontal padding.
      const padding = await skip.evaluate((el) => {
        const style = getComputedStyle(el);
        return { paddingLeft: style.paddingLeft, paddingRight: style.paddingRight };
      });
      expect(padding.paddingLeft).toBe('16px');
      expect(padding.paddingRight).toBe('16px');
      await page.keyboard.press('Enter');
      await expect(page.locator('#main')).toBeFocused();
    });
  }
});

test.describe('cross-page hash link', () => {
  test('on: /projects/ -> Contact lands on #contact and focuses it, not the h1', async ({
    page,
  }) => {
    await blockTurnstile(page);
    await page.goto('/projects/');
    await settleMotion(page);
    await page.evaluate(() => {
      window.__navPending = true;
      document.addEventListener(
        'astro:page-load',
        () => {
          window.__navPending = false;
        },
        { once: true },
      );
    });
    await pressInPlace(contactLink(page));
    await expect
      .poll(() => page.evaluate(() => window.__navPending !== true), { timeout: 10000 })
      .toBe(true);
    await waitForNavigationIdle(page);
    await expect(page).toHaveURL(/\/#contact$/);
    await expect.poll(() => activeId(page)).toBe('contact');
    await expect(page.locator('section#contact')).toBeInViewport();
  });
});

const ordered = [...services].sort((a, b) => a.order - b.order);
const askService = ordered.find((service) => service.id !== 'other') ?? ordered[0];
if (askService === undefined) throw new Error('services.json is empty');
const askName = `${en['services.ask']}${interpolate(en['services.askTarget'], { title: askService.title.en })}`;

test.describe('Ask about this on Home', () => {
  test(`on: ?service=${askService.id} stays on the page, keeps the message and checks the chip`, async ({
    page,
  }) => {
    await countViewTransitions(page);
    await blockTurnstile(page);
    await page.goto('/');
    await settleMotion(page);
    await expect(page.locator('[data-hero]')).toHaveAttribute('data-hero-played', /.*/);

    // 07-15: the form loads on demand, so bring it near first.
    await page.locator('#contact').scrollIntoViewIfNeeded();
    const message = page.locator('#contact-message');
    await expect(message).toBeVisible();
    await message.fill('hello');
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      window.scrollTo({ top: 0, behavior: 'instant' });
      window.__marker = 1;
    });
    const before = await page.evaluate(() => window.__vtCount ?? 0);

    const ask = page.getByRole('link', { name: askName, exact: true });
    await ask.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await pressInPlace(ask);
    await waitForScrollRest(page);

    expect(await page.evaluate(() => window.__marker)).toBe(1);
    expect(await page.evaluate(() => window.__vtCount ?? 0)).toBe(before);
    await expect(page.locator('[data-hero]')).toHaveAttribute('data-hero-played', /.*/);
    await expect(message).toHaveValue('hello');
    await expect(page.locator(`#contact-service-${askService.id}`)).toBeChecked();
    // 07-11 CR-01: only the hash changes, so the router's notion of "same page" stays in step.
    expect(await page.evaluate(() => location.search)).toBe('');
    expect(await page.evaluate(() => location.hash)).toBe('#contact');
    await expect.poll(() => activeId(page)).toBe('contact');
    await expect(page.locator('section#contact')).toBeInViewport();
  });

  for (const state of ['on', 'reduced'] as const) {
    test(`${state}: Ask, type, Ask again, skip link: no swap, message kept (CR-01)`, async ({
      page,
    }) => {
      if (state === 'reduced') await useReduced(page);
      await countViewTransitions(page);
      await blockTurnstile(page);
      await page.goto('/');
      await settleMotion(page);

      // Scroll first: a later plan may load the form on demand.
      await page.locator('#contact').scrollIntoViewIfNeeded();
      const message = page.locator('#contact-message');
      await expect(message).toBeVisible();

      const ask = page.getByRole('link', { name: askName, exact: true });
      await ask.scrollIntoViewIfNeeded();
      await pressInPlace(ask);
      await waitForScrollRest(page);

      await message.fill('keep me');
      await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur();
        window.__marker = 1;
      });
      const before = await page.evaluate(() => window.__vtCount ?? 0);

      await page.evaluate(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      await ask.scrollIntoViewIfNeeded();
      await pressInPlace(ask);
      await waitForScrollRest(page);

      // The skip link: focus it, then activate it from the keyboard.
      const skip = page.locator('[data-skip-link]');
      await skip.focus();
      await page.keyboard.press('Enter');
      await waitForScrollRest(page);

      expect(await page.evaluate(() => window.__marker)).toBe(1);
      expect(await page.evaluate(() => window.__vtCount ?? 0)).toBe(before);
      await expect(message).toHaveValue('keep me');
      await expect(page.locator(`#contact-service-${askService.id}`)).toBeChecked();
      await expect.poll(() => activeId(page)).toBe('main');
      expect(await page.evaluate(() => location.search)).toBe('');
    });
  }
});
