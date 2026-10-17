import { expect, test, type Locator, type Page } from '@playwright/test';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { expectedDetails } from './helpers/projects';

const WIDTHS = [320, 390, 768, 1440] as const;
/** The seamless module stack inside the article (D-01). */
const STACK = 'article[aria-labelledby="project-title"] > div.max-w-\\[1400px\\]';

/** Headings that must hold the two-line rule: the h1, every h2 in main, and the next-tile h3. */
async function headingLines(page: Page): Promise<{ text: string; lines: number }[]> {
  return page
    .locator('main h1, main h2, section[aria-labelledby="next-project-title"] h3')
    .evaluateAll((els) =>
      els
        .filter((el) => el.getClientRects().length > 0 && !el.closest('.sr-only'))
        .map((el) => {
          const style = getComputedStyle(el);
          const lineHeight = Number.parseFloat(style.lineHeight);
          const { height } = el.getBoundingClientRect();
          return {
            text: el.textContent.replace(/\s+/g, ' ').trim(),
            lines: Math.round(height / lineHeight),
          };
        }),
    );
}

/**
 * Reading order check: each element in DOM order must sit below or to the right of the one
 * before it (row-major), so visual order equals DOM order.
 */
async function expectVisualOrder(items: Locator): Promise<void> {
  const boxes = await items.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    }),
  );
  expect(boxes.length).toBeGreaterThan(1);
  for (let i = 1; i < boxes.length; i++) {
    const a = boxes[i - 1];
    const b = boxes[i];
    if (a === undefined || b === undefined) continue;
    const below = b.top >= a.bottom - 1;
    const right = b.left >= a.right - 1;
    expect(below || right, `item ${String(i)} renders before item ${String(i - 1)}`).toBe(true);
  }
}

const cases = [
  { lang: 'en', dict: en },
  { lang: 'es', dict: es },
] as const;

