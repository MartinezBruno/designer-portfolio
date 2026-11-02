import { expect, test, type Page } from '@playwright/test';
import services from '../../src/data/services.json' with { type: 'json' };
import { interpolate } from '../../src/i18n/t';
import { en, type Dictionary } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

// HOME-08 (D-05, D-08): each service card links to Home's Contact section with ?service=<id>, and
// the form arrives with that chip checked. Turnstile is aborted: none of these tests needs a token,
// so the suite stays hermetic (no @network tag).
const cases = [
  { locale: 'en', prefix: '/', dict: en },
  { locale: 'es', prefix: '/es/', dict: es },
] as const;

const ordered = [...services].sort((a, b) => a.order - b.order);

function cardLinks(
  dict: Dictionary,
  locale: 'en' | 'es',
  prefix: string,
): { id: string; name: string; href: string }[] {
  return ordered.map((service) => ({
    id: service.id,
    name: `${dict['services.ask']}${interpolate(dict['services.askTarget'], { title: service.title[locale] })}`,
    href: `${prefix}?service=${service.id}#contact`,
  }));
}

async function blockTurnstile(page: Page): Promise<void> {
  await page.route('https://challenges.cloudflare.com/**', (route) => route.abort());
}

/** True when focus sits on a form control of the contact form (a stolen focus). */
async function focusInFormFields(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return false;
    return el.closest('form[data-contact-form]') !== null;
  });
}

for (const { locale, prefix, dict } of cases) {
  test.describe(`pre-select (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await blockTurnstile(page);
    });

    test(`pre-select: card links on ${prefix}`, async ({ page }) => {
      await page.goto(prefix);
      const region = page.getByRole('region', { name: dict['services.heading'] });
      const links = region.getByRole('link');
      await expect(links).toHaveCount(4);
      const expected = cardLinks(dict, locale, prefix);
      for (const [index, link] of expected.entries()) {
        await expect(links.nth(index)).toHaveAccessibleName(link.name);
        await expect(links.nth(index)).toHaveAttribute('href', link.href);
      }
    });

    for (const link of cardLinks(dict, locale, prefix)) {
      test(`pre-select: clicking the ${link.id} card on ${prefix} checks its chip`, async ({
        page,
      }) => {
        await page.goto(prefix);
        await page.getByRole('link', { name: link.name, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`\\?service=${link.id}#contact$`));
        await expect(page.locator('section#contact')).toBeInViewport();
        await expect(page.locator(`#contact-service-${link.id}`)).toBeChecked();
        await expect(page.locator('#contact-service-other')).not.toBeChecked();
        expect(await focusInFormFields(page)).toBe(false);
      });
    }

    test(`pre-select: next Tab enters the section on ${prefix}`, async ({ page }) => {
      const branding = cardLinks(dict, locale, prefix).find((link) => link.id === 'branding');
      if (branding === undefined) throw new Error('no branding service');
      await page.goto(prefix);
      await page.getByRole('link', { name: branding.name, exact: true }).click();
      await expect(page.locator('#contact-service-branding')).toBeChecked();
      // 07-07: on Home the link stays on the page and #contact takes focus when the glide ends.
      await expect(page.locator('section#contact')).toBeFocused();
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(
        () => document.activeElement?.closest('section#contact') !== null,
      );
      expect(inside).toBe(true);
    });

    for (const query of ['?service=unknown', '?service=', '?service=branding&service=web-design']) {
      test(`pre-select: ${query} on ${prefix} falls back to Not sure yet`, async ({ page }) => {
        await page.goto(`${prefix}${query}#contact`);
        await expect(page.locator('form[data-contact-form]')).toBeVisible();
        await expect(page.locator('#contact-service-other')).toBeChecked();
        for (const service of ordered) {
          await expect(page.locator(`#contact-service-${service.id}`)).not.toBeChecked();
        }
      });
    }

    test(`pre-select works without visiting Home first (${locale})`, async ({ page }) => {
      await page.goto(`${prefix}projects/`);
      await page.goto(`${prefix}?service=social-media#contact`);
      await expect(page.locator('#contact-service-social-media')).toBeChecked();
      expect(await focusInFormFields(page)).toBe(false);
    });
  });
}
