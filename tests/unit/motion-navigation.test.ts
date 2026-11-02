// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchMotionChange } from '../../src/lib/motion/events';
import { bindNavigation, type NavigationHandle } from '../../src/lib/motion/navigation';

// 07-01: app-scope router hooks (MOTN-05, 07 D-04, D-05; Research Pattern 1, Pitfalls 1, 2, 9).

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

const ARRIVING_WITH_TOGGLE =
  '<!doctype html><html data-motion="off"><body><button data-motion-toggle aria-pressed="false"></button></body></html>';
const ARRIVING_WITHOUT_TOGGLE = '<!doctype html><html data-motion="off"><body></body></html>';

interface FakeTransition {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
  makeReady: () => void;
  finish: () => void;
}

function fakeTransition(): FakeTransition {
  let finish: () => void = () => undefined;
  let makeReady: () => void = () => undefined;
  const finished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const ready = new Promise<void>((resolve) => {
    makeReady = resolve;
  });
  const transition: FakeTransition = {
    ready,
    finished,
    updateCallbackDone: Promise.resolve(),
    skipTransition: vi.fn(() => {
      transition.finish();
    }),
    makeReady,
    finish,
  };
  return transition;
}

function beforeSwap(newDocument: Document, viewTransition?: FakeTransition): Event {
  const event = Object.assign(new Event('astro:before-swap', { cancelable: true }), {
    newDocument,
    viewTransition,
  });
  document.dispatchEvent(event);
  return event;
}

function beforePreparation(): Event {
  const event = new Event('astro:before-preparation', { cancelable: true });
  document.dispatchEvent(event);
  return event;
}

function setLiveState(state: string): void {
  document.documentElement.dataset['motion'] = state;
}

