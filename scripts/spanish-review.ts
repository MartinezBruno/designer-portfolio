// Spanish review list (QUAL-03, Phase 8 D-13/D-14): writes every piece of site copy, EN next to ES,
// into one file for Martina to review: .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md.
// Run `pnpm review:spanish` after editing any copy (ui.en.ts/ui.es.ts, roles.json, services.json,
// project-overrides.json, or EMAIL_COPY_ES in src/lib/contact/email.ts). tests/unit/spanish-review.test.ts
// fails when a string is missing from the file or when the committed file is stale.
// buildSpanishReview() is pure and deterministic (no timestamps); only the CLI guard writes.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import overrides from '../src/data/project-overrides.json' with { type: 'json' };
import roles from '../src/data/roles.json' with { type: 'json' };
import services from '../src/data/services.json' with { type: 'json' };
import tools from '../src/data/tools.json' with { type: 'json' };
import { en } from '../src/i18n/ui.en.ts';
import { es } from '../src/i18n/ui.es.ts';
import { EMAIL_COPY_ES } from '../src/lib/contact/email.ts';

export const REVIEW_PATH = '.planning/phases/08-quality-verification/08-SPANISH-REVIEW.md';
export const STATUS_DRAFT = "draft, for Martina's review";
const EMAIL_EN = '— (Spanish-only, Phase 5 D-16)';

/**
 * User-facing literals hard-coded outside the dictionaries and src/data JSON. A grep of
 * src/components, src/layouts and src/pages for alt/aria-label/title/placeholder literals found
 * none (08-05); add rows here as `{ key: 'file:line', en, es }` if one ever appears.
 */
const HARDCODED_COPY: readonly { key: string; en: string; es: string }[] = [];

/** Things Martina still has to supply that are not copy (file:line of each TODO(martina)). */
export const NON_COPY_TODOS: readonly { location: string; item: string }[] = [
  { location: 'src/data/site.ts:17', item: 'Real domain (canonical and hreflang URLs).' },
  { location: 'src/data/site.ts:19', item: 'Real contact email address (mailto links).' },
  {
    location: 'src/components/sections/Hero.astro:10',
    item: 'Hero photo original at 1600px or wider (sharper 3x phone render).',
  },
  {
    location: 'src/lib/contact/mailer/resend.ts:12',
    item: 'Verified sending domain for the contact email (DEPLOY-02).',
  },
  { location: 'astro.config.ts:76', item: 'Brand fonts.' },
  {
    location: 'src/data/site.ts:18-20',
    item: 'Phase 1 WR-04: the `.example` placeholder domain and email currently appear in the canonical URL, hreflang alternates and mailto links; they change once the two values above are real.',
  },
];

interface Localized {
  en: string;
  es: string;
}
interface OverrideEntry {
  title?: Localized;
  summary?: Localized;
  coverAlt?: Localized;
  moduleAlt?: Record<string, Localized>;
}

