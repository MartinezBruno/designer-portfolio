import AxeBuilder from '@axe-core/playwright';
import { devices, expect, test, type Locator, type Page } from '@playwright/test';
import { openContactForm } from './helpers/contact';

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
      // Scroll-linked ones (07-08 parallax) never finish while on screen: timed ones only.
      .filter(
        (a) =>
          a.timeline instanceof DocumentTimeline &&
          a.effect?.getComputedTiming().endTime !== Infinity,
      );
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

// Cursor follower (MOTN-03, D-09..D-11, D-13; VALIDATION V-08 and the follower half of V-10/V-12).
const LAYER = '[data-cursor-layer]';
const HOME_TILE = 'section[aria-labelledby="work-title"] article[data-card]';

/** The layer's state: 'none' when it does not exist, else hidden / rest / link / view. */
function cursorState(page: Page): Promise<string> {
  return page.evaluate((sel) => {
    const layer = document.querySelector<HTMLElement>(sel);
    if (!layer) return 'none';
    if (layer.hasAttribute('data-hidden')) return 'hidden';
    return layer.dataset['state'] ?? 'rest';
  }, LAYER);
}

/**
 * Wiggles the pointer at (x, y) until the follower shows. GSAP loads lazily after mount, so the
 * first moves can land before the effect is listening.
 */
async function showCursorAt(page: Page, x: number, y: number): Promise<void> {
  let nudge = 0;
  await expect
    .poll(
      async () => {
        nudge = nudge === 0 ? 1 : 0;
        await page.mouse.move(x + nudge, y);
        await page.waitForTimeout(60);
        return cursorState(page);
      },
      { timeout: 5000 },
    )
    .not.toMatch(/^(none|hidden)$/);
}

