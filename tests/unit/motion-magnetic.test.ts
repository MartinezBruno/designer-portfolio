// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchMotionChange } from '../../src/lib/motion/events';
import { createLifecycle } from '../../src/lib/motion/lifecycle';
import type { GsapModules } from '../../src/lib/motion/load-gsap';
import { createMagnetic, magneticOffset, type MagneticDeps } from '../../src/lib/motion/magnetic';
import { FakeMediaQueryList } from './helpers/fake-media';

const FINE = '(hover: hover) and (pointer: fine)';
const FORCED = '(forced-colors: active)';

const FIXTURE = `
  <a id="pill" href="#" data-magnetic="pill"><span id="pill-face" data-magnetic-face>Contact</span></a>
  <a id="link" href="#" data-magnetic="link"><span id="link-face" data-magnetic-face>Behance</span></a>
`;

// Page-relative boxes: pill 100..200 x 100..148 (centre 150,124), link 400..460 x 100..120.
const RECTS: Record<string, { left: number; top: number; width: number; height: number }> = {
  pill: { left: 100, top: 100, width: 100, height: 48 },
  link: { left: 400, top: 100, width: 60, height: 20 },
};

function el(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`fixture #${id} missing`);
  return found;
}

function stubRects(): ReturnType<typeof vi.fn>[] {
  return Object.entries(RECTS).map(([id, r]) => {
    const spy = vi.fn(() =>
      DOMRect.fromRect({ x: r.left, y: r.top, width: r.width, height: r.height }),
    );
    el(id).getBoundingClientRect = spy;
    return spy;
  });
}

function move(x: number, y: number, pointerType = 'mouse'): void {
  const event = new Event('pointermove', { bubbles: true });
  Object.defineProperties(event, {
    pageX: { value: x },
    pageY: { value: y },
    pointerType: { value: pointerType },
  });
  document.dispatchEvent(event);
}

interface Setter {
  (value: number): void;
  mock: { calls: number[][] };
}

interface GsapStub {
  modules: GsapModules;
  setters: Map<string, Setter>;
  set: ReturnType<typeof vi.fn>;
  revert: ReturnType<typeof vi.fn>;
  quickTo: ReturnType<typeof vi.fn>;
}

function makeGsap(): GsapStub {
  const setters = new Map<string, Setter>();
  const quickTo = vi.fn((target: Element, prop: string) => {
    const setter = vi.fn() as unknown as Setter;
    setters.set(`${target.id}:${prop}`, setter);
    return setter;
  });
  const set = vi.fn();
  const revert = vi.fn();
  const context = vi.fn(() => ({
    add(fn: () => void) {
      fn();
    },
    revert,
  }));
  const gsap = { quickTo, set, context };
  return {
    modules: { gsap, SplitText: {} } as unknown as GsapModules,
    setters,
    set,
    revert,
    quickTo,
  };
}

interface Harness {
  deps: MagneticDeps;
  fine: FakeMediaQueryList;
  forced: FakeMediaQueryList;
  gsap: GsapStub;
  loadGsap: ReturnType<typeof vi.fn>;
  ro: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };
}

