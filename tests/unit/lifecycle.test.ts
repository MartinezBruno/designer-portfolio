// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { bindToAstro, createLifecycle } from '../../src/lib/motion/lifecycle';

function trackedInit() {
  const cleanup = vi.fn();
  const init = vi.fn(() => cleanup);
  return { init, cleanup };
}

describe('createLifecycle', () => {
  it('mounts each init once and ignores a second mount', () => {
    const lifecycle = createLifecycle(document);
    const a = trackedInit();
    const b = trackedInit();
    lifecycle.register(a.init);
    lifecycle.register(b.init);

    lifecycle.mount();
    lifecycle.mount();

    expect(a.init).toHaveBeenCalledTimes(1);
    expect(a.init).toHaveBeenCalledWith(document);
    expect(b.init).toHaveBeenCalledTimes(1);
    expect(lifecycle.activeCleanups).toBe(2);
  });

  it('runs each cleanup exactly once and ignores a second unmount', () => {
    const lifecycle = createLifecycle(document);
    const a = trackedInit();
    lifecycle.register(a.init);
    lifecycle.mount();

    lifecycle.unmount();
    lifecycle.unmount();

    expect(a.cleanup).toHaveBeenCalledTimes(1);
    expect(lifecycle.activeCleanups).toBe(0);
  });

  it('keeps activeCleanups constant across 10 unmount/mount cycles', () => {
    const lifecycle = createLifecycle(document);
    const a = trackedInit();
    const b = trackedInit();
    lifecycle.register(a.init);
    lifecycle.register(b.init);
    lifecycle.register(() => undefined);
    lifecycle.mount();

    for (let i = 0; i < 10; i += 1) {
      lifecycle.unmount();
      lifecycle.mount();
      expect(lifecycle.activeCleanups).toBe(2);
    }
    expect(a.init).toHaveBeenCalledTimes(11);
    expect(a.cleanup).toHaveBeenCalledTimes(10);
  });

  it('isolates a throwing init and reports it through onError', () => {
    const onError = vi.fn();
    const lifecycle = createLifecycle(document, onError);
    const good = trackedInit();
    lifecycle.register(() => {
      throw new Error('boom');
    });
    lifecycle.register(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- verifies non-Error throws are wrapped
      throw 'plain string';
    });
    lifecycle.register(good.init);

    lifecycle.mount();

    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[1]?.[0]).toEqual(new Error('plain string'));
    expect(good.init).toHaveBeenCalledTimes(1);
    expect(lifecycle.activeCleanups).toBe(1);
  });

  it('adds no cleanup for an init returning undefined', () => {
    const lifecycle = createLifecycle(document);
    const init = vi.fn(() => undefined);
    lifecycle.register(init);
    lifecycle.mount();
    expect(init).toHaveBeenCalledTimes(1);
    expect(lifecycle.activeCleanups).toBe(0);
  });

  it('runs an init registered after mount immediately', () => {
    const lifecycle = createLifecycle(document);
    lifecycle.mount();
    const late = trackedInit();
    lifecycle.register(late.init);
    expect(late.init).toHaveBeenCalledTimes(1);
    expect(lifecycle.activeCleanups).toBe(1);
  });
});

describe('bindToAstro', () => {
  it('mounts immediately and follows astro navigation events until unbound', () => {
    const lifecycle = createLifecycle(document);
    const a = trackedInit();
    lifecycle.register(a.init);

    const unbind = bindToAstro(lifecycle, document);
    expect(a.init).toHaveBeenCalledTimes(1);

    // With ClientRouter, page-load also fires on the initial load: must not double-run.
    document.dispatchEvent(new Event('astro:page-load'));
    expect(a.init).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event('astro:before-swap'));
    expect(a.cleanup).toHaveBeenCalledTimes(1);
    expect(lifecycle.activeCleanups).toBe(0);

    document.dispatchEvent(new Event('astro:page-load'));
    expect(a.init).toHaveBeenCalledTimes(2);

    unbind();
    document.dispatchEvent(new Event('astro:before-swap'));
    document.dispatchEvent(new Event('astro:page-load'));
    expect(a.cleanup).toHaveBeenCalledTimes(1);
    expect(a.init).toHaveBeenCalledTimes(2);
  });
});
