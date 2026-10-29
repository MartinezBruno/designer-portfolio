import { devices, expect, test, type Locator, type Page } from '@playwright/test';

// Phase 6 magnetic buttons (MOTN-03, D-12, D-13; VALIDATION V-09 and the face half of V-10).
// The shell ([data-magnetic]) owns the hit area and focus outline and never moves; only its
// [data-magnetic-face] is translated, by GSAP, for a fine pointer under data-motion="on".

const HERO_CTA = '[data-hero-cta] [data-magnetic="pill"]';

/** The face's translation from its computed transform; `none` counts as 0, 0. */
async function faceOffset(shell: Locator): Promise<{ x: number; y: number; raw: string }> {
  return shell.locator('[data-magnetic-face]').evaluate((face) => {
    const raw = getComputedStyle(face).transform;
    if (raw === 'none') return { x: 0, y: 0, raw };
    const m = new DOMMatrixReadOnly(raw);
    return { x: m.m41, y: m.m42, raw };
  });
}

async function settled(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await expect(page.locator('[data-hero]')).toHaveAttribute('data-hero-played', '');
}

/** Waits for every finite animation and transition (reveals included) to finish. */
async function finishAnimations(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
  await page.evaluate(async () => {
    const finite = document
      .getAnimations()
      .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity);
    await Promise.allSettled(finite.map((a) => a.finished));
  });
}

async function box(
  target: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const found = await target.boundingBox();
  if (!found) throw new Error('target has no box');
  return found;
}

/**
 * Moves next to the shell's right edge until the face responds. GSAP loads lazily after mount, so
 * the first moves can land before the effect is listening.
 */
async function pullFromRight(page: Page, shell: Locator): Promise<void> {
  const b = await box(shell);
  let nudge = 0;
  await expect
    .poll(
      async () => {
        nudge = nudge === 0 ? 1 : 0;
        await page.mouse.move(b.x + b.width + 10, b.y + b.height / 2 + nudge);
        await page.waitForTimeout(100);
        return (await faceOffset(shell)).x;
      },
      { timeout: 5000 },
    )
    .toBeGreaterThan(0);
  await page.waitForTimeout(400);
}

const isIdentity = (o: { x: number; y: number }): boolean => o.x === 0 && o.y === 0;

test.describe('magnetic', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the hero CTA face pulls toward the pointer (cap 8px), the shell stays, and it releases', async ({
    page,
  }) => {
    await page.goto('/');
    await settled(page);
    const shell = page.locator(HERO_CTA);
    const before = await box(shell);

    await pullFromRight(page, shell);
    const pulled = await faceOffset(shell);
    expect(pulled.x).toBeGreaterThan(0);
    expect(pulled.x).toBeLessThanOrEqual(8);
    expect(Math.abs(pulled.y)).toBeLessThanOrEqual(8);
    expect(await box(shell)).toEqual(before);

    await page.mouse.move(700, 880);
    await page.waitForTimeout(600);
    expect(isIdentity(await faceOffset(shell))).toBe(true);
  });

  test('a footer social icon pulls (cap 6px) after scrolling', async ({ page }) => {
    await page.goto('/');
    await settled(page);
    const shell = page.locator('footer [data-magnetic="link"]').first();
    await shell.scrollIntoViewIfNeeded();
    // The footer row settles in (translate) as it scrolls into view; measure once it rests.
    await page.waitForTimeout(100);
    await finishAnimations(page);
    const before = await box(shell);

    await pullFromRight(page, shell);
    const pulled = await faceOffset(shell);
    expect(pulled.x).toBeGreaterThan(0);
    expect(pulled.x).toBeLessThanOrEqual(6);
    expect(Math.abs(pulled.y)).toBeLessThanOrEqual(6);
    expect(await box(shell)).toEqual(before);
  });

  test('switching to reduced with the toggle snaps the face back at once', async ({ page }) => {
    await page.goto('/');
    await settled(page);
    const shell = page.locator(HERO_CTA);
    await pullFromRight(page, shell);

    // Keyboard, so the pointer stays next to the CTA.
    await page.locator('[data-motion-toggle]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await expect.poll(async () => isIdentity(await faceOffset(shell)), { timeout: 150 }).toBe(true);

    // And it stays still while the pointer keeps moving.
    const b = await box(shell);
    await page.mouse.move(b.x + b.width + 4, b.y + b.height / 2 + 4);
    await page.waitForTimeout(400);
    expect(isIdentity(await faceOffset(shell))).toBe(true);
  });

  test('nav links, language links and the toggle are never magnetic', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header [data-magnetic]')).toHaveCount(0);
    await expect(page.locator('header [data-magnetic-face]')).toHaveCount(0);
    await expect(page.locator('[data-motion-toggle][data-magnetic]')).toHaveCount(0);
  });

  test('every magnetic shell has exactly one face and no reveal', async ({ page }) => {
    for (const path of ['/', '/404', '/projects/cabreras-motos-posts/']) {
      await page.goto(path);
      const issues = await page
        .locator('[data-magnetic]')
        .evaluateAll((shells) =>
          shells
            .filter(
              (s) =>
                s.querySelectorAll('[data-magnetic-face]').length !== 1 ||
                s.hasAttribute('data-reveal'),
            )
            .map((s) => s.outerHTML.slice(0, 80)),
        );
      expect(issues, path).toEqual([]);
    }
  });
});

// Touch: Desktop Chrome reports a fine hover pointer, so the device profiles flip it (Pitfall 11).
// defaultBrowserType is dropped: it cannot change inside a describe, and the suite is chromium-only.
for (const name of ['Pixel 7', 'iPhone 14'] as const) {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices[name];
  test.describe(`touch (${name})`, () => {
    test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

    test('no face ever moves on a coarse pointer', async ({ page }) => {
      await page.goto('/');
      await settled(page);
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);

      const shell = page.locator(HERO_CTA);
      const b = await box(shell);
      await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(400);

      const transforms = await page
        .locator('[data-magnetic-face]')
        .evaluateAll((faces) => faces.map((f) => getComputedStyle(f).transform));
      expect(transforms.length).toBeGreaterThan(0);
      expect(transforms.every((t) => t === 'none')).toBe(true);
    });
  });
}

test.describe('reduce', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

  test('the face stays at rest next to the pointer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    const shell = page.locator(HERO_CTA);
    const b = await box(shell);
    for (const dy of [0, 4, 8]) {
      await page.mouse.move(b.x + b.width + 10, b.y + b.height / 2 + dy);
      await page.waitForTimeout(150);
    }
    expect((await faceOffset(shell)).raw).toBe('none');
  });
});
