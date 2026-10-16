import { expect, it } from 'vitest';
import type { Dictionary } from '../../src/i18n/ui.en';

it('a dictionary missing a key is a type error', () => {
  // @ts-expect-error -- deliberately incomplete: astro check fails with ts(2578) if this ever compiles
  const incomplete = { 'hero.greeting': 'x' } satisfies Dictionary;
  expect(Object.keys(incomplete)).toHaveLength(1);
});
