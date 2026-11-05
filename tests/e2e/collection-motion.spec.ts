import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';

// CollectionModule cell drift (MOTN-06; 07-14, user decision Q5 at 07-10; UI-SPEC "Parallax").
// Each eligible grid cell is an overflow-clip parallax frame; its image drifts gently inside it,
// scrubbed by scroll (CSS scroll-driven, zero JS), under 'on' only. Cells of one justified row move
// as one, the grid stays seamless, and 'reduced', 'off' and print leave the Phase 4/6 box.
// InstaBlogs is the only project with MediaCollectionModules (9 of them).

const PATH = '/projects/website-instablogs/';
const ES_PATH = '/es/projects/website-instablogs/';
const COLLECTION = '[data-collection]';
const DRIFT_CELL = `${COLLECTION} [data-parallax-frame]`;

const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;

async function frames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

/** Scrolls so the element's top sits `offset` px below the viewport top, then lets Lenis settle. */
async function scrollTo(page: Page, element: Locator, offset: number): Promise<void> {
  await element.evaluate((node, below) => {
    const top = node.getBoundingClientRect().top + window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: Math.max(0, Math.min(max, top - below)), behavior: 'instant' });
  }, offset);
  await page.waitForTimeout(250);
  await frames(page);
}

interface CellReading {
  translate: string;
  /** Image top minus frame top, in px. */
  offset: number;
  imageTop: number;
  imageBottom: number;
  frameTop: number;
  frameBottom: number;
  frameHeight: number;
}

function readCell(cell: Locator): Promise<CellReading> {
  return cell.evaluate((frame) => {
    const image = frame.querySelector('img');
    if (image === null) throw new Error('collection: cell has no image');
    const f = frame.getBoundingClientRect();
    const i = image.getBoundingClientRect();
    return {
      translate: getComputedStyle(image).translate,
      offset: i.top - f.top,
      imageTop: i.top,
      imageBottom: i.bottom,
      frameTop: f.top,
      frameBottom: f.bottom,
      frameHeight: f.height,
    };
  });
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Every cell box, grouped per collection and per row, in document coordinates. */
function cellBoxes(page: Page): Promise<Box[][][]> {
  return page.locator(COLLECTION).evaluateAll((collections) =>
    collections.map((collection) =>
      [...collection.children].map((row) =>
        [...row.children].map((cell) => {
          const r = cell.getBoundingClientRect();
          return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height };
        }),
      ),
    ),
  );
}

async function reducedPage(
  browser: Browser,
  size: { width: number; height: number },
): Promise<Page> {
  const context = await browser.newContext({ viewport: size, reducedMotion: 'reduce' });
  return context.newPage();
}

for (const size of WIDTHS) {
  test.describe(`collection drift under on (${String(size.width)})`, () => {
    test.use({ viewport: size });

    test('a drifting cell moves with scroll and never shows an edge', async ({ page }) => {
      await page.goto(PATH);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      const cell = page.locator(DRIFT_CELL).nth(1);
      await expect(cell.locator('img')).toHaveAttribute('data-parallax', '');
      const vh = size.height;
      await scrollTo(page, cell, vh * 0.6);
      const a = await readCell(cell);
      await scrollTo(page, cell, vh * 0.6 - 200);
      const b = await readCell(cell);
      expect(a.translate).not.toBe(b.translate);
      expect(b.offset).toBeGreaterThan(a.offset);
      for (const reading of [a, b]) {
        // At rest the image sits 1.5% of the cell above it (overscan); the translate stays inside.
        const travel = reading.offset + reading.frameHeight * 0.015;
        expect(Math.abs(travel)).toBeLessThanOrEqual(reading.frameHeight * 0.015 + 0.5);
        expect(reading.imageTop).toBeLessThanOrEqual(reading.frameTop + 0.5);
        expect(reading.imageBottom).toBeGreaterThanOrEqual(reading.frameBottom - 0.5);
      }
    });

    test('the grid is seamless and the page height matches reduced', async ({ page, browser }) => {
      await page.goto(PATH);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      const on = await cellBoxes(page);
      const near = (a: number, b: number): void => {
        expect(Math.abs(a - b)).toBeLessThanOrEqual(0.5);
      };
      for (const collection of on) {
        if (size.width >= 640) {
          // Justified rows: cells touch side by side, share top and height, rows touch.
          collection.forEach((row, r) => {
            row.forEach((cell, c) => {
              const right = row[c + 1];
              if (right === undefined) return;
              near(right.x, cell.x + cell.width);
              near(right.y, cell.y);
              near(right.height, cell.height);
            });
            const first = row[0];
            const below = collection[r + 1]?.[0];
            if (first !== undefined && below !== undefined) near(below.y, first.y + first.height);
          });
        } else {
          // Below sm every cell stacks full width: each one starts where the previous ends.
          const stack = collection.flat();
          stack.forEach((cell, index) => {
            const below = stack[index + 1];
            if (below !== undefined) near(below.y, cell.y + cell.height);
          });
        }
      }
      const onHeight = await page.evaluate(() => document.documentElement.scrollHeight);

      const other = await reducedPage(browser, size);
      await other.goto(PATH);
      await expect(other.locator('html')).toHaveAttribute('data-motion', 'reduced');
      const reduced = await cellBoxes(other);
      const reducedHeight = await other.evaluate(() => document.documentElement.scrollHeight);
      await other.context().close();

      expect(Math.abs(onHeight - reducedHeight)).toBeLessThanOrEqual(0.5);
      expect(on.flat(2)).toHaveLength(reduced.flat(2).length);
      on.flat(2).forEach((cell, index) => {
        const twin = reduced.flat(2)[index];
        expect(Math.abs(cell.width - (twin?.width ?? -1))).toBeLessThanOrEqual(0.5);
        expect(Math.abs(cell.height - (twin?.height ?? -1))).toBeLessThanOrEqual(0.5);
      });
    });
  });
}

