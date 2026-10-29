// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MOTION_STORAGE_KEY,
  applyMotionGate,
  setMotionPreference,
  syncMotionGate,
} from '../../src/lib/motion/gate';
import { createLifecycle } from '../../src/lib/motion/lifecycle';
import { initMotionToggle } from '../../src/lib/motion/toggle';
import { REDUCE_QUERY, mockMatchMedia } from './helpers/fake-media';

// Mirrors MotionToggle.astro (icons and tooltip omitted).
const FIXTURE = `<div data-motion-toggle-root><button type="button" data-motion-toggle aria-pressed="false" aria-label="Reduce motion"></button><span id="motion-toggle-hint" hidden>Your device settings already reduce motion.</span></div>`;

function getButton(): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
  if (!button) throw new Error('fixture button missing');
  return button;
}

function getRoot(): HTMLElement {
  const root = document.querySelector<HTMLElement>('[data-motion-toggle-root]');
  if (!root) throw new Error('fixture root missing');
  return root;
}

const motion = (): string | undefined => document.documentElement.dataset['motion'];

beforeEach(() => {
  window.localStorage.clear();
  document.body.innerHTML = FIXTURE;
});

afterEach(() => {
  vi.restoreAllMocks();
  mockMatchMedia({});
  setMotionPreference(document, window, false);
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.body.innerHTML = '';
  delete document.documentElement.dataset['motion'];
});

describe('initMotionToggle', () => {
  it('returns undefined when there is no toggle', () => {
    document.body.innerHTML = '';
    expect(initMotionToggle(document)).toBeUndefined();
  });

  it('mounts unpressed and unlocked under full motion', () => {
    mockMatchMedia({ [REDUCE_QUERY]: false });
    applyMotionGate(document, window);
    const cleanup = initMotionToggle(document);
    const button = getButton();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.hasAttribute('aria-disabled')).toBe(false);
    expect(button.hasAttribute('aria-describedby')).toBe(false);
    expect(getRoot().hasAttribute('data-locked')).toBe(false);
    cleanup?.();
  });

  it('reduces motion on click and restores it on a second click', () => {
    mockMatchMedia({ [REDUCE_QUERY]: false });
    applyMotionGate(document, window);
    const cleanup = initMotionToggle(document);
    const button = getButton();

    button.click();
    expect(motion()).toBe('reduced');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(window.localStorage.getItem(MOTION_STORAGE_KEY)).toBe('reduced');

    button.click();
    expect(motion()).toBe('on');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(window.localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull();
    cleanup?.();
  });

  it('locks when the OS reduces motion: pressed, aria-disabled, hint, clicks ignored', () => {
    mockMatchMedia({ [REDUCE_QUERY]: true });
    applyMotionGate(document, window);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const cleanup = initMotionToggle(document);
    const button = getButton();

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-describedby')).toBe('motion-toggle-hint');
    expect(getRoot().hasAttribute('data-locked')).toBe(true);

    button.click();
    expect(motion()).toBe('reduced');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    cleanup?.();
  });

  it('re-syncs on OS changes and shows the stored choice after unlocking', () => {
    const media = mockMatchMedia({ [REDUCE_QUERY]: false });
    applyMotionGate(document, window);
    const off = syncMotionGate(document, window);
    const cleanup = initMotionToggle(document);
    const button = getButton();
    const mql = media.get(REDUCE_QUERY);

    mql.fire(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(getRoot().hasAttribute('data-locked')).toBe(true);

    mql.fire(false);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.hasAttribute('aria-disabled')).toBe(false);
    expect(button.hasAttribute('aria-describedby')).toBe(false);
    expect(getRoot().hasAttribute('data-locked')).toBe(false);

    // With a stored choice, unlocking keeps it pressed.
    button.click();
    mql.fire(true);
    mql.fire(false);
    expect(motion()).toBe('reduced');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.hasAttribute('aria-disabled')).toBe(false);

    off();
    cleanup?.();
  });

  it('dismisses the tooltip with Escape and clears it on blur or pointerleave', () => {
    mockMatchMedia({ [REDUCE_QUERY]: false });
    applyMotionGate(document, window);
    const cleanup = initMotionToggle(document);
    const button = getButton();
    const root = getRoot();

    button.focus();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.hasAttribute('data-dismissed')).toBe(true);
    button.dispatchEvent(new FocusEvent('blur'));
    expect(root.hasAttribute('data-dismissed')).toBe(false);

    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.hasAttribute('data-dismissed')).toBe(true);
    root.dispatchEvent(new PointerEvent('pointerleave'));
    expect(root.hasAttribute('data-dismissed')).toBe(false);

    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(root.hasAttribute('data-dismissed')).toBe(false);
    cleanup?.();
  });

  it('stops reacting after cleanup', () => {
    mockMatchMedia({ [REDUCE_QUERY]: false });
    applyMotionGate(document, window);
    const cleanup = initMotionToggle(document);
    cleanup?.();
    getButton().click();
    expect(motion()).toBe('on');
    expect(getButton().getAttribute('aria-pressed')).toBe('false');
  });

  it('is idempotent across 10 lifecycle unmount/mount cycles', () => {
    mockMatchMedia({ [REDUCE_QUERY]: false });
    applyMotionGate(document, window);
    const lifecycle = createLifecycle(document);
    lifecycle.register(initMotionToggle);
    for (let i = 0; i < 10; i += 1) {
      lifecycle.mount();
      lifecycle.unmount();
    }
    lifecycle.mount();
    expect(lifecycle.activeCleanups).toBe(1);

    // One click flips once (no duplicate listeners).
    getButton().click();
    expect(motion()).toBe('reduced');
    expect(getButton().getAttribute('aria-pressed')).toBe('true');
    lifecycle.unmount();
  });
});
