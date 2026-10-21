import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { interpolate } from '../../src/i18n/t';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

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
