import { expect, test, type Page } from '@playwright/test';
import services from '../../src/data/services.json' with { type: 'json' };
import { site } from '../../src/data/site';
import { interpolate } from '../../src/i18n/t';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import type { Dictionary } from '../../src/i18n/ui.en';

// Home Contact section (D-01..D-04, CONT-05). Later Phase 5 plans extend this spec with the form.
const cases = [
  ['/', en],
  ['/es/', es],
] as const;

const projectsCases = [
  ['/projects/', en, '/'],
  ['/es/projects/', es, '/es/'],
] as const;

test.describe('contact section without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const [path, dict] of cases) {
    test(`${path} ends Home with the Contact section and a working mailto`, async ({ page }) => {
      const requests: string[] = [];
      page.on('request', (request) => requests.push(request.url()));
      await page.goto(path);

      const section = page.locator('section#contact');
      await expect(section).toHaveCount(1);
      await expect(section).toHaveAttribute('aria-labelledby', 'contact-title');
      await expect(page.getByRole('region', { name: dict['contact.heading'] })).toHaveAttribute(
        'id',
        'contact',
      );
      await expect(
        section.getByRole('heading', { level: 2, name: dict['contact.heading'] }),
      ).toBeVisible();

      // Last section of main, directly followed by the footer.
      const isLast = await section.evaluate((el) => {
        const main = el.closest('main');
        const sections = main ? [...main.querySelectorAll('section')] : [];
        const footer = document.querySelector('footer');
        return {
          last: sections.at(-1) === el,
          footerAfter:
            footer !== null &&
            main !== null &&
            Boolean(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING),
        };
      });
      expect(isLast).toEqual({ last: true, footerAfter: true });

      const email = section.getByRole('link', { name: site.email, exact: true });
      await expect(email).toBeVisible();
      await expect(email).toHaveAttribute('href', `mailto:${site.email}`);

      const nojs = section.locator('[data-contact-nojs]');
      await expect(nojs).toBeVisible();
      await expect(nojs).toContainText(
        interpolate(dict['contact.nojs.body'], { email: site.email }),
      );

      const button = nojs.getByRole('link', { name: dict['contact.nojs.button'] });
      await expect(button).toBeVisible();
      const href = await button.getAttribute('href');
      expect(href).toBe(
        `mailto:${site.email}?subject=${encodeURIComponent(dict['contact.nojs.subject'])}`,
      );

      expect(requests.filter((url) => url.includes('challenges.cloudflare.com'))).toEqual([]);
    });

    test(`${path} keeps the heading to two lines without overflow at 320px`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(path);
      const lines = await page.locator('#contact-title').evaluate((el) => {
        const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight);
        return Math.round(el.getBoundingClientRect().height / lineHeight);
      });
      expect(lines).toBeLessThanOrEqual(2);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(320);
    });
  }
});

test.describe('contact links (D-04)', () => {
  for (const [path, dict, homeHref] of projectsCases) {
    test(`${path} header Contact link lands on the Home section`, async ({ page }) => {
      await page.goto(path);
      const nav = page.getByRole('navigation', { name: dict['nav.label'], exact: true });
      const contact = nav.getByRole('link', { name: dict['nav.contact'], exact: true });
      await expect(contact).toHaveAttribute('href', `${homeHref}#contact`);

      await contact.click();
      await expect(page).toHaveURL(new RegExp(`${homeHref}#contact$`));
      await expect(page.locator('section#contact')).toBeInViewport();
    });
  }
});

// JS-on form (05-05: CONT-01, CONT-03 success half, D-06, D-07, D-11, D-13, D-15). Tests that need
// a real Turnstile token from challenges.cloudflare.com carry `@network` in their title.
const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

async function waitForTurnstileToken(page: Page): Promise<void> {
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
    timeout: 15000,
  });
}

function serviceLabels(locale: 'en' | 'es', dict: Dictionary): string[] {
  return [...services]
    .sort((a, b) => a.order - b.order)
    .map((service) => service.title[locale])
    .concat(dict['contact.service.other']);
}

async function fillValid(page: Page, dict: Dictionary): Promise<void> {
  await page.getByLabel(dict['contact.name.label'], { exact: true }).fill('Ana López');
  await page.getByLabel(dict['contact.email.label'], { exact: true }).fill('ana@example.com');
  await page
    .getByLabel(dict['contact.message.label'], { exact: true })
    .fill('Necesito una identidad visual para mi café.');
}

const jsCases = [
  ['/', en, 'en'],
  ['/es/', es, 'es'],
] as const;

