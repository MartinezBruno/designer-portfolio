// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchMotionChange } from '../../src/lib/motion/events';
import { createLifecycle } from '../../src/lib/motion/lifecycle';
import type { LenisCtor } from '../../src/lib/motion/load-lenis';
import { createSmoothScroll, type SmoothScrollDeps } from '../../src/lib/motion/smooth-scroll';
import { FakeMediaQueryList } from './helpers/fake-media';

const FINE = '(hover: hover) and (pointer: fine)';
const FORCED = '(forced-colors: active)';

const OPTIONS = {
  lerp: 0.12,
  smoothWheel: true,
  syncTouch: false,
  wheelMultiplier: 1,
  anchors: false,
  stopInertiaOnNavigate: true,
  autoRaf: true,
};

interface FakeInstance {
  destroy: ReturnType<typeof vi.fn>;
}

interface LenisStub {
  Ctor: LenisCtor;
  construct: ReturnType<typeof vi.fn>;
  instances: FakeInstance[];
}

/** A constructible stand-in for Lenis whose instances only expose a spied destroy(). */
function makeLenis(): LenisStub {
  const instances: FakeInstance[] = [];
  const construct = vi.fn();
  class FakeLenis {
    destroy = vi.fn();
    constructor(options: unknown) {
      construct(options);
      instances.push(this);
    }
  }
  return { Ctor: FakeLenis as unknown as LenisCtor, construct, instances };
}

interface Harness {
  deps: SmoothScrollDeps;
  fine: FakeMediaQueryList;
  forced: FakeMediaQueryList;
  lenis: LenisStub;
  loadLenis: ReturnType<typeof vi.fn>;
}

function harness(opts: { fine?: boolean; forced?: boolean; reject?: boolean } = {}): Harness {
  const fine = new FakeMediaQueryList(FINE, opts.fine ?? true);
  const forced = new FakeMediaQueryList(FORCED, opts.forced ?? false);
  const lenis = makeLenis();
  const loadLenis = vi.fn(() =>
    opts.reject === true ? Promise.reject(new Error('chunk 404')) : Promise.resolve(lenis.Ctor),
  );
  const deps: SmoothScrollDeps = {
    matchMedia: (q) =>
      q === FINE ? fine : q === FORCED ? forced : new FakeMediaQueryList(q, false),
    loadLenis,
  };
  return { deps, fine, forced, lenis, loadLenis };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

function setMotion(state: string): void {
  document.documentElement.dataset['motion'] = state;
}

function mount(h: Harness): ReturnType<typeof createLifecycle> {
  const lifecycle = createLifecycle(document);
  lifecycle.register(createSmoothScroll(h.deps));
  lifecycle.mount();
  return lifecycle;
}

describe('createSmoothScroll', () => {
  beforeEach(() => {
    setMotion('on');
  });

  afterEach(() => {
    delete document.documentElement.dataset['motion'];
    vi.restoreAllMocks();
  });

  it('creates exactly one Lenis with the UI-SPEC options for a fine pointer under on', async () => {
    const h = harness();
    mount(h);
    await flush();

    expect(h.loadLenis).toHaveBeenCalledTimes(1);
    expect(h.lenis.construct).toHaveBeenCalledTimes(1);
    expect(h.lenis.construct).toHaveBeenCalledWith(OPTIONS);
  });

  it.each([
    ['a coarse pointer', { fine: false }, 'on'],
    ['forced colours', { forced: true }, 'on'],
    ['reduced', {}, 'reduced'],
    ['off', {}, 'off'],
  ] as const)('never loads or creates Lenis for %s', async (_name, opts, state) => {
    setMotion(state);
    const h = harness(opts);
    mount(h);
    await flush();

    expect(h.loadLenis).not.toHaveBeenCalled();
    expect(h.lenis.construct).not.toHaveBeenCalled();
  });

  it('destroys the instance on unmount (astro:before-swap)', async () => {
    const h = harness();
    const lifecycle = mount(h);
    await flush();

    lifecycle.unmount();
    expect(h.lenis.instances[0]?.destroy).toHaveBeenCalledTimes(1);
    expect(lifecycle.activeCleanups).toBe(0);
  });

  it('destroys on motion:change to reduced and re-creates on the change back to on', async () => {
    const h = harness();
    mount(h);
    await flush();

    setMotion('reduced');
    dispatchMotionChange(document, 'reduced');
    expect(h.lenis.instances[0]?.destroy).toHaveBeenCalledTimes(1);

    setMotion('on');
    dispatchMotionChange(document, 'on');
    await flush();
    expect(h.lenis.instances).toHaveLength(2);
    expect(h.lenis.instances[1]?.destroy).not.toHaveBeenCalled();
  });

  it('destroys when forced colours turn on and re-creates when they turn off', async () => {
    const h = harness();
    mount(h);
    await flush();

    h.forced.fire(true);
    expect(h.lenis.instances[0]?.destroy).toHaveBeenCalledTimes(1);

    h.forced.fire(false);
    await flush();
    expect(h.lenis.instances).toHaveLength(2);
  });

  it('starts when a fine pointer appears and stops when it goes', async () => {
    const h = harness({ fine: false });
    mount(h);
    await flush();
    expect(h.lenis.construct).not.toHaveBeenCalled();

    h.fine.fire(true);
    await flush();
    expect(h.lenis.instances).toHaveLength(1);

    h.fine.fire(false);
    expect(h.lenis.instances[0]?.destroy).toHaveBeenCalledTimes(1);
  });

  it('never creates an instance when unmounted before the loader resolves', async () => {
    const h = harness();
    const lifecycle = mount(h);
    lifecycle.unmount();
    await flush();

    expect(h.loadLenis).toHaveBeenCalledTimes(1);
    expect(h.lenis.construct).not.toHaveBeenCalled();
  });

  it('stops listening after unmount', async () => {
    const h = harness();
    const lifecycle = mount(h);
    await flush();
    lifecycle.unmount();

    dispatchMotionChange(document, 'on');
    h.forced.fire(false);
    await flush();
    expect(h.lenis.instances).toHaveLength(1);
  });

  it('swallows a failed chunk load: no instance, no throw', async () => {
    const h = harness({ reject: true });
    const lifecycle = mount(h);
    await flush();

    expect(h.lenis.construct).not.toHaveBeenCalled();
    expect(() => {
      lifecycle.unmount();
    }).not.toThrow();
  });
});
