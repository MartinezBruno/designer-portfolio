import { vi } from 'vitest';

export const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

// Typed stand-in for the browser MediaQueryList so tests can flip `matches` and fire 'change'.
export class FakeMediaQueryList extends EventTarget implements MediaQueryList {
  readonly media: string;
  onchange: MediaQueryList['onchange'] = null;
  matches: boolean;

  constructor(media: string, matches: boolean) {
    super();
    this.media = media;
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

export interface FakeMedia {
  /** The single list instance for a query (created on first use, `matches: false` if unmapped). */
  get(query: string): FakeMediaQueryList;
}

/**
 * Mocks `window.matchMedia` per query string. Each query keeps one list instance, so a
 * listener added by the code under test receives the `fire()` calls made by the test.
 * Restore with `vi.restoreAllMocks()`.
 */
export function mockMatchMedia(map: Record<string, boolean>): FakeMedia {
  const lists = new Map<string, FakeMediaQueryList>();
  const get = (query: string): FakeMediaQueryList => {
    let mql = lists.get(query);
    if (!mql) {
      mql = new FakeMediaQueryList(query, map[query] ?? false);
      lists.set(query, mql);
    }
    return mql;
  };
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => get(query));
  return { get };
}

/** Runs `fn` with `window.matchMedia` removed, then restores it. */
export function withoutMatchMedia(fn: () => void): void {
  const own = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  Object.defineProperty(window, 'matchMedia', {
    value: undefined,
    configurable: true,
    writable: true,
  });
  try {
    fn();
  } finally {
    Reflect.deleteProperty(window, 'matchMedia');
    if (own) Object.defineProperty(window, 'matchMedia', own);
  }
}

/** Makes reading `window.localStorage` throw (blocked storage) until the returned restore runs. */
export function blockLocalStorage(): () => void {
  const own = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('blocked', 'SecurityError');
    },
  });
  return () => {
    Reflect.deleteProperty(window, 'localStorage');
    if (own) Object.defineProperty(window, 'localStorage', own);
  };
}
