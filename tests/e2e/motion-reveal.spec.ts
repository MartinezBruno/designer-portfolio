import { expect, test, type Page } from '@playwright/test';
import { expectedDetails } from './helpers/projects';

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

test.describe('shutter reveal', () => {
  // clip-path cannot interpolate between inset() and none; the open state must be inset(0).
  test('the scroll shutter opens through intermediate clip values', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    const samples = await page.evaluate(async () => {
      const heading = document.getElementById('work-title');
      const frame = document.querySelector(
        'section[aria-labelledby="work-title"] [data-reveal="shutter"]',
      );
      if (!heading || !frame) return [];
      window.scrollTo(0, heading.getBoundingClientRect().top + window.scrollY - 96);
      const out: string[] = [];
      const start = performance.now();
      while (performance.now() - start < 1000) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        out.push(getComputedStyle(frame).clipPath);
      }
      return out;
    });
    const partial = samples.filter((clip) => /^inset\(0px 0px (?!100%)[\d.]+%\)$/.test(clip));
    expect(partial.length, `samples: ${samples.join(', ')}`).toBeGreaterThan(0);
    expect(samples.at(-1)).toBe('inset(0px)');
  });
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

test.describe('stretched card link mid-reveal', () => {
  // A translating ancestor becomes the containing block of the title link's `after:inset-0`
  // overlay, shrinking it to the text block; the cover must stay clickable while the card reveals.
  for (const width of [1440, 390]) {
    test(`clicking a Latest-work cover mid-reveal opens the project at ${String(width)}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.waitForLoadState('load');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      const card = page.locator('section[aria-labelledby="work-title"] article').first();
      const href = await card.locator('a').first().getAttribute('href');
      expect(href).not.toBeNull();
      await card.evaluate((el) => {
        el.scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(200);
      const state = await card.evaluate((el) => {
        const text = el.querySelector<HTMLElement>('[data-reveal="settle"]');
        return {
          revealed: text?.hasAttribute('data-revealed') ?? false,
          running: (text?.getAnimations().length ?? 0) > 0,
        };
      });
      // Precondition: the text block is still mid-transition when the click lands.
      expect(state).toEqual({ revealed: true, running: true });
      const box = await card.locator('> div').first().boundingBox();
      if (!box) throw new Error('cover has no box');
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await expect(page).toHaveURL(new RegExp(`${href ?? ''}$`));
    });
  }
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

// Projects page heading block and detail pages (Phase 6 D-04, amends Phase 4 D-04), both locales.
const firstDetail = (locale: 'en' | 'es'): string => {
  const detail = expectedDetails(locale)[0];
  if (detail === undefined) throw new Error(`no visible ${locale} project`);
  return detail.href;
};
const DETAIL_PATHS = [firstDetail('en'), firstDetail('es')];
const PROJECT_PAGES = ['/projects/', '/es/projects/', ...DETAIL_PATHS];
/** The edge-to-edge module stack (ProjectDetailView): the article's direct child after the intro. */
const STACK = 'article[aria-labelledby="project-title"] > div';

const hiddenCount = (states: RevealState[]): number =>
  states.filter((r) => r.opacity !== '1' || !openClip(r.clipPath) || r.translate !== 'none').length;

/** Detail pages run tens of thousands of pixels: wheel in larger steps, sampling as we go. */
async function scrollDetailToBottom(page: Page, onStep?: () => Promise<void>): Promise<void> {
  for (let i = 0; i < 400; i += 1) {
    const atBottom = await page.evaluate(
      () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
    );
    if (atBottom) break;
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(60);
    if (onStep) await onStep();
  }
}

test.describe('Projects and detail reveals without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  for (const path of PROJECT_PAGES) {
    test(`${path} without JavaScript shows every [data-reveal]`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('html')).not.toHaveAttribute('data-motion', /on|reduced/);
      const states = await readReveals(page);
      expect(states.length).toBeGreaterThan(0);
      expect(hiddenCount(states)).toBe(0);
    });
  }
});

test.describe('Projects and detail reveals when every script fails', () => {
  for (const path of PROJECT_PAGES) {
    test(`${path} fails safe: every [data-reveal] is visible by 1.6 s`, async ({ page }) => {
      await page.route('**/_astro/**/*.js', (route) => route.abort());
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      expect(await page.locator('[data-reveal]').count()).toBeGreaterThan(0);
      await expect
        .poll(async () => hiddenCount(await readReveals(page)), {
          timeout: 1700,
          intervals: [100],
        })
        .toBe(0);
    });
  }
});

test.describe('Projects and detail scroll reveals', () => {
  for (const path of PROJECT_PAGES) {
    test(`${path} scroll at 1440x900 reveals everything once and never re-hides`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      await page.waitForLoadState('load');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      await page.mouse.move(720, 450);
      await scrollDetailToBottom(page);

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
            (await readReveals(page)).filter((r) => !r.revealed || r.opacity !== '1').length +
            hiddenCount(await readReveals(page)),
          { timeout: 3000 },
        )
        .toBe(0);
    });
  }
});

test.describe('detail module stack', () => {
  for (const path of DETAIL_PATHS) {
    test(`${path} static stack: no reveal inside, every module image opaque while scrolling`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      await page.waitForLoadState('load');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');

      const stack = page.locator(STACK);
      await expect(stack).toHaveCount(1);
      expect(await stack.evaluate((el) => el.hasAttribute('data-reveal'))).toBe(false);
      // Text modules settle as one block; nothing else in the stack (images, grids, embeds) does.
      const kinds = await stack.evaluate((el) =>
        [...el.querySelectorAll('[data-reveal]')].map(
          (node) =>
            `${node.tagName}:${node.getAttribute('data-reveal') ?? ''}:${String(node.querySelector('img') !== null)}`,
        ),
      );
      for (const kind of kinds) expect(kind).toBe('DIV:settle:false');
      expect(await stack.locator('img').count()).toBeGreaterThan(0);

      const faded: string[] = [];
      const sample = async (): Promise<void> => {
        const low = await stack.evaluate((el) =>
          [...el.querySelectorAll('img')].flatMap((img) => {
            let opacity = 1;
            for (let node: Element | null = img; node; node = node.parentElement) {
              opacity *= Number.parseFloat(getComputedStyle(node).opacity);
            }
            return opacity < 1 ? [`${img.currentSrc || img.src}@${String(opacity)}`] : [];
          }),
        );
        faded.push(...low);
      };
      await sample();
      await scrollDetailToBottom(page, sample);
      expect(faded).toEqual([]);
    });
  }
});

// Headline line splits (MOTN-02, D-01, V-06): every `lines` heading keeps its accessible name (and
// a detail h1 its lang span) before, during and after the rise, and is plain text again afterwards.
const LINES = '[data-reveal="lines"]';
const SPLIT_PARTS = '.split-line, .split-line-mask';

/** Prefer a detail whose h1 carries a lang span (the title is in the other language). */
const splitDetail = (locale: 'en' | 'es'): string => {
  const details = expectedDetails(locale);
  const detail = details.find((d) => d.titleLang !== null) ?? details[0];
  if (detail === undefined) throw new Error(`no visible ${locale} project`);
  return detail.href;
};
const SPLIT_PAGES = [
  '/',
  '/es/',
  '/projects/',
  '/es/projects/',
  splitDetail('en'),
  splitDetail('es'),
];

/** Normalized names read before any split could run (SplitText's aria-label equals the text). */
function headingNames(page: Page): Promise<string[]> {
  return page.evaluate((selector) => {
    const norm = (value: string): string => value.replace(/\s+/g, ' ').trim();
    return [...document.querySelectorAll<HTMLElement>(selector)].map((el) =>
      norm(el.getAttribute('aria-label') ?? el.textContent),
    );
  }, LINES);
}

test.describe('split headings', () => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    for (const path of SPLIT_PAGES) {
      test(`split ${path} at ${String(viewport.width)}: names and lang survive, split reverts`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
        const names = await headingNames(page);
        expect(names.length).toBeGreaterThan(0);
        const langCounts = await page
          .locator(LINES)
          .evaluateAll((els) => els.map((el) => el.querySelectorAll('[lang]').length));
        await page.waitForLoadState('load');

        let seenSplit = 0;
        const headings = page.locator(LINES);
        for (let i = 0; i < names.length; i += 1) {
          const heading = headings.nth(i);
          await heading.evaluate((el) => {
            el.scrollIntoView({ block: 'center' });
          });
          await page.waitForTimeout(200);
          if ((await heading.locator(SPLIT_PARTS).count()) > 0) seenSplit += 1;
          await expect(heading).toHaveAccessibleName(names[i] ?? '', { timeout: 100 });
          if ((langCounts[i] ?? 0) > 0) {
            expect(await heading.locator('[lang]').count()).toBeGreaterThan(0);
          }
        }
        await page.waitForTimeout(1200);
        for (let i = 0; i < names.length; i += 1) {
          const heading = headings.nth(i);
          await expect(heading).toHaveAccessibleName(names[i] ?? '');
          await expect(heading.locator(SPLIT_PARTS)).toHaveCount(0);
          await expect(heading).toHaveAttribute('data-revealed', '');
          expect(await heading.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
          if ((langCounts[i] ?? 0) > 0) {
            expect(await heading.locator('[lang]').count()).toBe(langCounts[i]);
          }
        }
        // The line rise really ran under full motion (not only the fade fallback).
        expect(seenSplit).toBeGreaterThan(0);
      });
    }
  }

  // No committed title currently needs a lang span, so wrap the detail h1 text in one (the markup
  // ProjectIntro emits when titleLang is set) to exercise SplitText's aria 'none' path for real.
  for (const width of [1440, 390]) {
    test(`split keeps a detail h1 lang span throughout at ${String(width)}`, async ({ page }) => {
      const path = firstDetail('en');
      await page.route(`**${path}`, async (route) => {
        const response = await route.fetch();
        const body = (await response.text()).replace(
          /(<h1 id="project-title"[^>]*>)([^<]+)(<\/h1>)/,
          '$1<span lang="es">$2</span>$3',
        );
        await route.fulfill({ response, body });
      });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const h1 = page.locator('#project-title');
      await expect(h1.locator('span[lang="es"]')).toHaveCount(1);
      const name = await h1.evaluate((el) => el.textContent.replace(/\s+/g, ' ').trim());

      await expect(h1.locator('.split-line-mask').first()).toBeAttached({ timeout: 1500 });
      expect(await h1.getAttribute('aria-label')).toBeNull();
      expect(await h1.locator('[lang="es"]').count()).toBeGreaterThan(0);
      await expect(h1).toHaveAccessibleName(name, { timeout: 100 });

      await expect(h1.locator(SPLIT_PARTS)).toHaveCount(0, { timeout: 2000 });
      await expect(h1.locator('span[lang="es"]')).toHaveCount(1);
      await expect(h1).toHaveAccessibleName(name);
    });
  }

  test('split re-wraps on resize mid-reveal and ends as the original plain text', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    const heading = page.locator(`section[aria-labelledby="work-title"] ${LINES}`).first();
    const original = await heading.evaluate((el) => ({ html: el.innerHTML, text: el.textContent }));
    await heading.evaluate((el) => {
      el.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(200);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1200);
    await expect(heading.locator(SPLIT_PARTS)).toHaveCount(0);
    const after = await heading.evaluate((el) => ({ html: el.innerHTML, text: el.textContent }));
    expect(after).toEqual(original);
    expect(await heading.getAttribute('aria-label')).toBeNull();
  });

  test('split fails safe when only the gsap chunk fails: every lines heading shows', async ({
    page,
  }) => {
    let aborted = 0;
    // Only chunks carrying GSAP's "GreenSock" marker are aborted; every other module still runs.
    await page.route('**/_astro/**/*.js', async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      if (body.includes('GreenSock')) {
        aborted += 1;
        await route.abort();
        return;
      }
      await route.fulfill({ response, body });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    expect(await page.locator(LINES).count()).toBeGreaterThan(0);
    await expect
      .poll(
        async () =>
          page
            .locator(LINES)
            .evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity !== '1').length),
        { timeout: 1600, intervals: [100] },
      )
      .toBe(0);
    expect(aborted).toBeGreaterThan(0);
    await expect(page.locator(`${LINES} .split-line-mask`)).toHaveCount(0);
  });
});
