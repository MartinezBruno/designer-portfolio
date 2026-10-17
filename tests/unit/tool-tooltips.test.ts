// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLifecycle } from '../../src/lib/motion/lifecycle';
import { initToolTooltips } from '../../src/lib/ui/tooltips';

function tile(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
}

function tap(el: Element, pointerType: string): void {
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType }));
}

function isOpen(id: string): boolean {
  return tile(id).hasAttribute('data-open');
}

function isDismissed(id: string): boolean {
  return tile(id).hasAttribute('data-dismissed');
}

describe('initToolTooltips', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <span role="img" tabindex="0" data-tool id="a"></span>
      <span role="img" tabindex="0" data-tool id="b"></span>
      <span role="img" tabindex="0" data-tool id="c"></span>
      <p id="out">outside</p>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns undefined when there are no tool tiles', () => {
    document.body.innerHTML = '<p>nothing</p>';
    expect(initToolTooltips(document)).toBeUndefined();
  });

  it('toggles data-open on touch tap', () => {
    const cleanup = initToolTooltips(document);
    tap(tile('a'), 'touch');
    expect(isOpen('a')).toBe(true);
    tap(tile('a'), 'touch');
    expect(isOpen('a')).toBe(false);
    cleanup?.();
  });

  it('treats pen like touch and ignores mouse pointerup', () => {
    const cleanup = initToolTooltips(document);
    tap(tile('a'), 'pen');
    expect(isOpen('a')).toBe(true);
    tap(tile('b'), 'mouse');
    expect(isOpen('b')).toBe(false);
    cleanup?.();
  });

  it('opens one tooltip at a time on tap', () => {
    const cleanup = initToolTooltips(document);
    tap(tile('a'), 'touch');
    tap(tile('b'), 'touch');
    expect(isOpen('b')).toBe(true);
    expect(isOpen('a')).toBe(false);
    expect(isDismissed('a')).toBe(true);
    cleanup?.();
  });

  it('pointerenter and focusin un-dismiss the tile and dismiss the others', () => {
    const cleanup = initToolTooltips(document);
    tile('a').setAttribute('data-dismissed', '');
    tile('a').dispatchEvent(new PointerEvent('pointerenter'));
    expect(isDismissed('a')).toBe(false);
    expect(isDismissed('b')).toBe(true);
    expect(isDismissed('c')).toBe(true);

    tile('b').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(isDismissed('b')).toBe(false);
    expect(isDismissed('a')).toBe(true);
    expect(isDismissed('c')).toBe(true);
    cleanup?.();
  });

  it('hovering another tile keeps the focused tile tooltip (WCAG 1.4.13 persistent)', () => {
    const cleanup = initToolTooltips(document);
    tile('a').focus();
    tile('a').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(document.activeElement).toBe(tile('a'));

    tile('b').dispatchEvent(new PointerEvent('pointerenter'));
    expect(isDismissed('a')).toBe(false);
    expect(isDismissed('b')).toBe(false);
    expect(isDismissed('c')).toBe(true);

    tile('b').dispatchEvent(new PointerEvent('pointerleave'));
    tile('c').dispatchEvent(new PointerEvent('pointerenter'));
    expect(isDismissed('a')).toBe(false);
    expect(isDismissed('b')).toBe(true);
    cleanup?.();
  });

  it('a focused tile dismissed with Escape stays dismissed when another tile is hovered', () => {
    const cleanup = initToolTooltips(document);
    tile('a').focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    tile('b').dispatchEvent(new PointerEvent('pointerenter'));
    expect(isDismissed('a')).toBe(true);
    expect(isDismissed('b')).toBe(false);
    cleanup?.();
  });

  it('Escape closes and dismisses every tooltip', () => {
    const cleanup = initToolTooltips(document);
    tap(tile('a'), 'touch');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    for (const id of ['a', 'b', 'c']) {
      expect(isOpen(id)).toBe(false);
      expect(isDismissed(id)).toBe(true);
    }
    cleanup?.();
  });

  it('a pointerdown outside the tiles closes every tooltip', () => {
    const cleanup = initToolTooltips(document);
    tap(tile('a'), 'touch');
    tile('out').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(isOpen('a')).toBe(false);
    cleanup?.();
  });

  it('a pointerdown on a tile does not close its tooltip', () => {
    const cleanup = initToolTooltips(document);
    tap(tile('a'), 'touch');
    tile('a').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(isOpen('a')).toBe(true);
    cleanup?.();
  });

  it('stops reacting after cleanup', () => {
    const cleanup = initToolTooltips(document);
    expect(cleanup).toBeTypeOf('function');
    cleanup?.();
    tap(tile('a'), 'touch');
    tile('b').dispatchEvent(new PointerEvent('pointerenter'));
    tile('c').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    for (const id of ['a', 'b', 'c']) {
      expect(isOpen(id)).toBe(false);
      expect(isDismissed(id)).toBe(false);
    }
  });

  it('does not duplicate listeners across 10 lifecycle cycles', () => {
    const lifecycle = createLifecycle(document);
    lifecycle.register(initToolTooltips);
    lifecycle.mount();
    for (let i = 0; i < 10; i += 1) {
      lifecycle.unmount();
      lifecycle.mount();
    }
    expect(lifecycle.activeCleanups).toBe(1);
    tap(tile('a'), 'touch');
    expect(isOpen('a')).toBe(true);
    lifecycle.unmount();
  });
});
