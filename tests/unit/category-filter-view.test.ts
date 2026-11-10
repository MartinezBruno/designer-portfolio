import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import CategoryFilter from '../../src/components/ui/CategoryFilter.astro';
import type { CategoryChip } from '../../src/lib/projects/filter';

const chipsFor = (locale: 'en' | 'es'): CategoryChip[] =>
  locale === 'en'
    ? [
        { id: 'graphic-design', label: 'Graphic design', count: 2 },
        { id: 'web-design', label: 'Web design', count: 3 },
        { id: 'branding', label: 'Branding', count: 1 },
        { id: 'social-media', label: 'Social media', count: 1 },
      ]
    : [
        { id: 'graphic-design', label: 'Diseño gráfico', count: 2 },
        { id: 'web-design', label: 'Diseño web', count: 3 },
        { id: 'branding', label: 'Branding', count: 1 },
        { id: 'social-media', label: 'Social media', count: 1 },
      ];

async function render(locale: 'en' | 'es'): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(CategoryFilter, {
    props: { locale, chips: chipsFor(locale) },
  });
  // Node environment: the happy-dom test environment breaks the .astro import, so parse here.
  const window = new Window();
  window.document.body.innerHTML = html;
  return window.document as unknown as Document;
}

describe('CategoryFilter (EN)', () => {
  it('renders a hidden-until-JS radio group with All first, in services order', async () => {
    const doc = await render('en');
    const fieldsets = doc.querySelectorAll('fieldset[data-project-filter]');
    expect(fieldsets).toHaveLength(1);
    const classes = fieldsets[0]?.className.split(/\s+/) ?? [];
    expect(classes).toContain('hidden');
    expect(classes).toContain('motion-js:block');
    expect(doc.querySelector('legend.sr-only')?.textContent?.trim()).toBe(
      'Filter projects by category',
    );
    const radios = [...doc.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(radios.map((radio) => radio.name)).toEqual(Array(5).fill('category'));
    expect(radios.map((radio) => radio.value)).toEqual([
      '',
      'graphic-design',
      'web-design',
      'branding',
      'social-media',
    ]);
    expect(doc.querySelector<HTMLInputElement>('#projects-filter-all')?.checked).toBe(true);
    expect(radios.filter((radio) => radio.checked)).toHaveLength(1);
    const labels = radios.map((radio) =>
      doc.querySelector(`label[for="${radio.id}"]`)?.textContent?.trim(),
    );
    expect(labels).toEqual(['All', 'Graphic design', 'Web design', 'Branding', 'Social media']);
  });

  it('renders an empty sr-only status region carrying the templates', async () => {
    const doc = await render('en');
    const status = doc.querySelector<HTMLElement>('p[role="status"][data-project-filter-status]');
    expect(status).not.toBeNull();
    expect(status?.classList.contains('sr-only')).toBe(true);
    expect(status?.textContent).toBe('');
    expect(status?.dataset['statusAll']).toBe('Showing all {count} projects');
    expect(status?.dataset['statusOne']).toBe('Showing 1 project in {category}');
    expect(status?.dataset['statusMany']).toBe('Showing {count} projects in {category}');
  });

  it('has no form, no icon and no toggle buttons', async () => {
    const doc = await render('en');
    expect(doc.querySelector('form')).toBeNull();
    expect(doc.querySelector('svg')).toBeNull();
    expect(doc.querySelector('[aria-pressed]')).toBeNull();
  });
});

describe('CategoryFilter (ES)', () => {
  it('uses the Spanish legend, All label and status templates', async () => {
    const doc = await render('es');
    expect(doc.querySelector('legend')?.textContent?.trim()).toBe(
      'Filtrar proyectos por categoría',
    );
    expect(doc.querySelector('label[for="projects-filter-all"]')?.textContent?.trim()).toBe(
      'Todos',
    );
    const status = doc.querySelector<HTMLElement>('[data-project-filter-status]');
    expect(status?.dataset['statusAll']).toBe('Mostrando los {count} proyectos');
    expect(status?.dataset['statusOne']).toBe('Mostrando 1 proyecto de {category}');
    expect(status?.dataset['statusMany']).toBe('Mostrando {count} proyectos de {category}');
  });
});

describe('chip class drift guard', () => {
  const read = (path: string): string => readFileSync(resolve(path), 'utf8');
  const chipLiteral = (source: string): string[] =>
    /const chip =\s*'([^']+)'/.exec(source)?.[1]?.split(/\s+/) ?? [];
  const shared = [
    'inline-flex',
    'min-h-11',
    'items-center',
    'rounded-full',
    'border-2',
    'border-ink-muted',
    'px-4',
    'py-2',
    'text-sm',
    'font-semibold',
    'text-ink',
    'cursor-pointer',
    'hover:border-ink',
    'peer-checked:border-ink',
    'peer-checked:bg-ink',
    'peer-checked:text-surface',
    'peer-focus-visible:outline-2',
    'peer-focus-visible:outline-offset-2',
    'peer-focus-visible:outline-accent',
  ];

  it('keeps the filter chip in step with the ServiceChips base', () => {
    const service = chipLiteral(read('src/components/contact/ServiceChips.astro'));
    const filter = chipLiteral(read('src/components/ui/CategoryFilter.astro'));
    for (const token of shared) {
      expect(service).toContain(token);
      expect(filter).toContain(token);
    }
  });

  it('gates the filter colour transition on the motion toggle, not motion-safe', () => {
    const filter = chipLiteral(read('src/components/ui/CategoryFilter.astro'));
    expect(filter).toContain('motion-on:transition-colors');
    expect(filter).toContain('motion-on:duration-150');
    expect(filter.some((token) => token.startsWith('motion-safe:'))).toBe(false);
  });
});
