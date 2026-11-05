import { expect, type Page } from '@playwright/test';

// Contact form helpers. Not a spec file, so Playwright does not collect it.

/**
 * Brings the contact form up. Since 07-15 the form controller loads on demand (when #contact comes
 * within one viewport, on focus or press inside it, or at once for #contact / ?service=), so a spec
 * that opened Home at the top must scroll the section near first, then wait for the controller to
 * swap the no-JS block for the form.
 */
export async function openContactForm(page: Page): Promise<void> {
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.locator('form[data-contact-form]')).toBeVisible({ timeout: 10000 });
}
