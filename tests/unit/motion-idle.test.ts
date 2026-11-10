import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { afterLoadIdle } from '../../src/lib/motion/idle.ts';
import { createGsapLoader, type GsapModules } from '../../src/lib/motion/load-gsap.ts';

interface FakeWin {
  win: Window;
  fireLoad: () => void;
  flushFrame: () => void;
  idle: ReturnType<typeof vi.fn>;
  flushIdle: () => void;
}

/**
 * A minimal Window: 'load' listeners and animation frames run only when the test fires them,
 * setTimeout is the (faked) global one, and requestIdleCallback is an optional stub.
 */
function fakeWin(readyState: DocumentReadyState, withIdle = true): FakeWin {
  const loadListeners: (() => void)[] = [];
  const frames: (() => void)[] = [];
  const idleCallbacks: (() => void)[] = [];
  const idle = vi.fn((cb: () => void) => {
    idleCallbacks.push(cb);
    return idleCallbacks.length;
  });
  const win: Record<string, unknown> = {
    document: { readyState },
    addEventListener: (type: string, cb: () => void) => {
      if (type === 'load') loadListeners.push(cb);
    },
    requestAnimationFrame: (cb: () => void) => {
      frames.push(cb);
      return frames.length;
    },
    setTimeout: (cb: () => void, ms?: number) => setTimeout(cb, ms),
  };
  if (withIdle) win['requestIdleCallback'] = idle;
  return {
    win: win as unknown as Window,
    fireLoad: () => {
      for (const cb of loadListeners.splice(0)) cb();
    },
    flushFrame: () => {
      for (const cb of frames.splice(0)) cb();
    },
    idle,
    flushIdle: () => {
      for (const cb of idleCallbacks.splice(0)) cb();
    },
  };
}

/** Runs every step of the gate in order: load, a painted frame, the post-frame task, idle. */
async function settle(fake: FakeWin): Promise<void> {
  fake.fireLoad();
  fake.flushFrame();
  await vi.runAllTimersAsync();
  fake.flushIdle();
  await vi.runAllTimersAsync();
}

describe('afterLoadIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for the load event when the document is still loading', async () => {
    const fake = fakeWin('interactive');
    const done = vi.fn();
    void afterLoadIdle(fake.win).then(done);

    fake.flushFrame();
    await vi.runAllTimersAsync();
    fake.flushIdle();
    await vi.runAllTimersAsync();
    expect(done).not.toHaveBeenCalled();

    await settle(fake);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('waits one painted frame after load before asking for idle time', async () => {
    const fake = fakeWin('interactive');
    void afterLoadIdle(fake.win);

    fake.fireLoad();
    await vi.runAllTimersAsync();
    expect(fake.idle).not.toHaveBeenCalled();

    fake.flushFrame();
    await vi.runAllTimersAsync();
    expect(fake.idle).toHaveBeenCalledTimes(1);
  });

  it('skips the load wait when the document is already complete (soft navigation)', async () => {
    const fake = fakeWin('complete');
    const done = vi.fn();
    void afterLoadIdle(fake.win).then(done);

    fake.flushFrame();
    await vi.runAllTimersAsync();
    fake.flushIdle();
    await vi.runAllTimersAsync();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('passes the timeout to requestIdleCallback (1000 ms by default)', async () => {
    const fake = fakeWin('complete');
    void afterLoadIdle(fake.win);
    fake.flushFrame();
    await vi.runAllTimersAsync();
    expect(fake.idle).toHaveBeenCalledWith(expect.any(Function), { timeout: 1000 });

    const other = fakeWin('complete');
    void afterLoadIdle(other.win, 250);
    other.flushFrame();
    await vi.runAllTimersAsync();
    expect(other.idle).toHaveBeenCalledWith(expect.any(Function), { timeout: 250 });
  });

  it('falls back to setTimeout 0 without requestIdleCallback', async () => {
    const fake = fakeWin('complete', false);
    const done = vi.fn();
    void afterLoadIdle(fake.win).then(done);

    fake.flushFrame();
    await vi.runAllTimersAsync();
    expect(fake.idle).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledTimes(1);
  });
});

describe('createGsapLoader behind afterLoadIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call the importer before the gate opens, then imports exactly once', async () => {
    const fake = fakeWin('interactive');
    const modules = { gsap: { registerPlugin: vi.fn() }, SplitText: {} } as unknown as GsapModules;
    const importer = vi.fn(() => Promise.resolve(modules));
    const load = createGsapLoader(() => afterLoadIdle(fake.win).then(importer));

    const first = load();
    const second = load();
    await vi.runAllTimersAsync();
    expect(importer).not.toHaveBeenCalled();

    await settle(fake);
    await expect(first).resolves.toBe(modules);
    expect(second).toBe(first);
    expect(importer).toHaveBeenCalledTimes(1);
  });
});
