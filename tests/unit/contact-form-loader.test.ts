// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableJavaScriptFileLoading":true,"disableJavaScriptEvaluation":true}}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cleanup, PageInit } from '../../src/lib/motion/lifecycle';
import { createLazyContactForm } from '../../src/lib/ui/contact-form-loader';

// Minimal IntersectionObserver fake: records the options and lets the test fire entries.
class FakeObserver {
  static instances: FakeObserver[] = [];
  readonly targets: Element[] = [];
  disconnected = false;
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    FakeObserver.instances.push(this);
  }
  observe(el: Element): void {
    this.targets.push(el);
  }
  unobserve(): void {}
  disconnect(): void {
    this.disconnected = true;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  fire(isIntersecting: boolean): void {
    const entries = this.targets.map(
      (target) => ({ isIntersecting, target }) as unknown as IntersectionObserverEntry,
    );
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

const FIXTURE = `<section id="contact" tabindex="-1">
  <div data-contact-nojs><a href="mailto:x@y.z">Email me</a></div>
  <form data-contact-form hidden><input id="contact-name" name="name"></form>
</section>`;

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
} {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('createLazyContactForm', () => {
  beforeEach(() => {
    FakeObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    document.body.innerHTML = FIXTURE;
    history.replaceState(null, '', '/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('returns undefined and never loads when the form is absent', () => {
    document.body.innerHTML = '<main></main>';
    const load = vi.fn<() => Promise<PageInit>>();
    expect(createLazyContactForm(load)(document)).toBeUndefined();
    expect(load).not.toHaveBeenCalled();
  });

  it('waits for the section to near the viewport, then loads once', async () => {
    const inner = vi.fn<PageInit>(() => undefined);
    const load = vi.fn(() => Promise.resolve(inner));
    createLazyContactForm(load)(document);
    expect(load).not.toHaveBeenCalled();
    const io = FakeObserver.instances[0];
    expect(io?.options?.rootMargin).toBe('0px 0px 100% 0px');
    expect(io?.targets[0]).toBe(document.getElementById('contact'));
    io?.fire(false);
    expect(load).not.toHaveBeenCalled();
    io?.fire(true);
    io?.fire(true);
    document
      .getElementById('contact-name')
      ?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('loads on the first focusin or pointerdown inside the section', async () => {
    const load = vi.fn(() => Promise.resolve<PageInit>(() => undefined));
    createLazyContactForm(load)(document);
    const input = document.getElementById('contact-name');
    input?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    input?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await flush();
    expect(load).toHaveBeenCalledTimes(1);

    document.body.innerHTML = FIXTURE;
    const load2 = vi.fn(() => Promise.resolve<PageInit>(() => undefined));
    createLazyContactForm(load2)(document);
    document
      .getElementById('contact')
      ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(load2).toHaveBeenCalledTimes(1);
  });

  it('loads at once for #contact or a service param', () => {
    history.replaceState(null, '', '/#contact');
    const load = vi.fn(() => Promise.resolve<PageInit>(() => undefined));
    createLazyContactForm(load)(document);
    expect(load).toHaveBeenCalledTimes(1);

    history.replaceState(null, '', '/?service=branding');
    const load2 = vi.fn(() => Promise.resolve<PageInit>(() => undefined));
    createLazyContactForm(load2)(document);
    expect(load2).toHaveBeenCalledTimes(1);
  });

  it('loads at once when IntersectionObserver is missing', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const load = vi.fn(() => Promise.resolve<PageInit>(() => undefined));
    createLazyContactForm(load)(document);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('mounts the resolved init with the document and the outer cleanup calls its cleanup', async () => {
    history.replaceState(null, '', '/#contact');
    const innerCleanup = vi.fn<Cleanup>();
    const inner = vi.fn<PageInit>(() => innerCleanup);
    const cleanup = createLazyContactForm(() => Promise.resolve(inner))(document);
    await flush();
    expect(inner).toHaveBeenCalledTimes(1);
    expect(inner).toHaveBeenCalledWith(document);
    cleanup?.();
    expect(innerCleanup).toHaveBeenCalledTimes(1);
    cleanup?.();
    expect(innerCleanup).toHaveBeenCalledTimes(1);
  });

  it('cleanup before the load resolves disconnects, unlistens and never mounts', async () => {
    const d = deferred<PageInit>();
    const inner = vi.fn<PageInit>(() => undefined);
    const load = vi.fn(() => d.promise);
    const cleanup = createLazyContactForm(load)(document);
    const io = FakeObserver.instances[0];
    io?.fire(true);
    expect(load).toHaveBeenCalledTimes(1);
    cleanup?.();
    expect(io?.disconnected).toBe(true);
    d.resolve(inner);
    await flush();
    expect(inner).not.toHaveBeenCalled();

    // Listeners are gone too: a fresh untriggered mount torn down ignores later events.
    document.body.innerHTML = FIXTURE;
    const load2 = vi.fn(() => Promise.resolve<PageInit>(() => undefined));
    const cleanup2 = createLazyContactForm(load2)(document);
    cleanup2?.();
    expect(FakeObserver.instances[1]?.disconnected).toBe(true);
    document
      .getElementById('contact-name')
      ?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    document
      .getElementById('contact')
      ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(load2).not.toHaveBeenCalled();
  });

  it('logs a failed load, hides nothing, and retries once on a later trigger', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const inner = vi.fn<PageInit>(() => undefined);
    const load = vi
      .fn<() => Promise<PageInit>>()
      .mockRejectedValueOnce(new Error('chunk 404'))
      .mockResolvedValue(inner);
    createLazyContactForm(load)(document);
    const nojs = document.querySelector<HTMLElement>('[data-contact-nojs]');
    const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
    FakeObserver.instances[0]?.fire(true);
    await flush();
    expect(error).toHaveBeenCalledTimes(1);
    expect(nojs?.hidden).toBe(false);
    expect(form?.hidden).toBe(true);
    document
      .getElementById('contact-name')
      ?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await flush();
    expect(load).toHaveBeenCalledTimes(2);
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('does not retry more than once after failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const load = vi.fn<() => Promise<PageInit>>(() => Promise.reject(new Error('down')));
    createLazyContactForm(load)(document);
    const input = document.getElementById('contact-name');
    for (let i = 0; i < 4; i += 1) {
      input?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush();
    }
    expect(load).toHaveBeenCalledTimes(2);
  });
});
