import { describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { interpolate, useTranslations } from '../../src/i18n/t';

describe('dictionaries', () => {
  it('es has exactly the en keys', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it('has no empty strings in either language', () => {
    for (const value of [...Object.values(en), ...Object.values(es)]) {
      expect(value.trim()).not.toBe('');
    }
  });
});

describe('useTranslations', () => {
  it('returns the Spanish string for es', () => {
    expect(useTranslations('es')('a11y.skipToContent')).toBe('Saltar al contenido');
  });

  it('returns the English string for en', () => {
    expect(useTranslations('en')('nav.contact')).toBe('Contact');
  });
});

describe('interpolate', () => {
  it('replaces known tokens', () => {
    expect(interpolate('© {year} Martina Fernandez', { year: 2026 })).toBe(
      '© 2026 Martina Fernandez',
    );
  });

  it('leaves unknown tokens untouched', () => {
    expect(interpolate('a {x} b', { year: 2026 })).toBe('a {x} b');
  });
});
