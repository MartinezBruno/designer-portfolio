import { expect, test, type Page } from '@playwright/test';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { headerSteps, tabAndExpect, tabUntil } from './helpers/keyboard';
import { waitForNavigationIdle } from './helpers/navigation';
import { expectedDetails, expectedProjects } from './helpers/projects';

// 08-06 (QUAL-02, D-09): every interactive journey on the site, driven by the keyboard alone, in EN
// and ES. Only page.keyboard moves focus or activates controls here: no clicks and no .focus().
// Filters (PROJ-04..07) are N/A: with 7 projects (fewer than 8) the Projects page renders no filter
// controls, so there is nothing to test (recorded in 08-06-SUMMARY.md).

const cases = [
  { locale: 'en', prefix: '/', dict: en, other: 'es', otherPrefix: '/es/' },
  { locale: 'es', prefix: '/es/', dict: es, other: 'en', otherPrefix: '/' },
] as const;

function collectErrors(page: Page, ignore: RegExp | null = null): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = `${message.text()} ${message.location().url}`;
    if (ignore !== null && ignore.test(text)) return;
    errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Loads a page and waits until the page scripts have mounted (the head gate resolved 'on'). */
async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
}

/** Presses Enter on the focused link and waits for the soft navigation to land on `path`. */
async function enterAndArrive(page: Page, path: string): Promise<void> {
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`^http://localhost:\\d+${path}$`));
  await waitForNavigationIdle(page);
  // D-14: focus lands on the page heading after every navigation.
  await expect(page.locator('main h1')).toBeFocused();
}

const focusedTag = (page: Page): Promise<string | undefined> =>
  page.evaluate(() => document.activeElement?.tagName);

for (const { locale, prefix, dict, other, otherPrefix } of cases) {
  test.describe(`keyboard journeys (${locale})`, () => {
    test.describe('navigation, toggles and projects', () => {
      let errors: string[] = [];

      test.beforeEach(({ page }) => {
        errors = collectErrors(page);
      });

      test.afterEach(() => {
        expect(errors).toEqual([]);
      });

      test(`1. skip link reaches #main on ${prefix}`, async ({ page }) => {
        await open(page, prefix);
        await page.keyboard.press('Tab');
        const skip = page.getByRole('link', { name: dict['a11y.skipToContent'], exact: true });
        await expect(skip).toBeFocused();
        await expect(skip).toBeInViewport();
        await page.keyboard.press('Enter');
        await expect(page.locator('#main')).toBeFocused();
      });

      test(`2. header nav has visible focus on every stop on ${prefix}projects/`, async ({
        page,
      }) => {
        await open(page, `${prefix}projects/`);
        for (const step of headerSteps(dict, prefix, '/projects/', '/es/projects/')) {
          await tabAndExpect(page, step);
        }
      });

      test(`3. language switch lands on the equivalent ${other} page`, async ({ page }) => {
        await open(page, `${prefix}projects/`);
        await tabUntil(page, `header a[href="${otherPrefix}projects/"]`);
        await enterAndArrive(page, `${otherPrefix}projects/`);
        await expect(page.locator('html')).toHaveAttribute('lang', other);
        await expect(page.locator('main h1')).toHaveText(
          (other === 'en' ? en : es)['projects.heading'],
        );
      });

      test(`4. motion toggle cycles by keyboard on ${prefix}`, async ({ page }) => {
        await open(page, prefix);
        await tabUntil(page, '[data-motion-toggle]');
        const toggle = page.locator('[data-motion-toggle]');
        const html = page.locator('html');
        const ringVisible = (): Promise<string> =>
          toggle.evaluate((el) => getComputedStyle(el).outlineStyle);

        await page.keyboard.press('Enter');
        await expect(html).toHaveAttribute('data-motion', 'reduced');
        await expect(toggle).toHaveAttribute('aria-pressed', 'true');
        await expect(toggle).toBeFocused();
        expect(await ringVisible()).not.toBe('none');

        await page.keyboard.press('Space');
        await expect(html).toHaveAttribute('data-motion', 'on');
        await expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await expect(toggle).toBeFocused();
        expect(await ringVisible()).not.toBe('none');
      });

      test(`5. marquee pauses and resumes by keyboard on ${prefix}`, async ({ page }) => {
        await open(page, prefix);
        const toggle = page.locator('[data-marquee-toggle]');
        const band = page.locator('[data-marquee] ul:not([aria-hidden])').first();
        const playState = (): Promise<string> =>
          band.evaluate((el) => getComputedStyle(el).animationPlayState);
        const expectBand = async (paused: boolean): Promise<void> => {
          await expect(toggle).toHaveAttribute('aria-pressed', paused ? 'true' : 'false');
          await expect.poll(playState).toBe(paused ? 'paused' : 'running');
        };

        await expectBand(false);
        await tabUntil(page, '[data-marquee-toggle]');
        // 08-01 / WCAG 2.2.2: keyboard focus alone holds the band (no explicit choice yet).
        await expectBand(true);
        // Space flips what is visible: an explicit resume, then an explicit pause.
        await page.keyboard.press('Space');
        await expectBand(false);
        await page.keyboard.press('Space');
        await expectBand(true);
        await expect(toggle).toBeFocused();
        // The explicit pause holds after focus moves on.
        await page.keyboard.press('Tab');
        await expectBand(true);
      });

      test(`6. project card -> detail -> next -> previous on ${prefix}projects/`, async ({
        page,
      }) => {
        const details = expectedDetails(locale);
        const first = details.find((entry) => entry.href === expectedProjects(locale)[0]?.href);
        if (first === undefined || first.next === null) throw new Error('no first project');
        const second = details.find((entry) => entry.href === first.next?.href);
        if (second === undefined) throw new Error('no next project');
        expect(second.previous?.href).toBe(first.href);

        await open(page, `${prefix}projects/`);
        await tabUntil(page, `main a[href="${first.href}"]`);
        await enterAndArrive(page, first.href);
        await expect(page.locator('main h1')).toHaveText(first.title);

        await tabUntil(page, `a[href="${second.href}"]`, { max: 40 });
        await enterAndArrive(page, second.href);
        await expect(page.locator('main h1')).toHaveText(second.title);

        await tabUntil(page, `a[href="${first.href}"]`, { max: 40 });
        await enterAndArrive(page, first.href);
        await expect(page.locator('main h1')).toHaveText(first.title);
      });

      test(`7. embed facade loads by keyboard and focus moves into the iframe (${locale})`, async ({
        page,
      }) => {
        const detail = expectedDetails(locale).find((entry) => entry.hasEmbed);
        if (detail === undefined) throw new Error('no detail page with an embed');
        await page.route('https://embed.figma.com/**', (route) =>
          route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<!doctype html><html lang="en"><head><title>Prototype stub</title></head><body><main><p>stub</p></main></body></html>',
          }),
        );
        await open(page, detail.href);
        await tabUntil(page, 'button[data-embed-load]', { max: 40 });
        await expect(page.locator('button[data-embed-load]')).toHaveAccessibleName(
          dict['detail.embed.load'],
        );
        await page.keyboard.press('Enter');
        await expect(page.locator('[data-embed-facade] iframe')).toHaveCount(1);
        await expect.poll(() => focusedTag(page)).toBe('IFRAME');
      });
    });
  });
}
