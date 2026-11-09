import { expect, test, type Page } from '@playwright/test';
import services from '../../src/data/services.json' with { type: 'json' };
import { interpolate } from '../../src/i18n/t';
import { en, type Dictionary } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { headerSteps, tabAndExpect, tabUntil } from './helpers/keyboard';
import { waitForNavigationIdle } from './helpers/navigation';
import { expectedDetails, expectedProjects } from './helpers/projects';

// 08-06 (QUAL-02, D-09): every interactive journey on the site, driven by the keyboard alone, in EN
// and ES. Only page.keyboard moves focus or activates controls here: no clicks and no .focus().
// Filters (PROJ-04..07) are N/A: with 7 projects (fewer than 8) the Projects page renders no filter
// controls, so there is nothing to test (recorded in 08-06-SUMMARY.md).
//
// Turnstile: the hermetic journeys abort challenges.cloudflare.com (no token is needed for them).
// Only the success / "Send another" journey needs a real test-key token, hence @network.

const cases = [
  { locale: 'en', prefix: '/', dict: en, other: 'es', otherPrefix: '/es/' },
  { locale: 'es', prefix: '/es/', dict: es, other: 'en', otherPrefix: '/' },
] as const;

const ordered = [...services].sort((a, b) => a.order - b.order);

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

// An aborted Turnstile script logs a failed resource load; that is the blocking, not a site error.
const TURNSTILE_BLOCKED = /challenges\.cloudflare\.com|net::ERR_FAILED/;

async function blockTurnstile(page: Page): Promise<void> {
  await page.route('https://challenges.cloudflare.com/**', (route) => route.abort());
}

async function waitForTurnstileToken(page: Page): Promise<void> {
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
    timeout: 15000,
  });
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

/** Keyboard path to the form: header Contact link, Enter, then the section takes focus. */
async function reachContactByKeyboard(page: Page, prefix: string): Promise<void> {
  await tabUntil(page, `header a[href="${prefix}#contact"]`);
  await page.keyboard.press('Enter');
  await expect(page.locator('section#contact')).toBeFocused({ timeout: 10000 });
  await expect(page.locator('form[data-contact-form]')).toBeVisible({ timeout: 10000 });
}

