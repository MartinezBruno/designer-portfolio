import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import services from '../../src/data/services.json' with { type: 'json' };
import { interpolate } from '../../src/i18n/t';
import { en, type Dictionary } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { AXE_TAGS } from './helpers/axe';
import { tabUntil } from './helpers/keyboard';
import { settleMotion } from './helpers/motion';
import { softNavigate, waitForNavigationIdle } from './helpers/navigation';

// Phase 9 category filter end to end (PROJ-04, PROJ-07; D-11..D-15, 09-UI-SPEC Feature 3 and its
// Accessibility and URL contracts), in EN and ES. Data (D-17): web-design x3, graphic-design x2,
// branding x1, social-media x1; no Photography chip (D-13).

const cases = [
  { locale: 'en', path: '/projects/', dict: en, home: '/' },
  { locale: 'es', path: '/es/projects/', dict: es, home: '/es/' },
] as const;

type Locale = (typeof cases)[number]['locale'];

const CHIP_IDS = ['', 'graphic-design', 'web-design', 'branding', 'social-media'] as const;
const FULL_RHYTHM = ['large', 'small', 'small', 'large', 'large', 'small', 'large-end'];

const ITEMS = '[data-project-grid] > li[data-tile]';
const VISIBLE = `${ITEMS}:not([hidden])`;
const STATUS = '[data-project-filter-status]';

function title(id: string, locale: Locale): string {
  const service = services.find((entry) => entry.id === id);
  if (service === undefined) throw new Error(`projects-filter: no service ${id}`);
  return service.title[locale];
}

function chipLabel(id: string, dict: Dictionary, locale: Locale): string {
  return id === '' ? dict['projects.filter.all'] : title(id, locale);
}

function radioId(id: string): string {
  return id === '' ? 'projects-filter-all' : `projects-filter-${id}`;
}

/** The visible chip: the radio itself is sr-only, so a pointer user clicks its label. */
function chip(page: Page, id: string): Locator {
  return page.locator(`label[for="${radioId(id)}"]`);
}

async function tiles(page: Page): Promise<(string | null)[]> {
  return page.locator(VISIBLE).evaluateAll((els) => els.map((el) => el.getAttribute('data-tile')));
}

async function categoryParam(page: Page): Promise<string | null> {
  return new URL(page.url()).searchParams.get('category');
}

