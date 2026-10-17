import { describe, expect, it } from 'vitest';
import { SLUG_PATTERN, toSlug } from '../../src/lib/projects/slug';

describe('toSlug', () => {
  it.each([
    ['Cabreras-motos-Posts', 'cabreras-motos-posts'],
    ['PuroV', 'purov'],
    ['Website-Reciclick', 'website-reciclick'],
    ['Portfolio-web', 'portfolio-web'],
    ['Sistema-visual', 'sistema-visual'],
    ['Website-InstaBlogs', 'website-instablogs'],
    ['Mart', 'mart'],
    ['Cabrera´s motos, Posts', 'cabreras-motos-posts'],
    ['Diseño gráfico', 'diseno-grafico'],
    ['Website "Reciclick"', 'website-reciclick'],
    ['  --Trim me--  ', 'trim-me'],
  ])('maps %j to %j', (input, expected) => {
    const slug = toSlug(input);
    expect(slug).toBe(expected);
    expect(slug).toMatch(SLUG_PATTERN);
  });

  it.each(['', '´´'])('throws an actionable message for %j', (input) => {
    expect(() => toSlug(input)).toThrow(
      `projects: empty slug from "${input}". Add a "slug" override in src/data/project-overrides.json`,
    );
  });

  it('SLUG_PATTERN rejects uppercase, leading dashes and double dashes', () => {
    expect(SLUG_PATTERN.test('Mart')).toBe(false);
    expect(SLUG_PATTERN.test('-mart')).toBe(false);
    expect(SLUG_PATTERN.test('mart--web')).toBe(false);
    expect(SLUG_PATTERN.test('portfolio-web')).toBe(true);
  });
});