for (const { lang, dict } of cases) {
  test.describe(`project detail pages (${lang})`, () => {
    const details = expectedDetails(lang);

    test('every visible project has a detail page', () => {
      expect(details.length).toBeGreaterThan(0);
    });

    test('next and previous wrap around the /projects order (D-13)', () => {
      const first = details[0];
      const last = details.at(-1);
      expect(first).toBeDefined();
      expect(last).toBeDefined();
      if (details.length >= 3) {
        expect(last?.next?.href).toBe(first?.href);
        expect(first?.previous?.href).toBe(last?.href);
      }
      for (const [index, detail] of details.entries()) {
        if (details.length < 2) break;
        expect(detail.next?.href).toBe(details[(index + 1) % details.length]?.href);
      }
    });

    for (const detail of details) {
      test.describe(detail.href, () => {
        test('renders a localized page', async ({ page }) => {
          const response = await page.goto(detail.href);
          expect(response?.status()).toBe(200);
          await expect(page.locator('html')).toHaveAttribute('lang', lang);
        });

        test('opens with the title-first intro band', async ({ page }) => {
          await page.goto(detail.href);
          const heading = page.locator('h1#project-title');
          await expect(page.locator('h1')).toHaveCount(1);
          await expect(heading).toHaveText(detail.title);
          if (detail.titleLang === null) {
            await expect(heading.locator('span[lang]')).toHaveCount(0);
          } else {
            await expect(heading.locator(`span[lang="${detail.titleLang}"]`)).toHaveCount(1);
          }
          const header = page.locator('article header');
          if (detail.summary !== null) {
            await expect(header.locator('p', { hasText: detail.summary })).toHaveText(
              detail.summary,
            );
          }
        });

        test('shows labelled category and tools', async ({ page }) => {
          await page.goto(detail.href);
          const header = page.locator('article header');
          const categoryGroup = header.locator('dl > div', {
            has: page.locator('dt', { hasText: dict['projects.meta.category'] }),
          });
          if (detail.category === null) {
            await expect(categoryGroup).toHaveCount(0);
          } else {
            await expect(categoryGroup.locator('dt')).toBeVisible();
            await expect(categoryGroup.locator('dd')).toHaveText(detail.category);
          }
          const toolsGroup = header.locator('dl > div', {
            has: page.locator('dt', { hasText: dict['projects.meta.tools'] }),
          });
          if (detail.tools.length === 0) {
            await expect(toolsGroup).toHaveCount(0);
            return;
          }
          await expect(toolsGroup.locator('dt')).toBeVisible();
          const items = toolsGroup.locator('li');
          await expect(items).toHaveCount(detail.tools.length);
          for (const [index, tool] of detail.tools.entries()) {
            const item = items.nth(index);
            await expect(item).toHaveText(tool.name);
            await expect(item.locator('svg')).toHaveCount(tool.hasIcon ? 1 : 0);
          }
        });

        test('links to Behance in a new tab', async ({ page }) => {
          await page.goto(detail.href);
          const link = page.locator('article header a', { hasText: dict['detail.viewOnBehance'] });
          await expect(link).toHaveCount(1);
          await expect(link).toHaveAttribute('href', detail.behanceUrl);
          await expect(link).toHaveAttribute('target', '_blank');
          await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
          await expect(link).toHaveAttribute('rel', /\bnoreferrer\b/);
          const name = await link.evaluate((el) => el.textContent?.replace(/\s+/g, ' ').trim());
          expect(name?.endsWith(dict['a11y.newTab'])).toBe(true);
          await expect(link).toHaveAccessibleName(
            new RegExp(`${dict['a11y.newTab'].replace(/[()]/g, '\\$&')}$`),
          );
        });

        test('shows no project date (D-12)', async ({ page }) => {
          await page.goto(detail.href);
          await expect(page.locator('article header')).not.toContainText(detail.year);
          const metaContents = await page
            .locator('head meta[content]')
            .evaluateAll((els) => els.map((el) => el.getAttribute('content') ?? ''));
          // URLs (og:image, og:url) may carry numeric ids; only the copy must be date-free.
          const copy = metaContents.filter((content) => !/^(https?:)?\//.test(content));
          for (const content of copy) expect(content).not.toContain(detail.year);
          await expect(page).not.toHaveTitle(new RegExp(detail.year));
        });

        test('ends with the contact band, then next and previous (D-13..D-15)', async ({
          page,
        }) => {
          await page.goto(detail.href);
          const band = page.locator('main section[aria-labelledby="project-cta-title"]');
          await expect(band.locator('h2')).toHaveText(dict['detail.cta.heading']);
          const contact = band.locator('a');
          await expect(contact).toHaveCount(1);
          await expect(contact).toHaveAttribute(
            'href',
            lang === 'en' ? '/#contact' : '/es/#contact',
          );
          await expect(contact).toHaveAccessibleName(dict['detail.cta.button']);
          // The contact button is the page's only accent button.
          await expect(page.locator('main a.bg-accent, main button.bg-accent')).toHaveCount(1);

          const teaser = page.locator('main section[aria-labelledby="next-project-title"]');
          if (detail.next === null) {
            await expect(teaser).toHaveCount(0);
            return;
          }
          await expect(teaser.locator('h2')).toHaveText(dict['detail.next.heading']);
          const tile = teaser.locator('article h3 a');
          await expect(tile).toHaveCount(1);
          await expect(tile).toHaveAttribute('href', detail.next.href);
          await expect(tile).toHaveAccessibleName(
            `${dict['detail.next.srPrefix']} ${detail.next.title}`,
          );
          const previous = teaser.locator('a', { hasText: dict['detail.previous'] });
          if (detail.previous === null) {
            await expect(previous).toHaveCount(0);
          } else {
            await expect(previous).toHaveAttribute('href', detail.previous.href);
            await expect(previous).toHaveAccessibleName(
              `${dict['detail.previous']} ${detail.previous.title}`,
            );
            expect((await page.request.get(detail.previous.href)).status()).toBe(200);
          }
          expect((await page.request.get(detail.next.href)).status()).toBe(200);
        });

        test('draws the next-tile focus ring on ::after for keyboard focus', async ({ page }) => {
          test.skip(detail.next === null, 'no teaser with a single project');
          await page.goto(detail.href);
          const teaser = page.locator('main section[aria-labelledby="next-project-title"]');
          // Tab into the tile from the stop just before it (Previous, or the contact button).
          const before =
            detail.previous === null
              ? page.locator('main section[aria-labelledby="project-cta-title"] a')
              : teaser.locator('a', { hasText: dict['detail.previous'] });
          await before.focus();
          await page.keyboard.press('Tab');
          const focused = await page.evaluate(() => {
            const el = document.activeElement;
            if (!(el instanceof HTMLElement)) return null;
            return {
              href: el.getAttribute('href'),
              focusVisible: el.matches(':focus-visible'),
              afterOutline: getComputedStyle(el, '::after').outlineStyle,
            };
          });
          expect(focused?.href).toBe(detail.next?.href);
          expect(focused?.focusVisible).toBe(true);
          expect(focused?.afterOutline).toBe('solid');
        });

        test('keeps headings to two lines and never overflows at 320px', async ({ page }) => {
          for (const width of WIDTHS) {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(detail.href);
            const headings = await headingLines(page);
            // h1, contact band h2 and (with 2+ projects) the teaser h2 and h3.
            expect(headings.length).toBeGreaterThanOrEqual(detail.next === null ? 2 : 4);
            for (const heading of headings) {
              expect(
                heading.lines,
                `"${heading.text}" wraps to ${String(heading.lines)} lines at ${String(width)}px`,
              ).toBeLessThanOrEqual(2);
            }
            if (width === 320) {
              const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
              expect(scrollWidth).toBeLessThanOrEqual(320);
            }
          }
        });

        test('visual order equals DOM order in the meta row and the teaser', async ({ page }) => {
          for (const width of [1440, 390] as const) {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(detail.href);
            const meta = page.locator(
              'article header dl > div, article header a[href^="https://www.behance.net"]',
            );
            if ((await meta.count()) > 1) await expectVisualOrder(meta);
            if (detail.next !== null) {
              const teaser = page.locator('main section[aria-labelledby="next-project-title"]');
              await expectVisualOrder(teaser.locator('h2, div > a, article'));
            }
          }
        });

        test('mirrors every module image with a curated or numbered alt (D-05, D-09)', async ({
          page,
        }) => {
          await page.goto(detail.href);
          const images = page.locator(STACK).locator('img');
          await expect(images).toHaveCount(detail.imageCount);
          // Module images are the only images in the article: the cover is not repeated.
          await expect(page.locator('article[aria-labelledby="project-title"] img')).toHaveCount(
            detail.imageCount,
          );
          const attrs = await images.evaluateAll((els) =>
            els.map((el) => ({
              alt: el.getAttribute('alt') ?? '',
              width: el.getAttribute('width'),
              height: el.getAttribute('height'),
              loading: el.getAttribute('loading'),
            })),
          );
          expect(attrs.map((attr) => attr.alt)).toEqual(detail.alts);
          for (const attr of attrs) {
            expect(attr.alt).not.toBe('');
            expect(attr.alt).not.toContain('Image may contain');
            expect(Number(attr.width)).toBeGreaterThan(0);
            expect(Number(attr.height)).toBeGreaterThan(0);
          }
          expect(attrs.map((attr) => attr.loading === 'eager')).toEqual(
            attrs.map((_, index) => index === 0),
          );
          await expect(images.first()).toHaveAttribute('fetchpriority', 'high');
        });

        test('loads no image from behance.net (D-05)', async ({ page }) => {
          await page.goto(detail.href);
          const urls = await page
            .locator('img, source')
            .evaluateAll((els) =>
              els.flatMap((el) => [el.getAttribute('src') ?? '', el.getAttribute('srcset') ?? '']),
            );
          for (const url of urls) expect(url).not.toContain('behance.net');
        });

        test('renders text modules in site style with lang and new-tab hints (D-02)', async ({
          page,
        }) => {
          await page.goto(detail.href);
          const texts = page.locator(`${STACK} > div.max-w-\\[65ch\\]`);
          await expect(texts).toHaveCount(detail.textCount);
          for (const text of await texts.all()) {
            if (detail.textLang === null) {
              expect(await text.getAttribute('lang')).toBeNull();
            } else {
              await expect(text).toHaveAttribute('lang', detail.textLang);
            }
            for (const link of await text.locator('a[target="_blank"]').all()) {
              await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
              await expect(link).toHaveAttribute('rel', /\bnoreferrer\b/);
              await expect(link.locator(`span.sr-only[lang="${lang}"]`)).toHaveText(
                dict['a11y.newTab'],
              );
            }
          }
        });

        test('shows the click-to-load facade for an embed, never the unknown note (D-07)', async ({
          page,
        }) => {
          await page.goto(detail.href);
          const facade = page.locator(`${STACK} [data-embed-facade]`);
          await expect(facade).toHaveCount(detail.hasEmbed ? 1 : 0);
          await expect(page.locator('iframe')).toHaveCount(0);
          if (!detail.hasEmbed) {
            await expect(page.locator('[data-embed-facade]')).toHaveCount(0);
            return;
          }
          // Every module of this project is mirrored, so the D-08 note must not appear.
          const note = page.locator(STACK).getByText(dict['detail.unknown.body'], { exact: true });
          await expect(note).toHaveCount(0);
          await expect(facade).toContainText(dict['detail.embed.label']);
          await expect(facade).toContainText(
            dict['detail.embed.note'].replace('{provider}', 'Figma'),
          );
          await expect(facade.locator('[data-embed-load]')).toBeVisible();
          const link = page.locator(STACK).locator('a', { hasText: dict['detail.embed.fallback'] });
          await expect(link).toHaveAttribute('href', detail.behanceUrl);
          await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
        });

        test('gives every new-tab link rel noopener noreferrer and the hint (T-04-03)', async ({
          page,
        }) => {
          await page.goto(detail.href);
          const links = page.locator('a[target="_blank"]');
          expect(await links.count()).toBeGreaterThan(0);
          const hint = new RegExp(`${dict['a11y.newTab'].replace(/[()]/g, '\\$&')}$`);
          for (const link of await links.all()) {
            await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
            await expect(link).toHaveAttribute('rel', /\bnoreferrer\b/);
            await expect(link).toHaveAccessibleName(hint);
          }
        });

        test('does not repeat the cover (D-11)', async ({ page }) => {
          await page.goto(detail.href);
          const sources = await page
            .locator('article img, article source')
            .evaluateAll((els) =>
              els.flatMap((el) => [el.getAttribute('src') ?? '', el.getAttribute('srcset') ?? '']),
            );
          for (const source of sources) expect(source).not.toContain(detail.coverStem);
        });
      });
    }
  });
}

// Click-to-load embed facade (D-07, Pitfall 6). Figma is never reached: its embed origin is
// routed to a local stub, and the request log proves nothing leaves the preview server first.
const FIGMA_EMBED = 'https://embed.figma.com/**';
const FIGMA_STUB =
  '<!doctype html><html lang="en"><head><title>Prototype stub</title></head><body><main><p>stub</p></main></body></html>';
const SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';

async function stubFigma(page: Page): Promise<string[]> {
  const hits: string[] = [];
  await page.route(FIGMA_EMBED, (route) => {
    hits.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/html', body: FIGMA_STUB });
  });
  return hits;
}

for (const { lang, dict } of cases) {
  const embedPages = expectedDetails(lang).filter((detail) => detail.hasEmbed);

  test.describe(`embed facade (${lang})`, () => {
    test('at least one detail page carries an embed', () => {
      expect(embedPages.length).toBeGreaterThan(0);
    });

    for (const detail of embedPages) {
      test(`${detail.href} makes no third-party request before activation`, async ({
        page,
        baseURL,
      }) => {
        const origin = new URL(baseURL ?? 'http://localhost:4400').host;
        const hosts = new Set<string>();
        page.on('request', (request) => {
          const url = new URL(request.url());
          if (url.protocol === 'http:' || url.protocol === 'https:') hosts.add(url.host);
        });
        const hits = await stubFigma(page);
        await page.goto(detail.href);
        await page.evaluate(() => {
          window.scrollTo(0, document.documentElement.scrollHeight);
        });
        await page.waitForLoadState('networkidle');
        expect([...hosts]).toEqual([origin]);
        expect(hits).toEqual([]);
        await expect(page.locator('iframe')).toHaveCount(0);
        expect(await page.content()).not.toMatch(/rel="preconnect"[^>]*figma/);
      });

      test(`${detail.href} loads a sandboxed, focused iframe on click`, async ({ page }) => {
        const hits = await stubFigma(page);
        await page.goto(detail.href);
        const facade = page.locator('[data-embed-facade]');
        const src = await facade.getAttribute('data-src');
        expect(src).toMatch(/^https:\/\/embed\.figma\.com\//);

        await facade.getByRole('button', { name: dict['detail.embed.load'] }).click();

        const iframe = facade.locator('iframe');
        await expect(iframe).toHaveCount(1);
        await expect(facade.locator('> *')).toHaveCount(1);
        await expect(iframe).toHaveAttribute('src', src ?? '');
        await expect(iframe).toHaveAttribute('title', /\S/);
        await expect(iframe).toHaveAttribute('sandbox', SANDBOX);
        await expect(iframe).toHaveAttribute('allow', 'fullscreen');
        await expect(iframe).toHaveAttribute('allowfullscreen', '');
        await expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        await expect(facade).toHaveClass(/\baspect-video\b/);
        await expect(facade).not.toHaveClass(/\bmin-h-64\b/);
        expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('IFRAME');
        await expect.poll(() => hits.length).toBeGreaterThan(0);
        // The Behance link stays below as the recovery path.
        await expect(
          page.locator(STACK).locator('a', { hasText: dict['detail.embed.fallback'] }),
        ).toBeVisible();
      });
    }

    test.describe('without JavaScript', () => {
      test.use({ javaScriptEnabled: false });

      for (const detail of embedPages) {
        test(`${detail.href} keeps the label, note and Behance link, button hidden`, async ({
          page,
        }) => {
          await page.goto(detail.href);
          const facade = page.locator('[data-embed-facade]');
          await expect(facade).toContainText(dict['detail.embed.label']);
          await expect(facade.locator('[data-embed-load]')).toBeHidden();
          const link = page.locator(STACK).locator('a', { hasText: dict['detail.embed.fallback'] });
          await expect(link).toBeVisible();
          await expect(link).toHaveAttribute('href', detail.behanceUrl);
          await expect(page.locator('iframe')).toHaveCount(0);
        });
      }
    });
  });
}
