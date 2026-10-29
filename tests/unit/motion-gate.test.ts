// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { currentMotionState, onMotionChange } from '../../src/lib/motion/events';
import {
  MOTION_STORAGE_KEY,
  applyMotionGate,
  isOsReduced,
  motionGateInline,
  setMotionPreference,
  syncMotionGate,
} from '../../src/lib/motion/gate';
import type { MotionState } from '../../src/lib/motion/gate';
import {
  REDUCE_QUERY,
  blockLocalStorage,
  mockMatchMedia,
  withoutMatchMedia,
} from './helpers/fake-media';

function recordChanges(): { states: MotionState[]; ac: AbortController } {
  const states: MotionState[] = [];
  const ac = new AbortController();
  onMotionChange(
    document,
    (state) => {
      states.push(state);
    },
    ac.signal,
  );
  return { states, ac };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  // A successful write clears any session override left by a "storage throws" test.
  vi.restoreAllMocks();
  mockMatchMedia({});
  setMotionPreference(document, window, false);
  vi.restoreAllMocks();
  window.localStorage.clear();
  delete document.documentElement.dataset['motion'];
});

describe('applyMotionGate', () => {
  it('returns and sets on when reduced motion does not match and nothing is stored', () => {
    mockMatchMedia({ [REDUCE_QUERY]: false });
    expect(applyMotionGate(document, window)).toBe('on');
    expect(document.documentElement.dataset['motion']).toBe('on');
  });

  it('resolves OS reduce to reduced, not off', () => {
    mockMatchMedia({ [REDUCE_QUERY]: true });
    expect(applyMotionGate(document, window)).toBe('reduced');
    expect(document.documentElement.dataset['motion']).toBe('reduced');
  });

  it('keeps reduced under OS reduce whatever storage holds', () => {
    mockMatchMedia({ [REDUCE_QUERY]: true });
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'on');
    expect(applyMotionGate(document, window)).toBe('reduced');
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'reduced');
    expect(applyMotionGate(document, window)).toBe('reduced');
  });

  it('defaults to off when matchMedia is not available', () => {
    withoutMatchMedia(() => {
      window.localStorage.setItem(MOTION_STORAGE_KEY, 'reduced');
      expect(applyMotionGate(document, window)).toBe('off');
      expect(document.documentElement.dataset['motion']).toBe('off');
    });
    expect(typeof window.matchMedia).toBe('function');
  });

  it('honours a stored reduced choice when the OS has no preference', () => {
    mockMatchMedia({ [REDUCE_QUERY]: false });
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'reduced');
    expect(applyMotionGate(document, window)).toBe('reduced');
  });

  it.each(['<img src=x>', 'on', '', 'REDUCED', ' reduced'])(
    'treats the stored value %j as on',
    (stored) => {
      mockMatchMedia({ [REDUCE_QUERY]: false });
      window.localStorage.setItem(MOTION_STORAGE_KEY, stored);
      expect(applyMotionGate(document, window)).toBe('on');
    },
  );

  it('never writes a tampered stored value into the DOM', () => {
    mockMatchMedia({ [REDUCE_QUERY]: false });
    window.localStorage.setItem(MOTION_STORAGE_KEY, '<img src=x>');
    applyMotionGate(document, window);
    expect(document.documentElement.outerHTML).not.toContain('<img src=x>');
    expect(document.documentElement.outerHTML).not.toContain('img src');
  });

  it('lets the OS decide when reading localStorage throws', () => {
    const restore = blockLocalStorage();
    try {
      mockMatchMedia({ [REDUCE_QUERY]: false });
      expect(() => applyMotionGate(document, window)).not.toThrow();
      expect(applyMotionGate(document, window)).toBe('on');
      mockMatchMedia({ [REDUCE_QUERY]: true });
      expect(applyMotionGate(document, window)).toBe('reduced');
    } finally {
      restore();
    }
  });

  it('uses an explicit override instead of reading storage', () => {
    mockMatchMedia({ [REDUCE_QUERY]: false });
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    expect(applyMotionGate(document, window, 'reduced')).toBe('reduced');
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'reduced');
    expect(applyMotionGate(document, window, null)).toBe('on');
    expect(getItem).not.toHaveBeenCalled();
  });
});

describe('motionGateInline', () => {
  it('is a self-contained script that sets data-motion', () => {
    mockMatchMedia({ [REDUCE_QUERY]: false });
    new Function(motionGateInline)();
    expect(document.documentElement.dataset['motion']).toBe('on');
  });

  it('reads the stored choice from inside the stringified function', () => {
    mockMatchMedia({ [REDUCE_QUERY]: false });
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'reduced');
    new Function(motionGateInline)();
    expect(document.documentElement.dataset['motion']).toBe('reduced');
  });

  it('references the reduced-motion media query and the storage key', () => {
    expect(motionGateInline).toContain('prefers-reduced-motion: reduce');
    expect(motionGateInline.includes(MOTION_STORAGE_KEY)).toBe(true);
  });
});

