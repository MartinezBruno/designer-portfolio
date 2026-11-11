import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import overrides from '../../src/data/project-overrides.json' with { type: 'json' };
import roles from '../../src/data/roles.json' with { type: 'json' };
import services from '../../src/data/services.json' with { type: 'json' };
import tools from '../../src/data/tools.json' with { type: 'json' };
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { buildContactEmail, EMAIL_COPY_ES } from '../../src/lib/contact/email';
import type { ServiceId } from '../../src/lib/contact/fields';
import {
  buildSpanishReview,
  escapeCell,
  NON_COPY_TODOS,
  REVIEW_PATH,
  STATUS_DRAFT,
} from '../../scripts/spanish-review.ts';

const review = buildSpanishReview();
const rows = review.split('\n').filter((line) => line.startsWith('| `'));

/** Finds the table row whose first cell is `key` (wrapped in backticks). */
function row(key: string): string | undefined {
  return rows.find((line) => line.startsWith(`| \`${key}\` |`));
}

function expectRow(key: string, enText: string, esText: string): void {
  const found = row(key);
  expect(found, `missing row ${key}`).toBeDefined();
  expect(found).toBe(
    `| \`${key}\` | ${escapeCell(enText)} | ${escapeCell(esText)} | ${STATUS_DRAFT} |`,
  );
}

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

describe('buildSpanishReview coverage', () => {
  it('has a row for every UI dictionary key with its EN and ES text', () => {
    const keys = Object.keys(en).filter((key): key is keyof typeof en => Object.hasOwn(en, key));
    expect(keys.length).toBeGreaterThan(100);
    for (const key of keys) expectRow(`ui:${key}`, en[key], es[key]);
  });

  it('has a row for every role label, service title and item, and override string', () => {
    for (const role of roles)
      expectRow(`roles.json#${role.id}.label`, role.label.en, role.label.es);
    for (const service of services) {
      expectRow(`services.json#${service.id}.title`, service.title.en, service.title.es);
      const count = Math.max(service.items.en.length, service.items.es.length);
      for (let i = 0; i < count; i += 1) {
        expectRow(
          `services.json#${service.id}.items[${i}]`,
          service.items.en[i] ?? '',
          service.items.es[i] ?? '',
        );
      }
    }
    const entries = Object.entries(overrides as Record<string, OverrideEntry>);
    expect(entries.length).toBeGreaterThan(0);
    for (const [id, entry] of entries) {
      for (const field of ['title', 'summary', 'coverAlt'] as const) {
        const value = entry[field];
        if (value) expectRow(`project-overrides.json#${id}.${field}`, value.en, value.es);
      }
      for (const [moduleId, alt] of Object.entries(entry.moduleAlt ?? {})) {
        expectRow(`project-overrides.json#${id}.moduleAlt.${moduleId}`, alt.en, alt.es);
      }
    }
  });

  it('has a Spanish-only row for every contact email string', () => {
    const entries = Object.entries(EMAIL_COPY_ES);
    expect(entries.length).toBeGreaterThan(0);
    for (const [name, value] of entries) {
      expectRow(`email:${name}`, '— (Spanish-only, Phase 5 D-16)', value);
    }
  });

  it('marks every copy row as a draft for review', () => {
    expect(rows.length).toBeGreaterThanOrEqual(Object.keys(en).length);
    for (const line of rows) expect(line.endsWith(`| ${STATUS_DRAFT} |`), line).toBe(true);
    expect(STATUS_DRAFT).toBe("draft, for Martina's review");
  });

  it('states the D-14 scope notes and lists the non-copy TODOs', () => {
    expect(review).toContain('I18N-09');
    expect(review).toMatch(/Behance project titles and bodies are not translated/);
    expect(review).toMatch(/brand names/);
    for (const tool of tools) expect(review).toContain(tool.name);
    expect(review.match(/## Non-copy TODO\(martina\)/g)).toHaveLength(1);
    expect(NON_COPY_TODOS).toHaveLength(2);
    for (const item of NON_COPY_TODOS) expect(review).toContain(item.location);
    expect(review).not.toContain('martinafernandez.example');
  });
});

describe('08-SPANISH-REVIEW.md freshness', () => {
  it('matches the regenerated output (run `pnpm review:spanish` after editing copy)', () => {
    expect(readFileSync(REVIEW_PATH, 'utf8')).toBe(review);
  });
});

describe('buildContactEmail after the EMAIL_COPY_ES refactor', () => {
  it('produces byte-identical output for a fixture', () => {
    const serviceTitlesEs = Object.fromEntries(
      services.map((service) => [service.id, service.title.es]),
    ) as Record<ServiceId, string>;
    const options = { to: 'inbox@example.invalid', serviceTitlesEs };
    const branding = buildContactEmail(
      { name: 'Ana', email: 'ana@example.com', message: 'Hola', service: 'branding', locale: 'en' },
      options,
    );
    expect(branding).toEqual({
      to: 'inbox@example.invalid',
      replyTo: 'ana@example.com',
      subject: 'Nuevo mensaje web — Branding — Ana',
      text: 'Nombre: Ana\nEmail: ana@example.com\nServicio: Branding\nIdioma del sitio: Inglés (EN)\n\nMensaje:\nHola',
    });
    const other = buildContactEmail(
      { name: 'Ana', email: 'ana@example.com', message: 'Hola', service: 'other', locale: 'es' },
      options,
    );
    expect(other.subject).toBe('Nuevo mensaje web — Sin especificar — Ana');
    expect(other.text).toContain('Servicio: Sin especificar\nIdioma del sitio: Español (ES)');
  });
});

const COPY_TODO_FILES = [
  'src/i18n/ui.en.ts',
  'src/i18n/ui.es.ts',
  'src/content.config.ts',
  'src/lib/projects/overrides-schema.ts',
] as const;

const NON_COPY_TODO_FILES = ['src/components/sections/Hero.astro', 'astro.config.ts'] as const;

describe('TODO(martina) pointers (D-13)', () => {
  it('points every copy TODO(martina) comment at 08-SPANISH-REVIEW.md', () => {
    for (const file of COPY_TODO_FILES) {
      const todos = readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => line.includes('TODO(martina)'));
      expect(todos.length, `${file} has no TODO(martina)`).toBeGreaterThan(0);
      for (const line of todos) expect(line, `${file}: ${line}`).toContain('08-SPANISH-REVIEW.md');
    }
  });

  it('keeps the non-copy TODO(martina) items in place and listed in the review file', () => {
    for (const file of NON_COPY_TODO_FILES) {
      expect(readFileSync(file, 'utf8')).toContain('TODO(martina)');
      expect(review).toContain(`- \`${file}:`);
    }
    for (const { location } of NON_COPY_TODOS) {
      const match = /^(.+):(\d+)$/.exec(location);
      if (!match) continue;
      const [, file = '', line = '0'] = match;
      const text = readFileSync(file, 'utf8').split('\n')[Number(line) - 1] ?? '';
      expect(text, location).toContain('TODO(martina)');
    }
  });
});
