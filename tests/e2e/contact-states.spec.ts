import { expect, test, type Page } from '@playwright/test';
import { en, type Dictionary } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

// 05-08 phase gate: drive the Contact section into every state the UI-SPEC lists, in EN and ES, at
// 1440 and 390. Each state saves a section screenshot for the taste review (.taste-skill/ is
// gitignored) and re-checks the layout contract: no horizontal overflow at 320px, the h2 in two
// lines or fewer at 320/390/768/1440, and the submit as the only accent fill in the section.
// The JS states wait for a real Turnstile token and success submits through it, hence @network.
const ACCENT = 'rgb(15, 112, 183)';
const ACTION_ROUTE = '**/_actions/contact**';
const SHOTS = '.taste-skill/contact-states';
const HEADING_WIDTHS = [320, 390, 768, 1440] as const;

const locales = [
  { locale: 'en', path: '/', dict: en },
  { locale: 'es', path: '/es/', dict: es },
] as const;

const viewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;

type State = 'initial' | 'preselected' | 'validation' | 'sending' | 'failure' | 'success';

async function waitForTurnstileToken(page: Page): Promise<void> {
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
    timeout: 15000,
  });
}

async function fillValid(page: Page, dict: Dictionary, name = 'Ana López'): Promise<void> {
  await page.getByLabel(dict['contact.name.label'], { exact: true }).fill(name);
  await page.getByLabel(dict['contact.email.label'], { exact: true }).fill('ana@example.com');
  await page
    .getByLabel(dict['contact.message.label'], { exact: true })
    .fill('Necesito una identidad visual para mi café.');
}

async function shoot(page: Page, file: string): Promise<void> {
  // Park the pointer so no hover tint lands in the screenshot or the accent check.
  await page.mouse.move(0, 0);
  await page.locator('section#contact').screenshot({
    path: `${SHOTS}/${file}.png`,
    animations: 'disabled',
  });
}

/** Lines the contact h2 renders in at the current viewport (Phase 4 method). */
async function headingLines(page: Page): Promise<number> {
  return page.locator('#contact-title').evaluate((el) => {
    const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight);
    return Math.round(el.getBoundingClientRect().height / lineHeight);
  });
}

/** Visible elements in the section whose background is the accent, tagged by role in the form. */
async function accentFills(page: Page): Promise<string[]> {
  await page.mouse.move(0, 0);
  return page.locator('section#contact').evaluate((section, accent) => {
    return (
      [section, ...section.querySelectorAll('*')]
        .filter((el) => el.checkVisibility() && getComputedStyle(el).backgroundColor === accent)
        // Since 06-07 the fill sits on the submit's magnetic face span, not on the button itself.
        .map((el) =>
          el.matches('[data-contact-submit] > [data-magnetic-face]')
            ? 'submit'
            : el.outerHTML.slice(0, 120),
        )
    );
  }, ACCENT);
}

/** Overflow at 320 and h2 line count at every UI-SPEC width, then back to the original viewport. */
async function checkLayout(page: Page, viewport: { width: number; height: number }) {
  for (const width of HEADING_WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    expect(await headingLines(page), `h2 lines at ${width}px`).toBeLessThanOrEqual(2);
    if (width === 320) {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth, 'scrollWidth at 320px').toBeLessThanOrEqual(320);
    }
  }
  await page.setViewportSize(viewport);
}

async function checkState(
  page: Page,
  viewport: { width: number; height: number },
  file: string,
  state: State,
): Promise<void> {
  // Polled: after a click the submit fades back from its hover tint (150 ms colour transition).
  // In success the form (and its submit) is hidden, so nothing may take the accent.
  const expected = state === 'success' ? [] : ['submit'];
  await expect.poll(() => accentFills(page)).toEqual(expected);
  await shoot(page, file);
  await checkLayout(page, viewport);
}

