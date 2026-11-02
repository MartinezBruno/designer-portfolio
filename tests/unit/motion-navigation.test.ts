// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bindNavigation } from '../../src/lib/motion/navigation';

// 07-01: app-scope router hooks (MOTN-05, 07 D-04, D-05; Research Pattern 1, Pitfalls 1, 2, 9).

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

const ARRIVING_WITH_TOGGLE =
  '<!doctype html><html data-motion="off"><body><button data-motion-toggle aria-pressed="false"></button></body></html>';
const ARRIVING_WITHOUT_TOGGLE = '<!doctype html><html data-motion="off"><body></body></html>';

interface FakeTransition {
  finished: Promise<void>;
  finish: () => void;
}

function fakeTransition(): FakeTransition {
  let finish: () => void = () => undefined;
  const finished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return { finished, finish };
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
    unbind = bindNavigation(document);
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
