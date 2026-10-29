import { expect, test, type Browser } from '@playwright/test';

// LCP gate for the hero load sequence (UI-SPEC "Hero load sequence", LCP gate): median LCP with
// motion 'on' must be within 100ms of 'reduced' on / and /es/ at 1440x900 and 390x844.
// Recorded, not CI-blocking: runs only with MEASURE_LCP=1 against the preview build.
test.skip(process.env['MEASURE_LCP'] !== '1', 'set MEASURE_LCP=1 to measure the hero LCP gate');

const RUNS = 5;
const GATE_MS = 100;
const paths = ['/', '/es/'] as const;
const viewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;
type Mode = 'on' | 'reduced';

interface LcpSample {
  time: number;
  element: string;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] ?? 0)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

async function measure(
  browser: Browser,
  baseURL: string,
  path: string,
  viewport: { width: number; height: number },
  mode: Mode,
): Promise<LcpSample> {
  // A fresh context per run: no warm memory cache carries over between samples.
  const context = await browser.newContext({
    viewport,
    reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'load' });
  // The last LCP candidate is final once the sequence has settled (ends at 960ms).
  await page.waitForFunction(() => performance.now() >= 1500);
  const sample = await page.evaluate(
    () =>
      new Promise<LcpSample>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries() as (PerformanceEntry & { element?: Element | null })[];
          const last = entries.at(-1);
          const el = last?.element;
          resolve({
            time: last?.startTime ?? -1,
            element: el
              ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.closest('[data-hero]') ? ' (hero)' : ''}`
              : 'unknown',
          });
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      }),
  );
  expect(await page.locator('html').getAttribute('data-motion')).toBe(mode);
  await context.close();
  return sample;
}

test('hero LCP: motion on vs reduced (median of 5)', async ({ browser, baseURL }) => {
  test.setTimeout(300_000);
  if (!baseURL) throw new Error('baseURL is required');

  const rows: string[] = [
    '| Page | Viewport | on median (ms) | reduced median (ms) | gap (ms) | LCP element (on / reduced) | within 100ms |',
    '|------|----------|----------------|---------------------|----------|----------------------------|--------------|',
  ];
  const failures: string[] = [];

  for (const path of paths) {
    for (const viewport of viewports) {
      const results: Record<Mode, LcpSample[]> = { on: [], reduced: [] };
      // Interleave modes so drift in machine load affects both equally.
      for (let run = 0; run < RUNS; run++) {
        for (const mode of ['on', 'reduced'] as const) {
          results[mode].push(await measure(browser, baseURL, path, viewport, mode));
        }
      }
      const on = median(results.on.map((s) => s.time));
      const reduced = median(results.reduced.map((s) => s.time));
      const gap = on - reduced;
      const ok = gap <= GATE_MS;
      const label = `${viewport.width}x${viewport.height}`;
      rows.push(
        `| \`${path}\` | ${label} | ${on.toFixed(0)} | ${reduced.toFixed(0)} | ${gap.toFixed(0)} | ${results.on[0]?.element ?? '?'} / ${results.reduced[0]?.element ?? '?'} | ${ok ? 'yes' : 'NO'} |`,
      );
      if (!ok) failures.push(`${path} ${label}: gap ${gap.toFixed(0)}ms`);
    }
  }

  const table = rows.join('\n');
  console.log(`\n${table}\n`);
  await test.info().attach('hero-lcp.md', { body: table, contentType: 'text/markdown' });
  // Recorded, not blocking: a failure here means applying the UI-SPEC fallback start values.
  if (failures.length > 0) console.log(`LCP gate exceeded: ${failures.join('; ')}`);
});
