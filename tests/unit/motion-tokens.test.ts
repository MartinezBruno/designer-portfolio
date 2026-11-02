import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { durations, eases, wipeRelease } from '../../src/lib/motion/tokens';

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

  it('defines the Phase 7 navigation tokens (07-02)', () => {
    expect(cssMs('wipe')).toBe(560);
    expect(cssMs('wipe')).toBe(durations.wipe * 1000);
    expect(cssMs('nav-fade')).toBe(320);
    expect(css).toContain('--wipe-release: 0.7;');
    expect(wipeRelease).toBe(0.7);
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

/** The text inside the block whose `{` is at `open`, braces balanced. */
function blockAt(open: number): string {
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error('unbalanced braces in global.css');
}

/** The selector of the innermost rule in `text` that contains `index`. */
function selectorAt(text: string, index: number): string {
  const open = text.lastIndexOf('{', index);
  const before = Math.max(text.lastIndexOf('}', open), text.lastIndexOf('{', open - 1));
  return text
    .slice(before + 1, open)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
}

describe('parallax tokens (07-08, UI-SPEC "Parallax")', () => {
  const supports = css.indexOf('@supports (animation-timeline: view())');

  it('defines the card and teaser overscan and travel on the frame', () => {
    expect(css).toMatch(/\[data-parallax-frame\]\s*\{[^}]*--px-overscan:\s*4%;[^}]*\}/);
    expect(css).toMatch(/\[data-parallax-frame\]\s*\{[^}]*--px-travel:\s*3\.5%;[^}]*\}/);
  });

  it('keeps the travel inside the overscan (3.5% of 108% < 4%)', () => {
    expect(0.035 * 1.08).toBeLessThan(0.04);
  });

  it('has one parallax keyframe and the scroll-timeline support gate', () => {
    expect(css.match(/@keyframes parallax\b/g)).toHaveLength(1);
    expect(supports).toBeGreaterThan(-1);
  });

  it('drives every --px timeline under data-motion on, inside the support gate', () => {
    const gate = blockAt(css.indexOf('{', supports));
    const outside = css.replace(gate, '');
    expect(outside).not.toMatch(/(?:animation|view)-timeline:\s*--px/);
    const uses = [...gate.matchAll(/(?:animation|view)-timeline:\s*--px/g)];
    expect(uses.length).toBeGreaterThanOrEqual(2);
    for (const use of uses) {
      const selector = selectorAt(gate, use.index);
      for (const part of selector.split(',')) {
        expect(part.trim().startsWith("[data-motion='on']")).toBe(true);
      }
    }
  });

  it('resets parallax images in print', () => {
    const print = blockAt(css.indexOf('{', css.indexOf('@media print')));
    expect(print).toMatch(/\[data-parallax\]\s*\{[^}]*animation:\s*none !important;/);
    expect(print).toMatch(/\[data-parallax\]\s*\{[^}]*translate:\s*none !important;/);
    expect(print).toMatch(/\[data-parallax\]\s*\{[^}]*height:\s*100% !important;/);
  });
});
