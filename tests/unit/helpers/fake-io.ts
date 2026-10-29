/**
 * Typed stand-in for IntersectionObserver. happy-dom's observer never calls back, so tests drive
 * the callback themselves with `trigger()`. Every instance is kept in `instances` (reset per test).
 */
export class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  readonly callback: IntersectionObserverCallback;
  readonly init: IntersectionObserverInit;
  readonly observed = new Set<Element>();
  readonly unobserved: Element[] = [];
  disconnected = false;

  constructor(callback: IntersectionObserverCallback, init: IntersectionObserverInit = {}) {
    this.callback = callback;
    this.init = init;
    FakeIntersectionObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observed.add(target);
  }

  unobserve(target: Element): void {
    this.observed.delete(target);
    this.unobserved.push(target);
  }

  disconnect(): void {
    this.observed.clear();
    this.disconnected = true;
  }

  /** Fires the callback with minimal entries; `intersecting` defaults to true. */
  trigger(targets: readonly Element[], intersecting = true): void {
    const entries = targets.map(
      (target) =>
        ({ target, isIntersecting: intersecting }) as unknown as IntersectionObserverEntry,
    );
    this.callback(entries, this as unknown as IntersectionObserver);
  }

  static reset(): void {
    FakeIntersectionObserver.instances = [];
  }

  static last(): FakeIntersectionObserver {
    const io = FakeIntersectionObserver.instances.at(-1);
    if (!io) throw new Error('no FakeIntersectionObserver was created');
    return io;
  }
}
