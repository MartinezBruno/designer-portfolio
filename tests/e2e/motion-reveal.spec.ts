import { expect, test, type Page } from '@playwright/test';

// Scroll reveals (MOTN-01, UI-SPEC "Reveal Contract"): V-03 (JS fails after the gate), V-05
// (every element reveals once and never re-hides), focus reveal (Pitfall 7) and the LCP cover rule.

interface RevealState {
  revealed: boolean;
  opacity: string;
  translate: string;
  clipPath: string;
}

function readReveals(page: Page): Promise<RevealState[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-reveal]')].map((el) => {
      const style = getComputedStyle(el);
      return {
        revealed: el.hasAttribute('data-revealed'),
        opacity: style.opacity,
        translate: style.translate,
        clipPath: style.clipPath,
      };
    }),
  );
}

const openClip = (clip: string): boolean => clip === 'none' || clip === 'inset(0px)';

/** Wheels down until the page bottom, so the observer and scrollend see real user scrolling. */
async function scrollToBottom(page: Page): Promise<void> {
  for (let i = 0; i < 60; i += 1) {
    const atBottom = await page.evaluate(
      () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
    );
    if (atBottom) break;
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(120);
  }
}

test.describe('reveal failsafe when every script fails after the inline gate', () => {
  for (const path of ['/', '/projects/']) {
    test(`${path} fails safe: every [data-reveal] is visible by 1.6 s`, async ({ page }) => {
      await page.route('**/_astro/**/*.js', (route) => route.abort());
      await page.goto(path);
      // The inline gate still ran: the hidden start states apply until the CSS failsafe fires.
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      expect(await page.locator('[data-reveal]').count()).toBeGreaterThan(0);
      await expect
        .poll(
          async () =>
            (await readReveals(page)).filter(
              (r) => r.opacity !== '1' || !openClip(r.clipPath) || r.translate !== 'none',
            ).length,
          { timeout: 1700, intervals: [100] },
        )
        .toBe(0);
    });
  }
});

test.describe('scroll reveals on Home', () => {
  for (const height of [900, 1600]) {
    test(`scroll at 1440x${String(height)} reveals everything once and never re-hides`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height });
      await page.goto('/');
      await page.waitForLoadState('load');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      await page.mouse.move(720, height / 2);
      await scrollToBottom(page);

      await expect
        .poll(async () => (await readReveals(page)).filter((r) => !r.revealed).length, {
          timeout: 3000,
        })
        .toBe(0);

      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(200);
      await expect
        .poll(
          async () =>
            (await readReveals(page)).filter(
              (r) => !r.revealed || r.opacity !== '1' || !openClip(r.clipPath),
            ).length,
          { timeout: 3000 },
        )
        .toBe(0);
    });
  }
});

test.describe('keyboard focus reveals a card instantly', () => {
  test('focus on the first Latest-work card reveals it within one frame', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    const card = page.locator('section[aria-labelledby="work-title"] article').first();
    const link = card.locator('a').first();
    // Precondition: below the fold and not yet revealed, so the test proves the focus path.
    expect(
      await card.evaluate((article) =>
        [...article.querySelectorAll('[data-reveal]')].some((el) =>
          el.hasAttribute('data-revealed'),
        ),
      ),
    ).toBe(false);

    let onCard = false;
    for (let i = 0; i < 30 && !onCard; i += 1) {
      await page.keyboard.press('Tab');
      onCard = await link.evaluate((a) => document.activeElement === a);
    }
    expect(onCard, 'Tab should reach the first Latest-work card').toBe(true);

    const state = await card.evaluate(async (article) => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const parts = [...article.querySelectorAll<HTMLElement>('[data-reveal]')];
      const text = article.querySelector<HTMLElement>('[data-reveal="settle"]');
      return {
        count: parts.length,
        allRevealed: parts.every((el) => el.hasAttribute('data-revealed')),
        textOpacity: text ? getComputedStyle(text).opacity : null,
      };
    });
    expect(state.count).toBe(2);
    expect(state.allRevealed).toBe(true);
    expect(state.textOpacity).toBe('1');
  });
});

test.describe('LCP cover', () => {
  test('lcp cover: the first Projects card cover frame is never a reveal target', async ({
    page,
  }) => {
    await page.goto('/projects/');
    const frame = page.locator('#main article').first().locator('> div').first();
    await expect(frame.locator('picture img')).toHaveAttribute('loading', 'eager');
    expect(await frame.getAttribute('data-reveal')).toBeNull();
    // Later covers do shutter.
    const second = page.locator('#main article').nth(1).locator('> div').first();
    await expect(second).toHaveAttribute('data-reveal', 'shutter');
  });
});
