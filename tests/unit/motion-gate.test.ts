// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyMotionGate,
  motionGateInline,
  onMotionPreferenceChange,
} from '../../src/lib/motion/gate';

// Typed stand-in for the browser MediaQueryList so tests can flip `matches` and fire 'change'.
class FakeMediaQueryList extends EventTarget implements MediaQueryList {
  readonly media = '(prefers-reduced-motion: reduce)';
  onchange: MediaQueryList['onchange'] = null;
  matches: boolean;

  constructor(matches: boolean) {
    super();
    this.matches = matches;
  }

  addListener(): void {
    throw new Error('deprecated addListener must not be used');
  }

  removeListener(): void {
    throw new Error('deprecated removeListener must not be used');
  }

  fire(next: boolean): void {
    this.matches = next;
    this.dispatchEvent(new Event('change'));
  }
}

function mockMatchMedia(matches: boolean): FakeMediaQueryList {
  const mql = new FakeMediaQueryList(matches);
  vi.spyOn(window, 'matchMedia').mockReturnValue(mql);
  return mql;
}

afterEach(() => {
  vi.restoreAllMocks();
  delete document.documentElement.dataset['motion'];
});

describe('applyMotionGate', () => {
  it('returns and sets on when reduced motion does not match', () => {
    mockMatchMedia(false);
    expect(applyMotionGate(document, window)).toBe('on');
    expect(document.documentElement.dataset['motion']).toBe('on');
  });

  it('returns and sets off when reduced motion matches', () => {
    mockMatchMedia(true);
    expect(applyMotionGate(document, window)).toBe('off');
    expect(document.documentElement.dataset['motion']).toBe('off');
  });

  it('defaults to off when matchMedia is not available', () => {
    const own = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    Object.defineProperty(window, 'matchMedia', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    try {
      expect(applyMotionGate(document, window)).toBe('off');
      expect(document.documentElement.dataset['motion']).toBe('off');
    } finally {
      Reflect.deleteProperty(window, 'matchMedia');
      if (own) Object.defineProperty(window, 'matchMedia', own);
    }
    expect(typeof window.matchMedia).toBe('function');
  });
});

describe('motionGateInline', () => {
  it('is a self-contained script that sets data-motion', () => {
    mockMatchMedia(false);
    new Function(motionGateInline)();
    expect(document.documentElement.dataset['motion']).toBe('on');
  });

  it('references the reduced-motion media query', () => {
    expect(motionGateInline).toContain('prefers-reduced-motion: reduce');
  });
});

describe('onMotionPreferenceChange', () => {
  it('reports off when the preference changes to reduce, and unsubscribes', () => {
    const mql = mockMatchMedia(false);
    const cb = vi.fn();
    const removeSpy = vi.spyOn(mql, 'removeEventListener');
    const off = onMotionPreferenceChange(window, cb);

    mql.fire(true);
    expect(cb).toHaveBeenCalledWith('off');
    mql.fire(false);
    expect(cb).toHaveBeenLastCalledWith('on');

    off();
    expect(removeSpy).toHaveBeenCalledTimes(1);
    mql.fire(true);
    expect(cb).toHaveBeenCalledTimes(2);
  });
});