test.describe('contact section states @network', () => {
  for (const { locale, path, dict } of locales) {
    for (const viewport of viewports) {
      const tag = `${locale}-${viewport.width}`;

      test.describe(`${tag}`, () => {
        test.use({ viewport });

        test(`initial on ${tag}`, async ({ page }) => {
          await page.goto(`${path}#contact`);
          await waitForTurnstileToken(page);
          await checkState(page, viewport, `${tag}-initial`, 'initial');
        });

        test(`pre-selected on ${tag}`, async ({ page }) => {
          await page.goto(`${path}?service=branding#contact`);
          await waitForTurnstileToken(page);
          await expect(page.locator('#contact-service-branding')).toBeChecked();
          await checkState(page, viewport, `${tag}-preselected`, 'preselected');
        });

        test(`validation errors on ${tag}`, async ({ page }) => {
          await page.goto(`${path}#contact`);
          await waitForTurnstileToken(page);
          await page.getByRole('button', { name: dict['contact.submit'] }).click();
          await expect(page.locator('[data-contact-summary]')).toBeVisible();
          await expect(page.locator('#contact-message-error')).toBeVisible();
          await checkState(page, viewport, `${tag}-validation`, 'validation');
        });

        test(`sending on ${tag}`, async ({ page }) => {
          // Hold the request until the checks are done, then let it through (max 3 s fallback).
          let release: () => void = () => undefined;
          const held = new Promise<void>((resolve) => {
            release = resolve;
          });
          await page.route(ACTION_ROUTE, async (route) => {
            await Promise.race([held, new Promise((resolve) => setTimeout(resolve, 3000))]);
            await route.continue().catch(() => undefined);
          });
          await page.goto(`${path}#contact`);
          await waitForTurnstileToken(page);
          await fillValid(page, dict);
          const submit = page.locator('[data-contact-submit]');
          await submit.click();
          await expect(submit).toHaveAttribute('aria-disabled', 'true');
          await expect(submit).toHaveText(dict['contact.sending']);
          await checkState(page, viewport, `${tag}-sending`, 'sending');
          // Still pending after the checks: the screenshot shows the sending state.
          await expect(submit).toHaveAttribute('aria-disabled', 'true');
          release();
          await expect(page.locator('[data-contact-success]')).toBeVisible({ timeout: 15000 });
        });

        test(`failure on ${tag}`, async ({ page }) => {
          await page.goto(`${path}#contact`);
          await waitForTurnstileToken(page);
          await fillValid(page, dict);
          await page.route(ACTION_ROUTE, (route) => route.fulfill({ status: 500, body: '' }));
          await page.getByRole('button', { name: dict['contact.submit'] }).click();
          await expect(page.locator('[data-contact-failure]')).toBeVisible({ timeout: 15000 });
          await expect(page.locator('[data-contact-submit]')).toHaveText(dict['contact.retry']);
          await checkState(page, viewport, `${tag}-failure`, 'failure');
        });

        test(`success on ${tag}`, async ({ page }) => {
          await page.goto(`${path}#contact`);
          await waitForTurnstileToken(page);
          await fillValid(page, dict);
          await page.getByRole('button', { name: dict['contact.submit'] }).click();
          await expect(
            page.getByRole('heading', { level: 3, name: dict['contact.success.heading'] }),
          ).toBeFocused({ timeout: 15000 });
          await checkState(page, viewport, `${tag}-success`, 'success');
        });
      });
    }

    test(`success with a 100-character unbroken name fits 320px on ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(`${path}#contact`);
      await waitForTurnstileToken(page);
      await fillValid(page, dict, 'A'.repeat(100));
      await page.getByRole('button', { name: dict['contact.submit'] }).click();
      await expect(page.locator('[data-contact-success-body]')).toContainText('A'.repeat(100), {
        timeout: 15000,
      });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(320);
      await page.locator('section#contact').screenshot({
        path: `${SHOTS}/${locale}-320-success-long-name.png`,
        animations: 'disabled',
      });
    });
  }
});

test.describe('contact section no-JS state', () => {
  test.use({ javaScriptEnabled: false });

  for (const { locale, path } of locales) {
    for (const viewport of viewports) {
      const tag = `${locale}-${viewport.width}`;

      test(`no-JS on ${tag}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(`${path}#contact`);
        await expect(page.locator('[data-contact-nojs]')).toBeVisible();
        await expect(page.locator('form[data-contact-form]')).toBeHidden();
        await shoot(page, `${tag}-nojs`);
        await checkLayout(page, viewport);
      });
    }
  }
});