/** Makes a string safe inside one Markdown table cell. */
export function escapeCell(text: string): string {
  return text.replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

function copyRow(key: string, enText: string, esText: string): string {
  return `| \`${key}\` | ${escapeCell(enText)} | ${escapeCell(esText)} | ${STATUS_DRAFT} |`;
}

function table(rows: readonly string[]): string[] {
  return ['| Key / location | EN | ES | Status |', '| --- | --- | --- | --- |', ...rows, ''];
}

type UIKey = keyof typeof en;

function uiSections(): string[] {
  const keys = Object.keys(en).filter((key): key is UIKey => Object.hasOwn(en, key));
  const groups = new Map<string, UIKey[]>();
  for (const key of keys) {
    const prefix = key.split('.')[0] ?? key;
    const group = groups.get(prefix) ?? [];
    group.push(key);
    groups.set(prefix, group);
  }
  const out = [
    '## UI dictionary',
    '',
    'Source: `src/i18n/ui.en.ts` (EN) and `src/i18n/ui.es.ts` (ES). Tokens in braces such as `{title}` are filled in at render time; keep them in the Spanish text. `meta.*` is the SEO title and description, `notFound.*` is the 404 page.',
    '',
  ];
  for (const [prefix, group] of groups) {
    out.push(
      `### ${prefix}.*`,
      '',
      ...table(group.map((key) => copyRow(`ui:${key}`, en[key], es[key]))),
    );
  }
  return out;
}

function roleSection(): string[] {
  return [
    '## Roles',
    '',
    'Source: `src/data/roles.json` (the rotating roles on Home).',
    '',
    ...table(
      roles.map((role) => copyRow(`roles.json#${role.id}.label`, role.label.en, role.label.es)),
    ),
  ];
}

function serviceSection(): string[] {
  const rows: string[] = [];
  for (const service of services) {
    rows.push(copyRow(`services.json#${service.id}.title`, service.title.en, service.title.es));
    const count = Math.max(service.items.en.length, service.items.es.length);
    for (let i = 0; i < count; i += 1) {
      rows.push(
        copyRow(
          `services.json#${service.id}.items[${i}]`,
          service.items.en[i] ?? '',
          service.items.es[i] ?? '',
        ),
      );
    }
  }
  return [
    '## Services',
    '',
    'Source: `src/data/services.json`. Spanish is her source copy; English is our translation.',
    '',
    ...table(rows),
  ];
}

function overrideSection(): string[] {
  const out = [
    '## Project overrides',
    '',
    'Source: `src/data/project-overrides.json` (keyed by Behance id). These are our bilingual titles, summaries and alt text; the Behance project bodies themselves are not translated.',
    '',
  ];
  for (const [id, entry] of Object.entries(overrides as Record<string, OverrideEntry>)) {
    const rows: string[] = [];
    for (const field of ['title', 'summary', 'coverAlt'] as const) {
      const value = entry[field];
      if (value) rows.push(copyRow(`project-overrides.json#${id}.${field}`, value.en, value.es));
    }
    for (const [moduleId, alt] of Object.entries(entry.moduleAlt ?? {})) {
      rows.push(copyRow(`project-overrides.json#${id}.moduleAlt.${moduleId}`, alt.en, alt.es));
    }
    if (rows.length === 0) continue;
    out.push(`### ${entry.title?.en ?? id} (${id})`, '', ...table(rows));
  }
  return out;
}

function emailSection(): string[] {
  return [
    '## Contact email (Spanish only)',
    '',
    'Source: `EMAIL_COPY_ES` in `src/lib/contact/email.ts`. This is the email Martina receives for each contact form message, so it is written in Spanish only (Phase 5 D-16).',
    '',
    ...table(
      Object.entries(EMAIL_COPY_ES).map(([name, value]) =>
        copyRow(`email:${name}`, EMAIL_EN, value),
      ),
    ),
  ];
}

function hardcodedSection(): string[] {
  if (HARDCODED_COPY.length === 0) return [];
  return [
    '## Hard-coded copy',
    '',
    ...table(HARDCODED_COPY.map((entry) => copyRow(entry.key, entry.en, entry.es))),
  ];
}

function toolSection(): string[] {
  return [
    '## Tools (brand names, not translated)',
    '',
    'Source: `src/data/tools.json`. These are brand names and stay the same in both languages, so they need no review:',
    '',
    ...tools.map((tool) => `- ${tool.name}`),
    '',
  ];
}

function nonCopySection(): string[] {
  return [
    '## Non-copy TODO(martina)',
    '',
    'Not copy, but still needed from Martina before launch:',
    '',
    ...NON_COPY_TODOS.map((todo) => `- \`${todo.location}\`: ${todo.item}`),
    '',
  ];
}

export function buildSpanishReview(): string {
  const lines = [
    '# Spanish copy review',
    '',
    '<!-- Generated by scripts/spanish-review.ts (`pnpm review:spanish`). Do not edit by hand. -->',
    '',
    'Every piece of site copy, English next to Spanish, in one place. Each Spanish string is a draft.',
    '',
    '## How to review',
    '',
    'Read the ES column. To change a string, edit the Spanish text at the source location named in the first column (or in the section heading), then run `pnpm review:spanish` to regenerate this file. The status column is for Martina: every row starts as a draft.',
    '',
    '**Scope (D-14):** Behance project titles and bodies are not translated; they appear in the language Martina wrote them in on Behance. Translating them is I18N-09, planned for v2. Tool names are brand names and are left untranslated.',
    '',
    ...uiSections(),
    ...roleSection(),
    ...serviceSection(),
    ...overrideSection(),
    ...emailSection(),
    ...hardcodedSection(),
    ...toolSection(),
    ...nonCopySection(),
  ];
  return `${lines.join('\n').trimEnd()}\n`;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  writeFileSync(REVIEW_PATH, buildSpanishReview());
  console.log(`wrote ${REVIEW_PATH}`);
}
