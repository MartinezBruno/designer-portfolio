import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { durations, eases } from '../../src/lib/motion/tokens';

const css = readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8');

function cssMs(name: string): number {
  const match = new RegExp(`--t-${name}:\\s*(\\d+)ms`).exec(css);
  if (!match?.[1]) throw new Error(`--t-${name} missing from global.css`);
  return Number(match[1]);
}

describe('motion tokens', () => {
  it.each(Object.entries(durations))('durations.%s mirrors --t-* in global.css', (key, sec) => {
    expect(cssMs(key) / 1000).toBe(sec);
  });

  it('defines the CSS-only fade and hero durations', () => {
    expect(cssMs('fade')).toBe(320);
    expect(cssMs('hero')).toBe(720);
  });

  it('defines the three UI-SPEC easing curves', () => {
    expect(css).toContain('--ease-reveal: cubic-bezier(0.22, 1, 0.36, 1)');
    expect(css).toContain('--ease-travel: cubic-bezier(0.76, 0, 0.24, 1)');
    expect(css).toContain('--ease-soft: cubic-bezier(0.33, 1, 0.68, 1)');
  });

  it('maps the eases to their GSAP equivalents', () => {
    expect(eases).toEqual({ reveal: 'power4.out', travel: 'power3.inOut', soft: 'power2.out' });
  });

  it('has a reveal failsafe keyframe and never hides with visibility/display', () => {
    expect(css).toContain('@keyframes reveal-failsafe');
    expect(css).not.toMatch(/visibility:\s*hidden|display:\s*none/);
  });
});
