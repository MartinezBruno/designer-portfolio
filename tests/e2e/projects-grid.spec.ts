import { expect, test, type Page } from '@playwright/test';

/**
 * Grid contract for the Projects page (D-18, UI-SPEC ProjectGrid / ProjectCard):
 * fixed size rhythm by position, reading order = DOM order, loading priority and focus ring.
 */

const paths = ['/projects/', '/es/projects/'] as const;

const TILE = 'main ul:has(> li > article) > li';
const GRID = 'main ul:has(> li > article)';

interface Box {
  top: number;
  left: number;
  right: number;
  width: number;
}

async function tileBoxes(page: Page): Promise<Box[]> {
  return page.locator(TILE).evaluateAll((els) =>
    els.map((el) => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, left: rect.left, right: rect.right, width: rect.width };
    }),
  );
}

for (const path of paths) {
  test.describe(`projects grid ${path}`, () => {
    test('desktop tiles follow the L S · S L · L S · · E rhythm in DOM order', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      const boxes = await tileBoxes(page);
      expect(boxes).toHaveLength(7);

      const sorted = boxes
        .map((box, index) => ({ index, top: Math.round(box.top), left: Math.round(box.left) }))
        .sort((a, b) => a.top - b.top || a.left - b.left)
        .map((entry) => entry.index);
      expect(sorted).toEqual(boxes.map((_, index) => index));

      const [l0, s1, s2, l3, , , e6] = boxes;
      if (!l0 || !s1 || !s2 || !l3 || !e6) throw new Error('expected 7 tiles');
      expect(l0.width).toBeGreaterThan(s1.width);
      expect(Math.abs(s1.width - s2.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(l3.width - l0.width)).toBeLessThanOrEqual(1);

      const grid = await page.locator(GRID).evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      });
      expect(Math.abs(e6.right - grid.right)).toBeLessThanOrEqual(1);
      expect(e6.left).toBeGreaterThan(grid.left + 100);
    });

    test('mobile is a single column, top to bottom', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      const boxes = await tileBoxes(page);
      expect(boxes.length).toBeGreaterThan(1);
      const first = boxes[0];
      if (!first) throw new Error('expected tiles');
      for (const [index, box] of boxes.entries()) {
        expect(Math.abs(box.width - first.width)).toBeLessThanOrEqual(1);
        const previous = boxes[index - 1];
        if (previous) expect(box.top).toBeGreaterThan(previous.top);
      }
    });

    test('only the first cover is eager with high fetch priority', async ({ page }) => {
      await page.goto(path);
      const images = await page.locator(`${TILE} img`).evaluateAll((els) =>
        els.map((el) => ({
          loading: el.getAttribute('loading'),
          fetchpriority: el.getAttribute('fetchpriority'),
          width: el.getAttribute('width'),
          height: el.getAttribute('height'),
        })),
      );
      expect(images.length).toBeGreaterThan(1);
      for (const [index, image] of images.entries()) {
        if (index === 0) {
          expect(image.loading).toBe('eager');
          expect(image.fetchpriority).toBe('high');
        } else {
          expect(image.loading).toBe('lazy');
          expect(image.fetchpriority).toBeNull();
        }
        expect(image.width).toMatch(/^\d+$/);
        expect(image.height).toMatch(/^\d+$/);
      }
    });

    test('the focused card link draws a solid outline on ::after', async ({ page }) => {
      await page.goto(path);
      let onCard = false;
      for (let presses = 0; presses < 40 && !onCard; presses += 1) {
        await page.keyboard.press('Tab');
        onCard = await page.evaluate(
          () => document.activeElement?.matches('main article a') ?? false,
        );
      }
      expect(onCard).toBe(true);
      const outline = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return getComputedStyle(el, '::after').outlineStyle;
      });
      expect(outline).toBe('solid');
    });

    test('each card exposes exactly one link', async ({ page }) => {
      await page.goto(path);
      const articles = await page.locator('main article').count();
      expect(articles).toBeGreaterThan(0);
      await expect(page.locator('main article a')).toHaveCount(articles);
    });

    test('the grid never uses dense auto-flow', async ({ page }) => {
      await page.goto(path);
      const flow = await page.locator(GRID).evaluate((el) => getComputedStyle(el).gridAutoFlow);
      expect(flow).toBe('row');
    });
  });
}