function askLinkName(dict: Dictionary, title: string): string {
  return `${dict['services.ask']}${interpolate(dict['services.askTarget'], { title })}`.trim();
}

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
        // 08 WR-01 (option-a): aria-pressed is the explicit choice only; `paused` is visible.
        const expectBand = async (pressed: boolean, paused = pressed): Promise<void> => {
          await expect(toggle).toHaveAttribute('aria-pressed', pressed ? 'true' : 'false');
          await expect.poll(playState).toBe(paused ? 'paused' : 'running');
        };

        await expectBand(false);
        await tabUntil(page, '[data-marquee-toggle]');
        // 08-01 / WCAG 2.2.2: keyboard focus alone holds the band visually, but it is not a user
        // choice, so aria-pressed stays "false".
        await expectBand(false, true);
        // The first Space is an explicit pause, the second an explicit resume.
        await page.keyboard.press('Space');
        await expectBand(true);
        await page.keyboard.press('Space');
        await expectBand(false);
        // Space once more: an explicit pause again.
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

    test.describe('services and contact form (Turnstile blocked)', () => {
      let errors: string[] = [];

      test.beforeEach(async ({ page }) => {
        errors = collectErrors(page, TURNSTILE_BLOCKED);
        await blockTurnstile(page);
      });

      test.afterEach(() => {
        expect(errors).toEqual([]);
      });

      test(`8. "Ask about this" preselects its service on ${prefix}`, async ({ page }) => {
        const service = ordered[0];
        if (service === undefined) throw new Error('no services');
        await open(page, prefix);
        const href = `${prefix}?service=${service.id}#contact`;
        await tabUntil(page, `a[href="${href}"]`, { max: 40 });
        const link = page.locator(`a[href="${href}"]`);
        await expect(link).toHaveAccessibleName(askLinkName(dict, service.title[locale]));
        await page.keyboard.press('Enter');

        await expect(page.locator('form[data-contact-form]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('section#contact')).toBeInViewport();
        await expect(page.locator(`#contact-service-${service.id}`)).toBeChecked();
        await expect(page.locator('#contact-service-other')).not.toBeChecked();
        // The next Tab continues inside the Contact section.
        await expect(page.locator('section#contact')).toBeFocused();
        await page.keyboard.press('Tab');
        expect(
          await page.evaluate(() => document.activeElement?.closest('section#contact') !== null),
        ).toBe(true);
      });

      test(`9. empty submit focuses the first invalid field on ${prefix}`, async ({ page }) => {
        await open(page, prefix);
        await reachContactByKeyboard(page, prefix);
        await tabUntil(page, '[data-contact-submit]');
        await page.keyboard.press('Enter');

        for (const field of ['name', 'email', 'message'] as const) {
          await expect(page.locator(`#contact-${field}`)).toHaveAttribute('aria-invalid', 'true');
        }
        await expect(page.locator('#contact-name-error')).toBeVisible();
        await expect(page.locator('#contact-name')).toBeFocused();
      });
    });

    test.describe('contact form success @network', () => {
      let errors: string[] = [];

      test.beforeEach(({ page }) => {
        // WR-03: Turnstile's own console noise (e.g. its Private Access Token 401) is not a site
        // error. Page errors are still collected.
        errors = collectErrors(page, /challenges\.cloudflare\.com/);
      });

      test.afterEach(() => {
        expect(errors).toEqual([]);
      });

      test(`10. fill, send and "Send another" by keyboard on ${prefix} @network`, async ({
        page,
      }) => {
        const service = ordered[0];
        if (service === undefined) throw new Error('no services');
        await open(page, prefix);
        await reachContactByKeyboard(page, prefix);
        // WR-03: wait for the widget to mount and issue its token before typing, so the
        // Turnstile render cannot race the keystrokes. Tokens are single-use with a 300 s TTL.
        await waitForTurnstileToken(page);

        // The radio group is one stop (the checked "other" chip, last); ArrowRight wraps to the first.
        await tabUntil(page, 'input[name="service"]');
        await expect(page.locator('#contact-service-other')).toBeFocused();
        await page.keyboard.press('ArrowRight');
        await expect(page.locator(`#contact-service-${service.id}`)).toBeChecked();
        await expect(page.locator(`#contact-service-${service.id}`)).toBeFocused();

        await page.keyboard.press('Tab');
        await expect(page.locator('#contact-name')).toBeFocused();
        await page.keyboard.type('Ana López');
        await expect(page.locator('#contact-name')).toHaveValue('Ana López');
        await page.keyboard.press('Tab');
        await expect(page.locator('#contact-email')).toBeFocused();
        await page.keyboard.type('ana@example.com');
        await expect(page.locator('#contact-email')).toHaveValue('ana@example.com');
        await page.keyboard.press('Tab');
        await expect(page.locator('#contact-message')).toBeFocused();
        await page.keyboard.type('Necesito una identidad visual para mi café.');
        await expect(page.locator('#contact-message')).toHaveValue(
          'Necesito una identidad visual para mi café.',
        );

        await tabUntil(page, '[data-contact-submit]');
        await page.keyboard.press('Enter');

        const heading = page.getByRole('heading', {
          level: 3,
          name: dict['contact.success.heading'],
        });
        await expect(heading).toBeFocused({ timeout: 15000 });

        await tabUntil(page, '[data-contact-again]');
        await expect(page.locator('[data-contact-again]')).toHaveText(
          dict['contact.success.again'],
        );
        await page.keyboard.press('Enter');
        await expect(page.locator('form[data-contact-form]')).toBeVisible();
        for (const field of ['name', 'email', 'message'] as const) {
          await expect(page.locator(`#contact-${field}`)).toHaveValue('');
        }
        await expect(page.locator('#contact-service-other')).toBeChecked();
        await expect(page.locator('#contact-name')).toBeFocused();
      });
    });
  });
}
