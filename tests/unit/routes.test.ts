import { describe, expect, it } from 'vitest';
import { absoluteFor, alternatePath, stripLocale } from '../../src/i18n/routes';

describe('stripLocale', () => {
  it.each([
    ['/es/', '/'],
    ['/es', '/'],
    ['/es/projects/', '/projects/'],
    ['/essay/', '/essay/'],
    ['/', '/'],
  ])('%s -> %s', (input, expected) => {
    expect(stripLocale(input)).toBe(expected);
  });
});

describe('alternatePath', () => {
  it('maps / to /es/', () => {
    expect(alternatePath('/', 'es')).toBe('/es/');
  });

  it('maps /es/ to /', () => {
    expect(alternatePath('/es/', 'en')).toBe('/');
  });

  it('preserves the rest of the path', () => {
    expect(alternatePath('/es/projects/', 'en')).toBe('/projects/');
  });
});

describe('absoluteFor', () => {
  it('builds the absolute en URL from an es path', () => {
    expect(absoluteFor('/es/', 'en')).toBe('https://martifernandez.com/');
  });

  it('builds the absolute es URL from an en path', () => {
    expect(absoluteFor('/', 'es')).toBe('https://martifernandez.com/es/');
  });
});