test.describe('collection row unison (1440)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('every drifting cell of a row moves by the same amount', async ({ page }) => {
    await page.goto(PATH);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    // The first row of 2+ drifting cells.
    const rowIndex = await page
      .locator(`${COLLECTION} > div`)
      .evaluateAll((rows) =>
        rows.findIndex((row) => row.querySelectorAll(':scope > [data-parallax-frame]').length > 1),
      );
    expect(rowIndex).toBeGreaterThanOrEqual(0);
    const row = page.locator(`${COLLECTION} > div`).nth(rowIndex);
    const cells = row.locator(':scope > [data-parallax-frame]');
    const count = await cells.count();
    for (const below of [700, 450, 200]) {
      await scrollTo(page, row, below);
      const readings = await Promise.all(
        Array.from({ length: count }, (_, index) => readCell(cells.nth(index))),
      );
      const [first, ...rest] = readings;
      if (first === undefined) throw new Error('collection: empty row');
      for (const reading of rest) {
        expect(Math.abs(reading.offset - first.offset)).toBeLessThanOrEqual(0.5);
      }
    }
  });
});

async function expectStillCells(page: Page): Promise<void> {
  const states = await page.locator(`${COLLECTION} img`).evaluateAll((images) =>
    images.map((image) => {
      const cell = image.closest('[data-collection] > div > div');
      return {
        translate: getComputedStyle(image).translate,
        imageHeight: image.getBoundingClientRect().height,
        frameHeight: cell?.getBoundingClientRect().height ?? -1,
      };
    }),
  );
  expect(states.length).toBeGreaterThan(0);
  for (const state of states) {
    expect(state.translate).toBe('none');
    expect(Math.abs(state.imageHeight - state.frameHeight)).toBeLessThanOrEqual(0.5);
  }
}

test.describe('collection still states', () => {
  test.describe('reduced (OS setting)', () => {
    test.use({ reducedMotion: 'reduce' });

    test('every collection image is still and cell-sized', async ({ page }) => {
      for (const path of [PATH, ES_PATH]) {
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
        await scrollTo(page, page.locator(COLLECTION).nth(2), 200);
        await expectStillCells(page);
      }
    });
  });

  test('off (no matchMedia): every collection image is still', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true });
    });
    await page.goto(PATH);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await scrollTo(page, page.locator(COLLECTION).nth(2), 200);
    await expectStillCells(page);
  });

  test('print resets every collection image to its cell', async ({ page }) => {
    await page.goto(PATH);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await scrollTo(page, page.locator(DRIFT_CELL).nth(1), 400);
    await page.emulateMedia({ media: 'print' });
    await frames(page);
    await expectStillCells(page);
  });
});

test.describe('collection eligibility', () => {
  test('the eager image and image modules of an opted-out project never drift', async ({
    page,
  }) => {
    await page.goto(PATH);
    const eager = page.locator('main img[fetchpriority="high"]');
    await expect(eager).toHaveCount(1);
    await expect(eager).not.toHaveAttribute('data-parallax');
    // InstaBlogs lists every ImageModule in stackMotion: none slides in, only grid cells drift.
    await expect(page.locator('[data-stack-enter]')).toHaveCount(0);
    const cells = await page.locator(`${COLLECTION} > div > div`).count();
    await expect(page.locator(DRIFT_CELL)).toHaveCount(cells);
    // A collection cell that is eager (a project starting with a grid) never gets the hooks: unit
    // tested in project-detail-site.test.ts, as no snapshot project starts with a collection.
  });
});