describe('isOsReduced', () => {
  it('follows the reduce media query and is false without matchMedia', () => {
    mockMatchMedia({ [REDUCE_QUERY]: true });
    expect(isOsReduced(window)).toBe(true);
    mockMatchMedia({ [REDUCE_QUERY]: false });
    expect(isOsReduced(window)).toBe(false);
    withoutMatchMedia(() => {
      expect(isOsReduced(window)).toBe(false);
    });
  });
});

describe('setMotionPreference', () => {
  it('stores reduced, dispatches one motion:change, and removes the key when turned back on', () => {
    mockMatchMedia({ [REDUCE_QUERY]: false });
    applyMotionGate(document, window);
    const { states, ac } = recordChanges();

    expect(setMotionPreference(document, window, true)).toBe('reduced');
    expect(window.localStorage.getItem(MOTION_STORAGE_KEY)).toBe('reduced');
    expect(document.documentElement.dataset['motion']).toBe('reduced');
    expect(states).toEqual(['reduced']);

    expect(setMotionPreference(document, window, true)).toBe('reduced');
    expect(states).toEqual(['reduced']);

    expect(setMotionPreference(document, window, false)).toBe('on');
    expect(window.localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull();
    expect(states).toEqual(['reduced', 'on']);
    ac.abort();
  });

  it('never stores on', () => {
    mockMatchMedia({ [REDUCE_QUERY]: false });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    setMotionPreference(document, window, false);
    setMotionPreference(document, window, true);
    setMotionPreference(document, window, false);
    for (const call of setItem.mock.calls) expect(call[1]).toBe('reduced');
  });

  it('falls back to a session override when the storage write throws', () => {
    const media = mockMatchMedia({ [REDUCE_QUERY]: false });
    applyMotionGate(document, window);
    const off = syncMotionGate(document, window);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    expect(setMotionPreference(document, window, true)).toBe('reduced');
    expect(document.documentElement.dataset['motion']).toBe('reduced');

    // OS change re-resolves with the session override still in force.
    media.get(REDUCE_QUERY).fire(true);
    expect(document.documentElement.dataset['motion']).toBe('reduced');
    media.get(REDUCE_QUERY).fire(false);
    expect(document.documentElement.dataset['motion']).toBe('reduced');
    off();
  });

  it('works when even reading localStorage throws', () => {
    const restore = blockLocalStorage();
    try {
      mockMatchMedia({ [REDUCE_QUERY]: false });
      expect(applyMotionGate(document, window)).toBe('on');
      expect(setMotionPreference(document, window, true)).toBe('reduced');
      expect(setMotionPreference(document, window, false)).toBe('on');
    } finally {
      restore();
    }
  });
});

describe('syncMotionGate', () => {
  it('re-resolves on OS changes, dispatches motion:change, and unsubscribes', () => {
    const media = mockMatchMedia({ [REDUCE_QUERY]: false });
    applyMotionGate(document, window);
    const { states, ac } = recordChanges();
    const off = syncMotionGate(document, window);
    const mql = media.get(REDUCE_QUERY);

    mql.fire(true);
    expect(document.documentElement.dataset['motion']).toBe('reduced');
    mql.fire(false);
    expect(document.documentElement.dataset['motion']).toBe('on');
    expect(states).toEqual(['reduced', 'on']);

    off();
    mql.fire(true);
    expect(document.documentElement.dataset['motion']).toBe('on');
    expect(states).toEqual(['reduced', 'on']);
    ac.abort();
  });

  it('keeps a stored reduced choice when the OS stops reducing motion', () => {
    const media = mockMatchMedia({ [REDUCE_QUERY]: true });
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'reduced');
    applyMotionGate(document, window);
    const { states, ac } = recordChanges();
    const off = syncMotionGate(document, window);

    media.get(REDUCE_QUERY).fire(false);
    expect(document.documentElement.dataset['motion']).toBe('reduced');
    expect(states).toEqual([]);
    off();
    ac.abort();
  });

  it('is a no-op without matchMedia', () => {
    withoutMatchMedia(() => {
      const off = syncMotionGate(document, window);
      expect(off).toBeTypeOf('function');
      off();
      expect(document.documentElement.dataset['motion']).toBeUndefined();
    });
  });
});

describe('motion:change bus', () => {
  it('stops calling a listener after its signal aborts', () => {
    mockMatchMedia({ [REDUCE_QUERY]: false });
    applyMotionGate(document, window);
    const { states, ac } = recordChanges();
    setMotionPreference(document, window, true);
    ac.abort();
    setMotionPreference(document, window, false);
    expect(states).toEqual(['reduced']);
  });

  it('narrows the dataset value to the union', () => {
    document.documentElement.dataset['motion'] = 'reduced';
    expect(currentMotionState(document)).toBe('reduced');
    document.documentElement.dataset['motion'] = 'on';
    expect(currentMotionState(document)).toBe('on');
    document.documentElement.dataset['motion'] = 'bogus';
    expect(currentMotionState(document)).toBe('off');
    delete document.documentElement.dataset['motion'];
    expect(currentMotionState(document)).toBe('off');
  });
});
