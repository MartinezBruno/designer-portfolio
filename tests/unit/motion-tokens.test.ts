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
    expect(cssMs('wipe')).toBe(480);
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
    // The one allowed hide is the 07-18 contact reserve: it parks the already-[hidden] lazy form
    // in the grid cell so the column keeps its height, and visibility: hidden keeps the parked
    // form out of the tab order and the accessibility tree. Nothing else may hide this way.
    const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const hide of code.matchAll(/visibility:\s*hidden|display:\s*none/g)) {
      expect(selectorAt(code, hide.index)).toMatch(/form\[data-contact-form\]\[hidden\]$/);
    }
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

describe('detail-stack side entrance (07-09, D-11a, UI-SPEC "Detail-stack side entrance")', () => {
  const supports = css.indexOf('@supports (animation-timeline: view())');

  it('defines the travel token and the side factors', () => {
    expect(css).toMatch(/\[data-stack-frame\]\s*\{[^}]*--stack-travel:\s*7%;[^}]*\}/);
    expect(css).toMatch(/\[data-stack-enter='left'\]\s*\{[^}]*--stack-from:\s*-1;[^}]*\}/);
    expect(css).toMatch(/\[data-stack-enter='right'\]\s*\{[^}]*--stack-from:\s*1;[^}]*\}/);
  });

  it('has one stack-enter keyframe that ends at rest', () => {
    expect(css.match(/@keyframes stack-enter\b/g)).toHaveLength(1);
    const keyframes = blockAt(css.indexOf('{', css.indexOf('@keyframes stack-enter')));
    expect(keyframes).toMatch(
      /from\s*\{[^}]*translate:\s*calc\(var\(--stack-from\) \* var\(--stack-travel\)\) 0;/,
    );
    expect(keyframes).toMatch(/to\s*\{[^}]*translate:\s*0 0;/);
  });

  it('runs on the --stack view timeline over the entry range, inside the gate, under on', () => {
    const gate = blockAt(css.indexOf('{', supports));
    const outside = css.replace(gate, '');
    expect(outside).not.toMatch(/(?:animation|view)-timeline:\s*--stack/);
    expect(gate).toContain('view-timeline: --stack block');
    expect(gate).toContain('animation-range: entry 0% entry 100%');
    const uses = [...gate.matchAll(/(?:animation|view)-timeline:\s*--stack/g)];
    expect(uses.length).toBeGreaterThanOrEqual(2);
    for (const use of uses) {
      const selector = selectorAt(gate, use.index);
      for (const part of selector.split(',')) {
        expect(part.trim().startsWith("[data-motion='on']")).toBe(true);
      }
    }
  });

  it('writes the stack animation with longhands only (the minifier drops a shorthand)', () => {
    const open = css.indexOf('{', supports);
    const gate = blockAt(open);
    const at = gate.indexOf('animation-name: stack-enter');
    expect(at).toBeGreaterThan(-1);
    const rule = blockAt(open + 1 + gate.lastIndexOf('{', at));
    expect(rule).not.toMatch(/(^|[\s;])animation:/);
    expect(rule).toContain('animation-fill-mode: both');
    expect(rule).toContain('animation-timing-function: var(--ease-reveal)');
    expect(rule).toContain('animation-timeline: --stack');
  });

  it('resets stack images in print', () => {
    const print = blockAt(css.indexOf('{', css.indexOf('@media print')));
    expect(print).toMatch(/\[data-stack-enter\]\s*\{[^}]*animation:\s*none !important;/);
    expect(print).toMatch(/\[data-stack-enter\]\s*\{[^}]*translate:\s*none !important;/);
  });

  it('drops the superseded stack parallax tokens', () => {
    expect(css).not.toContain("[data-parallax-frame='stack']");
  });
});

describe('title morph CSS (07-13, user decision at 07-10)', () => {
  /** Every rule body whose selector names the project-title transition pseudo-elements. */
  function morphRules(): string[] {
    return [...css.matchAll(/([^{}]*project-title\)[^{}]*)\{([^{}]*)\}/g)].map((m) => m[2] ?? '');
  }

  /** The offsets (in %) of the keyframe stops of `name` that set `opacity: <value>`. */
  function stops(name: string, value: number): number[] {
    const body = blockAt(css.indexOf('{', css.indexOf(`@keyframes ${name}`)));
    const out: number[] = [];
    for (const m of body.matchAll(/([\d%,\s]+)\{([^}]*)\}/g)) {
      const opacity = /opacity:\s*([\d.]+)/.exec(m[2] ?? '')?.[1];
      if (opacity === undefined || Number(opacity) !== value) continue;
      for (const offset of (m[1] ?? '').split(',')) out.push(Number.parseFloat(offset));
    }
    return out;
  }

  it('draws the morph title in plain ink: no difference blend, no invert', () => {
    const rules = morphRules();
    expect(rules.length).toBeGreaterThanOrEqual(3);
    for (const rule of rules) {
      expect(rule).not.toMatch(/mix-blend-mode/);
      expect(rule).not.toMatch(/invert\(/);
    }
  });

  it('hides the old title before the new one appears (no doubled frame)', () => {
    const outHidden = Math.min(...stops('morph-out', 0));
    const inHidden = Math.max(...stops('morph-in', 0));
    expect(Number.isFinite(outHidden)).toBe(true);
    expect(Number.isFinite(inHidden)).toBe(true);
    expect(outHidden).toBeLessThanOrEqual(inHidden);
    expect(outHidden).toBeGreaterThanOrEqual(40);
    expect(inHidden).toBeLessThanOrEqual(60);
  });
});
