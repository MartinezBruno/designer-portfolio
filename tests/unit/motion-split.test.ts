// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { canSplit, splitAndRise } from '../../src/lib/motion/split-lines';
import { durations, eases } from '../../src/lib/motion/tokens';
import { FakeSplitText, makeGsapFake } from './helpers/fake-gsap';

function heading(html: string): HTMLElement {
  document.body.innerHTML = `<h2 id="h" data-reveal="lines">${html}</h2>`;
  const el = document.getElementById('h');
  if (!el) throw new Error('fixture missing');
  return el;
}

describe('canSplit', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is true for plain text and nested non-link spans', () => {
    expect(canSplit(heading('Selected work'))).toBe(true);
    expect(canSplit(heading('Proyecto <span lang="en">Brand</span>'))).toBe(true);
  });

  it('is false when the heading wraps a link', () => {
    expect(canSplit(heading('<a href="/x">Next</a>'))).toBe(false);
  });
});

describe('splitAndRise', () => {
  beforeEach(() => {
    FakeSplitText.reset();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('splits lines with span masks, autoSplit and aria auto for plain text', () => {
    const fake = makeGsapFake();
    const h = heading('Selected work');
    splitAndRise(h, fake.modules);
    const split = FakeSplitText.created[0];
    expect(split?.target).toBe(h);
    expect(split?.vars).toMatchObject({
      type: 'lines',
      mask: 'lines',
      tag: 'span',
      linesClass: 'split-line',
      autoSplit: true,
      aria: 'auto',
    });
  });

  it("uses aria 'none' when the heading holds a lang span", () => {
    const fake = makeGsapFake();
    splitAndRise(heading('Proyecto <span lang="en">Brand</span>'), fake.modules);
    expect(FakeSplitText.created[0]?.vars['aria']).toBe('none');
  });

  it('onSplit clips masks vertically only, marks the heading revealed and returns the rise', () => {
    const fake = makeGsapFake();
    const h = heading('Selected work');
    splitAndRise(h, fake.modules);
    const split = FakeSplitText.created[0];
    if (!split) throw new Error('no split');
    for (const mask of split.masks) {
      expect(mask.style.overflowY).toBe('clip');
      expect(mask.style.overflowX).not.toBe('clip');
    }
    expect(h.hasAttribute('data-revealed')).toBe(true);
    expect(fake.from).toHaveBeenCalledTimes(1);
    const tween = fake.tweens[0];
    expect(tween?.targets).toBe(split.lines);
    expect(tween?.vars).toMatchObject({
      yPercent: 110,
      duration: durations.line,
      ease: eases.reveal,
      stagger: 0.08,
    });
    // autoSplit carries the tween returned from onSplit across re-splits.
    expect(split.onSplitResult).toBe(tween);
  });

  it('reverts the split when the rise completes', () => {
    const fake = makeGsapFake();
    const h = heading('Selected work');
    splitAndRise(h, fake.modules);
    const split = FakeSplitText.created[0];
    (fake.tweens[0]?.vars['onComplete'] as () => void)();
    expect(split?.reverted).toBe(1);
    expect(h.innerHTML).toBe('Selected work');
  });

  it('finish() jumps the rise to its end and reverts exactly once', () => {
    const fake = makeGsapFake();
    const h = heading('Selected work');
    const handle = splitAndRise(h, fake.modules);
    handle.finish();
    expect(fake.tweens[0]?.progress).toHaveBeenCalledWith(1);
    expect(FakeSplitText.created[0]?.reverted).toBe(1);
    handle.finish();
    expect(FakeSplitText.created[0]?.reverted).toBe(1);
    expect(h.querySelector('.split-line, .split-line-mask')).toBeNull();
  });
});