async function centreOf(target: Locator): Promise<{ x: number; y: number }> {
  await target.scrollIntoViewIfNeeded();
  const b = await box(target);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Hovers the cover of the first Home "Latest work" tile until the pill is fully in. */
async function hoverTile(page: Page): Promise<Locator> {
  const tile = page.locator(HOME_TILE).first();
  await tile.scrollIntoViewIfNeeded();
  // Let the scroll-triggered reveals land first: mid-settle, the meta block's `translate` becomes
  // the containing block of the stretched link, so the cover is briefly not part of the link.
  await page.waitForTimeout(100);
  await finishAnimations(page);
  const c = await centreOf(tile.locator('[data-card-mat]'));
  await showCursorAt(page, c.x, c.y);
  await expect.poll(() => cursorState(page)).toBe('view');
  const pill = page.locator(`${LAYER} [data-cursor-pill]`);
  await expect.poll(() => pill.evaluate((p) => getComputedStyle(p).opacity)).toBe('1');
  return tile;
}

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
    // 07-15 loads the contact form on demand; mount it first so its taller layout cannot move the
    // footer after the box below is measured.
    await openContactForm(page);
    const shell = page.locator('footer [data-magnetic="link"]').first();
    await shell.scrollIntoViewIfNeeded();
    // The footer row settles in (translate) as it scrolls into view; measure once it rests.
    await page.waitForTimeout(100);
    await finishAnimations(page);
    // The settle-in can be a lazily loaded GSAP tween (not a WAAPI animation), so also wait until
    // the box holds still across two reads before measuring.
    let last = '';
    await expect
      .poll(
        async () => {
          const now = JSON.stringify(await box(shell));
          const still = now === last;
          last = now;
          await page.waitForTimeout(150);
          return still;
        },
        { timeout: 5000 },
      )
      .toBe(true);
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

test.describe('cursor', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('one decorative, click-through layer mounts after the pointer moves', async ({ page }) => {
    await page.goto('/');
    await settled(page);
    await showCursorAt(page, 720, 450);
    const layer = page.locator(LAYER);
    await expect(layer).toHaveCount(1);
    await expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(await layer.evaluate((l) => getComputedStyle(l).pointerEvents)).toBe('none');
    // Nothing in the follower can take focus.
    expect(await layer.locator('a, button, input, [tabindex]').count()).toBe(0);
  });

  for (const [path, label] of [
    ['/', 'View'],
    ['/es/', 'Ver'],
  ] as const) {
    test(`${path}: the pill reads "${label}" over a tile, and a click passes through it`, async ({
      page,
    }) => {
      await page.goto(path);
      await settled(page);
      const tile = await hoverTile(page);
      await expect(page.locator(`${LAYER} [data-cursor-pill]`)).toHaveText(label);
      // The dot fades out under the pill.
      await expect
        .poll(() =>
          page.locator(`${LAYER} [data-cursor-dot]`).evaluate((d) => getComputedStyle(d).opacity),
        )
        .toBe('0');

      const href = await tile.locator('a[href]').first().getAttribute('href');
      if (href === null) throw new Error('tile has no link');
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForURL((url) => url.pathname === href);
    });
  }

  test('the dot grows over a link, hides over the hero CTA and the message field', async ({
    page,
  }) => {
    await page.goto('/');
    await settled(page);
    const nav = await centreOf(
      page.getByRole('banner').getByRole('link', { name: 'Projects', exact: true }),
    );
    await showCursorAt(page, nav.x, nav.y);
    await expect.poll(() => cursorState(page)).toBe('link');
    const dot = page.locator(`${LAYER} [data-cursor-dot]`);
    await expect.poll(() => dot.evaluate((d) => getComputedStyle(d).scale)).toBe('2');

    // 06-10 review decision 3: no accent dot on the accent pill; it returns once the pointer leaves.
    const cta = await centreOf(page.locator(HERO_CTA));
    await page.mouse.move(cta.x, cta.y, { steps: 4 });
    await expect.poll(() => cursorState(page)).toBe('hidden');
    await expect
      .poll(() =>
        page.locator(`${LAYER} [data-cursor-pos]`).evaluate((p) => getComputedStyle(p).opacity),
      )
      .toBe('0');
    await page.mouse.move(cta.x, cta.y - 120, { steps: 4 });
    await expect.poll(() => cursorState(page)).not.toMatch(/^(none|hidden)$/);
    await expect
      .poll(() =>
        page.locator(`${LAYER} [data-cursor-pos]`).evaluate((p) => getComputedStyle(p).opacity),
      )
      .toBe('1');

    // 07-15: the form controller loads on demand, so bring the form up before using its field.
    await openContactForm(page);
    const field = await centreOf(page.locator('textarea[name="message"]'));
    await page.mouse.move(field.x, field.y);
    await expect.poll(() => cursorState(page)).toBe('hidden');
    await expect
      .poll(() =>
        page.locator(`${LAYER} [data-cursor-pos]`).evaluate((p) => getComputedStyle(p).opacity),
      )
      .toBe('0');
  });

  test('the follower never causes horizontal scroll at the right edge', async ({ page }) => {
    await page.goto('/');
    await settled(page);
    await showCursorAt(page, 720, 450);
    const width = await page.evaluate(() => window.innerWidth);
    for (const y of [450, 451, 452]) {
      await page.mouse.move(width - 1, y);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(400);
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });

  test('the native cursor is never hidden', async ({ page }) => {
    await page.goto('/');
    await settled(page);
    await hoverTile(page);
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .filter((el) => getComputedStyle(el).cursor === 'none')
        .map((el) => el.tagName),
    );
    expect(hidden).toEqual([]);
  });

  test('the motion toggle removes the layer and brings it back live', async ({ page }) => {
    await page.goto('/');
    await settled(page);
    await showCursorAt(page, 720, 450);

    const toggle = page.locator('[data-motion-toggle]');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await expect(page.locator(LAYER)).toHaveCount(0);
    await page.mouse.move(700, 400);
    await page.mouse.move(710, 410);
    await expect(page.locator(LAYER)).toHaveCount(0);

    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await showCursorAt(page, 720, 450);
    await expect(page.locator(LAYER)).toHaveCount(1);
  });

  test('zero axe violations with the pill shown', async ({ page }) => {
    await page.goto('/');
    await settled(page);
    await finishAnimations(page);
    await hoverTile(page);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(violations).toEqual([]);
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

    test('no cursor follower exists after taps', async ({ page }) => {
      await page.goto('/');
      await settled(page);
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);

      // Taps in the page gutter beside a tile: no navigation, but touch pointer events fire.
      const tile = await centreOf(page.locator(HOME_TILE).first().locator('[data-card-mat]'));
      await page.touchscreen.tap(2, tile.y);
      await page.touchscreen.tap(2, tile.y + 40);
      await page.waitForTimeout(400);
      await expect(page.locator(LAYER)).toHaveCount(0);
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

  test('no cursor follower exists after mouse moves', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    for (const [x, y] of [
      [300, 300],
      [700, 450],
      [1100, 600],
    ] as const) {
      await page.mouse.move(x, y);
      await page.waitForTimeout(150);
    }
    await expect(page.locator(LAYER)).toHaveCount(0);
  });
});
