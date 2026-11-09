import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { pagesFromHtmlFiles } from '../../scripts/bundle.ts';
import { AXE_TAGS, gotoWithoutSiteScripts } from './helpers/axe';
import { settleMotion } from './helpers/motion';
import { sweepRoutes } from './helpers/routes';

// Phase 8 axe sweep (D-07, D-08): every built page in EN and ES, in all three motion states, under
// WCAG 2.2 AA. The route list is derived (helpers/routes.ts), and the guard below fails when the
// build has a page the list does not visit. Parallel: about 60 independent page loads.
test.describe.configure({ mode: 'parallel' });

const routes = sweepRoutes();
const DIST_CLIENT = join(process.cwd(), 'dist', 'client');

// 404 pages are visited by explicit paths: the EN one as an unknown URL, the ES one at /es/404/.
const NOT_FOUND_FILES = new Set(['/404.html', '/es/404/']);

function htmlFilesUnder(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((entry) => entry.endsWith('.html'))
    .map((entry) => relative(root, join(root, entry)));
}

test('the sweep visits every page in the build output (D-07 guard)', () => {
  expect(existsSync(DIST_CLIENT), 'dist/client is missing: run pnpm build first').toBe(true);
  const built = pagesFromHtmlFiles(htmlFilesUnder(DIST_CLIENT))
    .map((entry) => entry.route)
    .filter((route) => !NOT_FOUND_FILES.has(route));
  const swept = routes.filter((route) => route.kind !== 'notFound').map((route) => route.path);
  expect(new Set(built)).toEqual(new Set(swept));
  for (const locale of ['en', 'es'] as const) {
    const notFound = routes.filter((route) => route.kind === 'notFound' && route.locale === locale);
    expect(notFound, `one 404 route for ${locale}`).toHaveLength(1);
  }
});

test.describe("motion 'on' (settled after scroll-through)", () => {
  for (const { path } of routes) {
    test(`${path} [on] has zero WCAG 2.2 AA axe violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
      await settleMotion(page, { scrollThrough: true });
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(violations).toEqual([]);
    });
  }
});

test.describe("motion 'reduced' (prefers-reduced-motion: reduce)", () => {
  test.use({ reducedMotion: 'reduce' });

  for (const { path } of routes) {
    test(`${path} [reduced] has zero WCAG 2.2 AA axe violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
      await settleMotion(page, { scrollThrough: true });
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(violations).toEqual([]);
    });
  }
});

test.describe("motion 'off' (site scripts stripped)", () => {
  for (const { path } of routes) {
    test(`${path} [off] has zero WCAG 2.2 AA axe violations`, async ({ page }) => {
      await gotoWithoutSiteScripts(page, path);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
      await expect(page.locator('[data-reveal-armed], [data-revealed]')).toHaveCount(0);
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(violations).toEqual([]);
    });
  }
});