function harness(opts: { fine?: boolean; forced?: boolean; reject?: boolean } = {}): Harness {
  const fine = new FakeMediaQueryList(FINE, opts.fine ?? true);
  const forced = new FakeMediaQueryList(FORCED, opts.forced ?? false);
  const gsap = makeGsap();
  const loadGsap = vi.fn(() =>
    opts.reject === true ? Promise.reject(new Error('chunk 404')) : Promise.resolve(gsap.modules),
  );
  const ro = { observe: vi.fn(), disconnect: vi.fn() };
  const deps: MagneticDeps = {
    matchMedia: (q) =>
      q === FINE ? fine : q === FORCED ? forced : new FakeMediaQueryList(q, false),
    loadGsap,
    createResizeObserver: () => ro,
  };
  return { deps, fine, forced, gsap, loadGsap, ro };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

function setMotion(state: string): void {
  document.documentElement.dataset['motion'] = state;
}

function lastCall(stub: GsapStub, key: string): number | undefined {
  return stub.setters.get(key)?.mock.calls.at(-1)?.[0];
}

describe('magneticOffset', () => {
  const rect = { left: 100, top: 100, width: 100, height: 48 };

  it('pulls 0.3 x the distance from the centre', () => {
    expect(magneticOffset({ x: 160, y: 124 }, rect, 8)).toEqual({ x: 3, y: 0 });
    expect(magneticOffset({ x: 150, y: 114 }, rect, 8)).toEqual({ x: 0, y: -3 });
  });

  it('clamps each axis to the cap', () => {
    expect(magneticOffset({ x: 210, y: 144 }, rect, 8)).toEqual({ x: 8, y: 6 });
    expect(magneticOffset({ x: 76, y: 76 }, rect, 6)).toEqual({ x: -6, y: -6 });
  });

  it('is active up to 24px outside the box and null beyond', () => {
    expect(magneticOffset({ x: 224, y: 124 }, rect, 8)).not.toBeNull();
    expect(magneticOffset({ x: 224.5, y: 124 }, rect, 8)).toBeNull();
    expect(magneticOffset({ x: 150, y: 75 }, rect, 8)).toBeNull();
    expect(magneticOffset({ x: 75, y: 124 }, rect, 8)).toBeNull();
    expect(magneticOffset({ x: 150, y: 173 }, rect, 8)).toBeNull();
  });
});

describe('createMagnetic', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
    setMotion('on');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete document.documentElement.dataset['motion'];
    vi.restoreAllMocks();
  });

  it('does nothing without magnetic targets', () => {
    document.body.innerHTML = '<a href="#">plain</a>';
    const h = harness();
    expect(createMagnetic(h.deps)(document)).toBeUndefined();
    expect(h.loadGsap).not.toHaveBeenCalled();
  });

  it.each([
    ['coarse pointer', { fine: false }, 'on'],
    ['forced colours', { forced: true }, 'on'],
    ['reduced motion', {}, 'reduced'],
    ['motion off', {}, 'off'],
  ])('does not mount under %s', async (_label, opts, motion) => {
    setMotion(motion);
    stubRects();
    const h = harness(opts);
    const cleanup = createMagnetic(h.deps)(document);
    await flush();
    expect(h.loadGsap).not.toHaveBeenCalled();
    expect(h.gsap.quickTo).not.toHaveBeenCalled();
    move(160, 124);
    expect(h.gsap.setters.size).toBe(0);
    cleanup?.();
  });

  it('pulls a face inside its zone and releases it outside', async () => {
    stubRects();
    const h = harness();
    const cleanup = createMagnetic(h.deps)(document);
    await flush();
    expect(h.gsap.quickTo).toHaveBeenCalledWith(el('pill-face'), 'x', {
      duration: 0.3,
      ease: 'power2.out',
    });

    move(160, 124);
    expect(lastCall(h.gsap, 'pill-face:x')).toBe(3);
    expect(lastCall(h.gsap, 'pill-face:y')).toBe(0);
    expect(h.gsap.setters.get('link-face:x')?.mock.calls).toHaveLength(0);

    move(600, 600);
    expect(lastCall(h.gsap, 'pill-face:x')).toBe(0);
    expect(lastCall(h.gsap, 'pill-face:y')).toBe(0);

    // The link caps at 6px.
    move(480, 130);
    expect(lastCall(h.gsap, 'link-face:x')).toBe(6);
    expect(lastCall(h.gsap, 'link-face:y')).toBe(6);
    cleanup?.();
  });

  it('ignores touch pointers', async () => {
    stubRects();
    const h = harness();
    const cleanup = createMagnetic(h.deps)(document);
    await flush();
    move(160, 124, 'touch');
    expect(h.gsap.setters.get('pill-face:x')?.mock.calls).toHaveLength(0);
    cleanup?.();
  });

  it('hit-tests cached page rects and never measures during moves', async () => {
    const spies = stubRects();
    const h = harness();
    const cleanup = createMagnetic(h.deps)(document);
    await flush();
    for (const spy of spies) spy.mockClear();
    move(160, 124);
    move(170, 130);
    move(600, 600);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    cleanup?.();
  });

  it('remeasures once an ancestor reveal transform settles', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<p id="wrap" data-reveal="settle">${FIXTURE}</p>`;
    // Measured while the reveal still translates the shells 20px down.
    const shifted = { ...RECTS['pill'], top: 120 } as (typeof RECTS)['pill'];
    el('pill').getBoundingClientRect = () =>
      DOMRect.fromRect({ x: shifted.left, y: shifted.top, width: 100, height: 48 });
    el('link').getBoundingClientRect = () =>
      DOMRect.fromRect({ x: 400, y: 100, width: 60, height: 20 });
    const h = harness();
    const cleanup = createMagnetic(h.deps)(document);
    await flush();

    // The reveal lands: the shell is back at its layout position, centre (150, 124).
    shifted.top = 100;
    el('wrap').dispatchEvent(new Event('transitionend', { bubbles: true }));
    move(150, 124);
    expect(lastCall(h.gsap, 'pill-face:y')).toBe(-6);
    vi.advanceTimersByTime(150);
    move(150, 124);
    expect(lastCall(h.gsap, 'pill-face:x')).toBe(0);
    expect(lastCall(h.gsap, 'pill-face:y')).toBe(0);
    cleanup?.();
    vi.useRealTimers();
  });

  it('ignores transitions on elements that hold no shell', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `${FIXTURE}<div id="other"></div>`;
    const spies = stubRects();
    const h = harness();
    const cleanup = createMagnetic(h.deps)(document);
    await flush();
    for (const spy of spies) spy.mockClear();
    el('other').dispatchEvent(new Event('transitionend', { bubbles: true }));
    vi.advanceTimersByTime(150);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    cleanup?.();
    vi.useRealTimers();
  });

  it('adds the scroll offset to the cached rects', async () => {
    window.scrollTo(0, 0);
    Object.defineProperty(window, 'scrollY', { value: 1000, configurable: true });
    stubRects();
    const h = harness();
    const cleanup = createMagnetic(h.deps)(document);
    await flush();
    move(160, 124);
    expect(h.gsap.setters.get('pill-face:x')?.mock.calls).toHaveLength(0);
    move(160, 1124);
    expect(lastCall(h.gsap, 'pill-face:x')).toBe(3);
    cleanup?.();
    Reflect.deleteProperty(window, 'scrollY');
  });

  it('snaps faces to 0 and detaches on reduced, re-attaches on on', async () => {
    stubRects();
    const h = harness();
    const cleanup = createMagnetic(h.deps)(document);
    await flush();
    move(160, 124);

    setMotion('reduced');
    dispatchMotionChange(document, 'reduced');
    expect(h.gsap.set).toHaveBeenCalledWith([el('pill-face'), el('link-face')], { x: 0, y: 0 });
    expect(h.gsap.revert).toHaveBeenCalledTimes(1);
    const before = h.gsap.setters.get('pill-face:x')?.mock.calls.length;
    move(165, 124);
    expect(h.gsap.setters.get('pill-face:x')?.mock.calls.length).toBe(before);

    setMotion('on');
    dispatchMotionChange(document, 'on');
    await flush();
    move(160, 124);
    expect(lastCall(h.gsap, 'pill-face:x')).toBe(3);
    cleanup?.();
  });

  it('detaches when the fine pointer goes away', async () => {
    stubRects();
    const h = harness();
    const cleanup = createMagnetic(h.deps)(document);
    await flush();
    h.fine.fire(false);
    expect(h.gsap.set).toHaveBeenCalledWith([el('pill-face'), el('link-face')], { x: 0, y: 0 });
    const before = h.gsap.setters.get('pill-face:x')?.mock.calls.length;
    move(160, 124);
    expect(h.gsap.setters.get('pill-face:x')?.mock.calls.length).toBe(before);
    cleanup?.();
  });

  it('survives a failed gsap load', async () => {
    stubRects();
    const h = harness({ reject: true });
    const cleanup = createMagnetic(h.deps)(document);
    await flush();
    expect(() => {
      move(160, 124);
    }).not.toThrow();
    expect(h.gsap.quickTo).not.toHaveBeenCalled();
    cleanup?.();
  });

  it('cleans up listeners, observer and context', async () => {
    stubRects();
    const h = harness();
    const cleanup = createMagnetic(h.deps)(document);
    await flush();
    expect(h.ro.observe).toHaveBeenCalledWith(document.body);
    cleanup?.();
    expect(h.ro.disconnect).toHaveBeenCalled();
    expect(h.gsap.revert).toHaveBeenCalledTimes(1);
    const calls = h.gsap.setters.get('pill-face:x')?.mock.calls.length;
    move(160, 124);
    expect(h.gsap.setters.get('pill-face:x')?.mock.calls.length).toBe(calls);
    h.fine.fire(false);
    h.fine.fire(true);
    await flush();
    expect(h.loadGsap).toHaveBeenCalledTimes(1);
  });

  it('keeps one cleanup across 10 lifecycle cycles', async () => {
    stubRects();
    const h = harness();
    const lifecycle = createLifecycle(document);
    lifecycle.register(createMagnetic(h.deps));
    for (let i = 0; i < 10; i += 1) {
      lifecycle.mount();
      await flush();
      expect(lifecycle.activeCleanups).toBe(1);
      lifecycle.unmount();
    }
    expect(lifecycle.activeCleanups).toBe(0);
    expect(h.gsap.revert).toHaveBeenCalledTimes(10);
  });
});