describe('bindNavigation', () => {
  let unbind: () => void = () => undefined;

  beforeEach(() => {
    unbind = bindNavigation(document).unbind;
  });

  afterEach(() => {
    unbind();
    delete document.documentElement.dataset['motion'];
    delete document.documentElement.dataset['wipe'];
  });

  for (const state of ['on', 'reduced'] as const) {
    it(`carries the live data-motion="${state}" onto the arriving document`, () => {
      setLiveState(state);
      const next = parse(ARRIVING_WITH_TOGGLE);
      beforeSwap(next);
      expect(next.documentElement.dataset['motion']).toBe(state);
    });
  }

  it('presses the arriving toggle when the live state is reduced', () => {
    setLiveState('reduced');
    const next = parse(ARRIVING_WITH_TOGGLE);
    beforeSwap(next);
    expect(next.querySelector('[data-motion-toggle]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('leaves the arriving toggle unpressed when the live state is on', () => {
    setLiveState('on');
    const next = parse(ARRIVING_WITH_TOGGLE.replace('aria-pressed="false"', 'aria-pressed="true"'));
    beforeSwap(next);
    expect(next.querySelector('[data-motion-toggle]')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('does not throw when the arriving document has no toggle', () => {
    setLiveState('reduced');
    const next = parse(ARRIVING_WITHOUT_TOGGLE);
    expect(() => beforeSwap(next)).not.toThrow();
    expect(next.documentElement.dataset['motion']).toBe('reduced');
  });

  it('opts out of soft navigation when motion is off (full page load)', () => {
    setLiveState('off');
    expect(beforePreparation().defaultPrevented).toBe(true);
  });

  for (const state of ['on', 'reduced'] as const) {
    it(`keeps soft navigation when motion is ${state}`, () => {
      setLiveState(state);
      expect(beforePreparation().defaultPrevented).toBe(false);
    });
  }

  it('marks the arriving document with data-wipe="out" under on (07-02)', () => {
    setLiveState('on');
    const next = parse(ARRIVING_WITHOUT_TOGGLE);
    beforeSwap(next, fakeTransition());
    expect(next.documentElement.dataset['wipe']).toBe('out');
  });

  it('never marks the arriving document under reduced', () => {
    setLiveState('reduced');
    const next = parse(ARRIVING_WITHOUT_TOGGLE);
    beforeSwap(next, fakeTransition());
    expect(next.documentElement.hasAttribute('data-wipe')).toBe(false);
  });

  it('clears data-wipe from the live html when the transition finishes', async () => {
    setLiveState('on');
    const transition = fakeTransition();
    beforeSwap(parse(ARRIVING_WITHOUT_TOGGLE), transition);
    // The router swaps root attributes; simulate the arriving marker on the live html.
    document.documentElement.dataset['wipe'] = 'out';
    transition.finish();
    await transition.finished;
    await Promise.resolve();
    expect(document.documentElement.hasAttribute('data-wipe')).toBe(false);
  });

  it('clears a stale data-wipe at the start of the next navigation (aborted transition)', () => {
    setLiveState('on');
    document.documentElement.dataset['wipe'] = 'out';
    beforePreparation();
    expect(document.documentElement.hasAttribute('data-wipe')).toBe(false);
  });

  it('unbind removes every listener', () => {
    unbind();
    setLiveState('off');
    expect(beforePreparation().defaultPrevented).toBe(false);
    setLiveState('reduced');
    const next = parse(ARRIVING_WITH_TOGGLE);
    beforeSwap(next);
    expect(next.documentElement.dataset['motion']).toBe('off');
    expect(next.querySelector('[data-motion-toggle]')?.getAttribute('aria-pressed')).toBe('false');
  });
});

// 07-04: release gate (D-16, Research Pattern 2, Pitfall 3) and live-toggle skip (D-18).
describe('bindNavigation release gate', () => {
  let navigation: NavigationHandle;

  beforeEach(() => {
    vi.useFakeTimers();
    navigation = bindNavigation(document);
  });

  afterEach(() => {
    navigation.unbind();
    vi.useRealTimers();
    delete document.documentElement.dataset['motion'];
    delete document.documentElement.dataset['wipe'];
    delete document.documentElement.dataset['vt'];
  });

  /** Swaps like the router: arriving root attributes land on the live html. */
  function swap(transition?: FakeTransition): Document {
    const next = parse(ARRIVING_WITHOUT_TOGGLE);
    beforeSwap(next, transition);
    if (next.documentElement.hasAttribute('data-vt')) document.documentElement.dataset['vt'] = '';
    return next;
  }

  function tracked(): { released: () => boolean } {
    let released = false;
    void navigation.waitForRelease().then(() => {
      released = true;
    });
    return { released: () => released };
  }

  it('marks the arriving html with data-vt and releases 392 ms after ready under on', async () => {
    setLiveState('on');
    const transition = fakeTransition();
    const next = swap(transition);
    expect(next.documentElement.hasAttribute('data-vt')).toBe(true);
    const state = tracked();
    await vi.advanceTimersByTimeAsync(100);
    transition.makeReady();
    await vi.advanceTimersByTimeAsync(391);
    expect(state.released()).toBe(false);
    expect(document.documentElement.hasAttribute('data-vt')).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(state.released()).toBe(true);
    expect(document.documentElement.hasAttribute('data-vt')).toBe(false);
  });

  it('releases when the transition finishes first', async () => {
    setLiveState('on');
    const transition = fakeTransition();
    swap(transition);
    const state = tracked();
    await vi.advanceTimersByTimeAsync(200);
    transition.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.released()).toBe(true);
    expect(document.documentElement.hasAttribute('data-vt')).toBe(false);
  });

  it('releases at the 1200 ms cap when neither ready nor finished settle', async () => {
    setLiveState('on');
    swap(fakeTransition());
    const state = tracked();
    await vi.advanceTimersByTimeAsync(1199);
    expect(state.released()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(state.released()).toBe(true);
    expect(document.documentElement.hasAttribute('data-vt')).toBe(false);
  });

  it('releases on finished under reduced, not at 392 ms after ready', async () => {
    setLiveState('reduced');
    const transition = fakeTransition();
    swap(transition);
    const state = tracked();
    transition.makeReady();
    await vi.advanceTimersByTimeAsync(500);
    expect(state.released()).toBe(false);
    transition.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.released()).toBe(true);
  });

  it('caps reduced at 1200 ms too', async () => {
    setLiveState('reduced');
    swap(fakeTransition());
    const state = tracked();
    await vi.advanceTimersByTimeAsync(1200);
    expect(state.released()).toBe(true);
  });

  it('releases at once and sets no data-vt without a view transition (fallback swap)', async () => {
    setLiveState('on');
    const next = swap();
    expect(next.documentElement.hasAttribute('data-vt')).toBe(false);
    const state = tracked();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.released()).toBe(true);
  });

  it('releases at once on first load (no navigation yet)', async () => {
    const state = tracked();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.released()).toBe(true);
  });

  it('swallows rejected ready and finished promises (aborted transition)', async () => {
    setLiveState('on');
    const ready = Promise.reject(new Error('skipped'));
    const finished = Promise.reject(new Error('aborted'));
    const transition = { ...fakeTransition(), ready, finished };
    swap(transition);
    const state = tracked();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.released()).toBe(true);
    expect(document.documentElement.hasAttribute('data-vt')).toBe(false);
  });

  it('a superseded transition does not clear its successor data-vt', async () => {
    setLiveState('on');
    const first = fakeTransition();
    swap(first);
    const second = fakeTransition();
    swap(second);
    first.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(document.documentElement.hasAttribute('data-vt')).toBe(true);
    second.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(document.documentElement.hasAttribute('data-vt')).toBe(false);
  });

  it('skips a pending transition once when motion changes to reduced (D-18)', async () => {
    setLiveState('on');
    const transition = fakeTransition();
    swap(transition);
    setLiveState('reduced');
    dispatchMotionChange(document, 'reduced');
    expect(transition.skipTransition).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(document.documentElement.hasAttribute('data-vt')).toBe(false);
    dispatchMotionChange(document, 'off');
    expect(transition.skipTransition).toHaveBeenCalledTimes(1);
  });

  it('does not skip when motion changes to on', () => {
    setLiveState('reduced');
    const transition = fakeTransition();
    swap(transition);
    dispatchMotionChange(document, 'on');
    expect(transition.skipTransition).not.toHaveBeenCalled();
  });

  it('unbind stops the motion:change skip', () => {
    setLiveState('on');
    const transition = fakeTransition();
    swap(transition);
    navigation.unbind();
    dispatchMotionChange(document, 'reduced');
    expect(transition.skipTransition).not.toHaveBeenCalled();
  });
});