test.describe('contact form with JavaScript', () => {
  for (const [path, dict, locale] of jsCases) {
    test(`${path} with JavaScript the form replaces the no-JS block`, async ({ page }) => {
      await page.goto(path);
      const section = page.locator('section#contact');
      await expect(section.locator('[data-contact-nojs]')).toBeHidden();
      await expect(section.locator('form[data-contact-form]')).toBeVisible();

      const group = section.getByRole('group', { name: dict['contact.service.legend'] });
      const radios = group.getByRole('radio');
      await expect(radios).toHaveCount(5);
      const labels = serviceLabels(locale, dict);
      for (const [index, label] of labels.entries()) {
        await expect(radios.nth(index)).toHaveAccessibleName(label);
      }
      await expect(group.getByRole('radio', { name: dict['contact.service.other'] })).toBeChecked();

      // peer-checked:[&>svg]:block compiled: only the checked chip shows its check icon.
      await expect(group.locator('label[for="contact-service-other"] svg')).toBeVisible();
      await expect(group.locator('label[for="contact-service-branding"] svg')).toBeHidden();
    });

    test(`${path} Turnstile loads only near the section`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      // Hermetic: the script request is observed, then answered locally (no Cloudflare call).
      await page.route('**/turnstile/v0/api.js**', (route) =>
        route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }),
      );
      const requests: string[] = [];
      page.on('request', (request) => requests.push(request.url()));

      await page.goto(path);
      await page.waitForTimeout(1500);
      expect(requests.filter((url) => url.includes('challenges.cloudflare.com'))).toEqual([]);

      const scriptRequest = page.waitForRequest((request) => request.url() === TURNSTILE_SCRIPT, {
        timeout: 10000,
      });
      await page.locator('#contact').scrollIntoViewIfNeeded();
      await scriptRequest;
      expect(requests.filter((url) => url === TURNSTILE_SCRIPT)).toHaveLength(1);
    });

    test(`${path} success @network`, async ({ page }) => {
      await page.goto(`${path}#contact`);
      await waitForTurnstileToken(page);
      await fillValid(page, dict);
      await page.getByRole('button', { name: dict['contact.submit'] }).click();

      const body = interpolate(dict['contact.success.body'], { name: 'Ana López' });
      await expect(
        page.getByRole('heading', { level: 3, name: dict['contact.success.heading'] }),
      ).toBeFocused({ timeout: 15000 });
      await expect(page.locator('[data-contact-success-body]')).toHaveText(body);
      await expect(page.locator('[data-contact-status]')).toHaveText(body);
      await expect(page.locator('form[data-contact-form]')).toBeHidden();
    });

    test(`${path} success: send another restores an empty form @network`, async ({ page }) => {
      await page.goto(`${path}#contact`);
      await waitForTurnstileToken(page);
      await fillValid(page, dict);
      await page.getByRole('button', { name: dict['contact.submit'] }).click();
      await expect(
        page.getByRole('heading', { level: 3, name: dict['contact.success.heading'] }),
      ).toBeFocused({ timeout: 15000 });

      await page.getByRole('button', { name: dict['contact.success.again'] }).click();
      const form = page.locator('form[data-contact-form]');
      await expect(form).toBeVisible();
      const name = page.getByLabel(dict['contact.name.label'], { exact: true });
      await expect(name).toHaveValue('');
      await expect(page.getByLabel(dict['contact.email.label'], { exact: true })).toHaveValue('');
      await expect(page.getByLabel(dict['contact.message.label'], { exact: true })).toHaveValue('');
      await expect(page.getByRole('radio', { name: dict['contact.service.other'] })).toBeChecked();
      await expect(name).toBeFocused();
      await expect(page.locator('[data-contact-success]')).toBeHidden();
    });

    test(`${path} sending state @network`, async ({ page }) => {
      let hits = 0;
      await page.route('**/_actions/contact**', async (route) => {
        hits += 1;
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.continue();
      });
      await page.goto(`${path}#contact`);
      await waitForTurnstileToken(page);
      await fillValid(page, dict);

      const submit = page.locator('[data-contact-submit]');
      await submit.click();
      await expect(submit).toHaveAttribute('aria-disabled', 'true');
      await expect(submit).toHaveText(dict['contact.sending']);
      await expect(page.locator('[data-contact-status]')).toHaveText(
        dict['contact.status.sending'],
      );
      // aria-disabled keeps the button focusable and clickable; the handler ignores the click.
      await submit.click({ force: true });

      await expect(page.locator('[data-contact-success]')).toBeVisible({ timeout: 15000 });
      expect(hits).toBe(1);
    });

    test(`${path} submit before the token shows the wait note`, async ({ page }) => {
      await page.route('**/turnstile/v0/api.js**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await route.abort().catch(() => undefined);
      });
      const actions: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/_actions/contact')) actions.push(request.url());
      });
      await page.goto(`${path}#contact`);
      await fillValid(page, dict);
      await page.getByRole('button', { name: dict['contact.submit'] }).click();

      const note = page.locator('[data-turnstile-note]');
      await expect(note).toBeVisible();
      await expect(note).toHaveText(dict['contact.turnstile.wait']);
      expect(actions).toEqual([]);
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    });

    test(`${path} Turnstile load error shows the error note`, async ({ page }) => {
      await page.route('**/turnstile/v0/api.js**', (route) => route.abort());
      await page.goto(`${path}#contact`);
      const note = page.locator('[data-turnstile-note]');
      await expect(note).toBeVisible();
      await expect(note).toHaveText(
        interpolate(dict['contact.turnstile.error'], { email: site.email }),
      );
    });
  }
});