for (const { locale, path, dict, home } of cases) {
  test.describe(`projects filter (${locale})`, () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    test('renders the chips in services order with All checked and no Photography', async ({
      page,
    }) => {
      await page.goto(path);
      const radios = page.locator('fieldset[data-project-filter] input[type="radio"]');
      await expect(radios).toHaveCount(CHIP_IDS.length);
      const values = await radios.evaluateAll((els) =>
        els.map((el) => (el as HTMLInputElement).value),
      );
      expect(values).toEqual([...CHIP_IDS]);
      for (const id of CHIP_IDS) {
        await expect(chip(page, id)).toHaveText(chipLabel(id, dict, locale));
      }
      await expect(page.locator('#projects-filter-all')).toBeChecked();
      await expect(page.locator('#projects-filter-photography')).toHaveCount(0);
    });

    test('a chip filters and re-flows in place; All restores the full rhythm', async ({ page }) => {
      await page.goto(path);
      await settleMotion(page);
      const before = await page.evaluate(() => history.length);

      await chip(page, 'web-design').click();
      await expect(page.locator(VISIBLE)).toHaveCount(3);
      expect(await tiles(page)).toEqual(['large', 'small', 'large-end']);
      const hiddenFlags = await page
        .locator(`${ITEMS}`)
        .evaluateAll((els) =>
          els
            .filter((el) => el.getAttribute('data-category') !== 'web-design')
            .map((el) => el.hasAttribute('hidden')),
        );
      expect(hiddenFlags).toEqual([true, true, true, true]);
      expect(page.url()).toMatch(/\?category=web-design$/);
      expect(await page.evaluate(() => history.length)).toBe(before);
      await expect(page.locator(STATUS)).toHaveText(
        interpolate(dict['projects.filter.status.many'], {
          count: 3,
          category: title('web-design', locale),
        }),
      );

      // No grid hole: large + small share the first row and fill it; the odd last tile is
      // centred (finish-review redesign, as in projects-grid.spec.ts), not orphaned at the left.
      await settleMotion(page);
      const grid = await page
        .locator('[data-project-grid]')
        .evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);
      const boxes = await page
        .locator(VISIBLE)
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
      const [first, second, last] = boxes;
      if (!first || !second || !last) throw new Error('expected 3 visible tiles');
      expect(Math.abs(first.top - second.top)).toBeLessThanOrEqual(1);
      expect(Math.abs(first.left - grid.left)).toBeLessThanOrEqual(1);
      expect(Math.abs(second.right - grid.right)).toBeLessThanOrEqual(1);
      expect(last.top).toBeGreaterThan(first.top);
      const leftGap = last.left - grid.left;
      expect(leftGap).toBeGreaterThan(100);
      expect(Math.abs(leftGap - (grid.right - last.right))).toBeLessThanOrEqual(2);

      await chip(page, '').click();
      await expect(page.locator(VISIBLE)).toHaveCount(7);
      expect(await tiles(page)).toEqual(FULL_RHYTHM);
      expect(await categoryParam(page)).toBeNull();
      expect(page.url()).not.toContain('category');
      expect(await page.evaluate(() => history.length)).toBe(before);
      await expect(page.locator(STATUS)).toHaveText(
        interpolate(dict['projects.filter.status.all'], { count: 7 }),
      );
    });

    test('a deep link loads filtered and silent; invalid values fall back and are cleaned', async ({
      page,
    }) => {
      await page.goto(`${path}?category=branding`);
      await expect(page.locator(VISIBLE)).toHaveCount(1);
      expect(await tiles(page)).toEqual(['large']);
      await expect(page.locator('#projects-filter-branding')).toBeChecked();
      await expect(page.locator(STATUS)).toHaveText('');

      for (const search of ['?category=bogus', '?category=', '?category=%3Cscript%3E']) {
        await page.goto(`${path}${search}`);
        await expect(page.locator(VISIBLE)).toHaveCount(7);
        await expect(page.locator('#projects-filter-all')).toBeChecked();
        await expect.poll(() => page.url()).not.toContain('category');
        await expect(page.locator(STATUS)).toHaveText('');
      }
    });

    test('Back from a project restores the filtered list and its scroll offset', async ({
      page,
    }) => {
      await page.goto(`${path}?category=web-design`);
      await settleMotion(page);
      const card = page.locator(VISIBLE).nth(1);
      await card.scrollIntoViewIfNeeded();
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 300);
          }),
      );
      const recorded = await page.evaluate(() => window.scrollY);
      expect(recorded).toBeGreaterThan(0);

      await softNavigate(page, card.locator('article a').first());
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}[a-z0-9-]+\\/$`));

      await page.goBack();
      await page.waitForLoadState('load');
      await waitForNavigationIdle(page);
      expect(await categoryParam(page)).toBe('web-design');
      await expect(page.locator(VISIBLE)).toHaveCount(3);
      await expect(page.locator('#projects-filter-web-design')).toBeChecked();
      await expect
        .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - recorded))
        .toBeLessThanOrEqual(100);
    });

    test('keyboard: one stop on the checked chip, arrows filter, Tab reaches the first card', async ({
      page,
    }) => {
      await page.goto(path);
      await settleMotion(page);
      await tabUntil(page, 'input[name="category"]');
      await expect(page.locator('#projects-filter-all')).toBeFocused();

      await page.keyboard.press('ArrowRight');
      await expect(page.locator('#projects-filter-graphic-design')).toBeChecked();
      await expect(page.locator('#projects-filter-graphic-design')).toBeFocused();
      await expect(page.locator(VISIBLE)).toHaveCount(2);

      await page.keyboard.press('Tab');
      const firstLink = page.locator(VISIBLE).first().locator('article a').first();
      await expect(firstLink).toBeFocused();
      await expect(page.locator(VISIBLE).first()).toHaveAttribute(
        'data-category',
        'graphic-design',
      );
    });

    test('the skip link on a filtered page jumps to #main with no router swap', async ({
      page,
    }) => {
      await page.goto(path);
      await settleMotion(page);
      await chip(page, 'web-design').click();
      await expect(page.locator(VISIBLE)).toHaveCount(3);

      await tabUntil(page, 'a[href="#main"]', { reverse: true });
      await page.evaluate(() => {
        const w = window as Window & { __sawVt?: boolean };
        w.__sawVt = false;
        new MutationObserver(() => {
          if (document.documentElement.hasAttribute('data-vt')) w.__sawVt = true;
        }).observe(document.documentElement, { attributes: true });
      });
      await page.keyboard.press('Enter');
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 500);
          }),
      );
      expect(
        await page.evaluate(() => (window as Window & { __sawVt?: boolean }).__sawVt === true),
      ).toBe(false);
      await expect(page.locator('#main')).toBeFocused();
      expect(page.url()).toContain('?category=web-design');
      expect(page.url()).toMatch(/#main$/);
    });

    // 09-REVIEW WR-01: choosing All (or loading an invalid value that gets cleaned) empties the
    // live search while the router still remembers the load-time one; the skip link must stay a
    // local jump, never a swap of /projects/ onto itself.
    for (const { name, search, choose } of [
      { name: 'after choosing All', search: '?category=web-design', choose: true },
      { name: 'after an invalid value is cleaned', search: '?category=bogus', choose: false },
    ]) {
      test(`WR-01: the skip link on an emptied URL ${name} stays local`, async ({ page }) => {
        await page.goto(`${path}${search}`);
        await settleMotion(page);
        if (choose) {
          await chip(page, '').click();
          await expect(page.locator(VISIBLE)).toHaveCount(7);
        }
        await expect.poll(() => new URL(page.url()).search).toBe('');

        await tabUntil(page, 'a[href="#main"]', { reverse: true });
        const length = await page.evaluate(() => {
          const w = window as Window & { __swapped?: boolean };
          w.__swapped = false;
          document.addEventListener('astro:before-swap', () => {
            w.__swapped = true;
          });
          // An expando on the live <main>: a swap replaces the body, so it would not survive.
          (document.getElementById('main') as HTMLElement & { __marker?: string }).__marker =
            'kept';
          return history.length;
        });
        await page.keyboard.press('Enter');
        await page.evaluate(
          () =>
            new Promise((resolve) => {
              setTimeout(resolve, 500);
            }),
        );
        const after = await page.evaluate(() => ({
          swapped: (window as Window & { __swapped?: boolean }).__swapped === true,
          marker: (document.getElementById('main') as HTMLElement & { __marker?: string }).__marker,
          length: history.length,
        }));
        expect(after).toEqual({ swapped: false, marker: 'kept', length });
        await expect(page.locator('#main')).toBeFocused();
        expect(new URL(page.url()).search).toBe('');
        expect(page.url()).toMatch(/#main$/);
      });
    }

    test('one announcement per change after three round trips (no lifecycle leak)', async ({
      page,
    }) => {
      await page.goto(path);
      const banner = page.getByRole('banner');
      const projectsLink = banner
        .getByRole('navigation', { name: dict['nav.label'], exact: true })
        .getByRole('link', { name: dict['nav.projects'], exact: true });
      const homeLink = banner.locator(`a[href="${home}"]`).first();
      for (let round = 0; round < 3; round += 1) {
        await softNavigate(page, homeLink);
        await expect(page).toHaveURL(new RegExp(`${home.replace(/\//g, '\\/')}$`));
        await softNavigate(page, projectsLink);
        await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}$`));
      }
      await page.evaluate((selector) => {
        const w = window as Window & { __statusWrites?: string[] };
        w.__statusWrites = [];
        const status = document.querySelector(selector);
        if (status === null) throw new Error('no status region');
        new MutationObserver((records) => {
          for (const record of records) {
            if (record.type === 'childList' && record.addedNodes.length > 0)
              w.__statusWrites?.push(status.textContent ?? '');
          }
        }).observe(status, { childList: true, characterData: true, subtree: true });
      }, STATUS);
      await chip(page, 'branding').click();
      await expect(page.locator(VISIBLE)).toHaveCount(1);
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 300);
          }),
      );
      const writes = await page.evaluate(
        () => (window as Window & { __statusWrites?: string[] }).__statusWrites ?? [],
      );
      expect(writes).toEqual([
        interpolate(dict['projects.filter.status.one'], {
          count: 1,
          category: title('branding', locale),
        }),
      ]);
    });

    for (const search of ['', '?category=web-design']) {
      test(`axe: zero WCAG 2.2 AA violations on ${path}${search}`, async ({ page }) => {
        await page.goto(`${path}${search}`);
        await settleMotion(page);
        const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        expect(violations).toEqual([]);
      });
    }
  });

  test.describe(`projects filter, reduced motion (${locale})`, () => {
    test.use({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });

    test('a change applies at once and every visible card is fully opaque', async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('load');
      await chip(page, 'web-design').click();
      // No waiting: the change is synchronous when motion is off.
      expect(await page.locator(VISIBLE).count()).toBe(3);
      expect(await tiles(page)).toEqual(['large', 'small', 'large-end']);
      const opacities = await page
        .locator(VISIBLE)
        .evaluateAll((els) =>
          els.flatMap((el) => [
            getComputedStyle(el).opacity,
            ...[...el.querySelectorAll('[data-reveal]')].map(
              (target) => getComputedStyle(target).opacity,
            ),
          ]),
        );
      expect(opacities.length).toBeGreaterThan(3);
      for (const opacity of opacities) expect(opacity).toBe('1');
    });
  });

  test.describe(`projects filter, no JS (${locale})`, () => {
    test.use({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });

    test('shows no chips and all seven projects', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('fieldset[data-project-filter]')).toBeHidden();
      await expect(page.locator(ITEMS)).toHaveCount(7);
      for (const li of await page.locator(ITEMS).all()) await expect(li).toBeVisible();
    });
  });
}
