// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCursor, type CursorDeps } from '../../src/lib/motion/cursor';
import { dispatchMotionChange } from '../../src/lib/motion/events';
import { createLifecycle } from '../../src/lib/motion/lifecycle';
import type { GsapModules } from '../../src/lib/motion/load-gsap';
import { FakeMediaQueryList } from './helpers/fake-media';

const FINE = '(hover: hover) and (pointer: fine)';
const FORCED = '(forced-colors: active)';

// Mirrors CursorFollower.astro: the layer lives in a build-time <template>.
const TEMPLATE = `
  <template data-cursor-template>
    <div data-cursor-layer aria-hidden="true" data-hidden>
      <span data-cursor-pos>
        <span data-cursor-dot></span>
        <span data-cursor-pill>View</span>
      </span>
    </div>
  </template>
`;

const PAGE = `
  ${TEMPLATE}
  <div data-cursor-host data-astro-transition-persist="cursor"></div>
  <article id="card" data-cursor="view"><a id="card-link" href="/p/"><img id="card-img" alt="" /></a></article>
  <a id="cta" href="#contact"><span id="cta-face">Contact</span></a>
  <button id="btn" type="button">Go</button>
  <p id="text">Plain copy</p>
  <textarea id="field"></textarea>
  <a id="pill" href="#contact" data-magnetic="pill"><span id="pill-face" data-magnetic-face>Let's talk</span></a>
`;

interface Setter {
  (value: number, start?: number): void;
  mock: { calls: number[][] };
}

interface GsapStub {
  modules: GsapModules;
  setters: Map<string, Setter>;
  quickTo: ReturnType<typeof vi.fn>;
  revert: ReturnType<typeof vi.fn>;
}

function makeGsap(): GsapStub {
  const setters = new Map<string, Setter>();
  const quickTo = vi.fn((_target: Element, prop: string) => {
    const setter = vi.fn() as unknown as Setter;
    setters.set(prop, setter);
    return setter;
  });
  const revert = vi.fn();
  const context = vi.fn(() => ({
    add(fn: () => void) {
      fn();
    },
    revert,
  }));
  return {
    modules: { gsap: { quickTo, context }, SplitText: {} } as unknown as GsapModules,
    setters,
    quickTo,
    revert,
  };
}

interface Harness {
  deps: CursorDeps;
  fine: FakeMediaQueryList;
  forced: FakeMediaQueryList;
  gsap: GsapStub;
  loadGsap: ReturnType<typeof vi.fn>;
}

function harness(opts: { fine?: boolean; forced?: boolean; reject?: boolean } = {}): Harness {
  const fine = new FakeMediaQueryList(FINE, opts.fine ?? true);
  const forced = new FakeMediaQueryList(FORCED, opts.forced ?? false);
  const gsap = makeGsap();
  const loadGsap = vi.fn(() =>
    opts.reject === true ? Promise.reject(new Error('chunk 404')) : Promise.resolve(gsap.modules),
  );
  const deps: CursorDeps = {
    matchMedia: (q) =>
      q === FINE ? fine : q === FORCED ? forced : new FakeMediaQueryList(q, false),
    loadGsap,
  };
  return { deps, fine, forced, gsap, loadGsap };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

function setMotion(state: string): void {
  document.documentElement.dataset['motion'] = state;
}

function el(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`fixture #${id} missing`);
  return found;
}

function layers(): HTMLElement[] {
  // The layer lives in the persisted host, never directly in the swapped body (07 D-05).
  expect(document.body.querySelectorAll(':scope > [data-cursor-layer]')).toHaveLength(0);
  return [...document.querySelectorAll<HTMLElement>('[data-cursor-host] > [data-cursor-layer]')];
}

function layer(): HTMLElement {
  const [only] = layers();
  if (!only) throw new Error('no cursor layer');
  return only;
}

function move(x: number, y: number, pointerType = 'mouse'): void {
  const event = new Event('pointermove', { bubbles: true });
  Object.defineProperties(event, {
    clientX: { value: x },
    clientY: { value: y },
    pointerType: { value: pointerType },
  });
  document.dispatchEvent(event);
}

function over(target: Element): void {
  target.dispatchEvent(new Event('pointerover', { bubbles: true }));
}

function out(target: Element, related: Element | null): void {
  const event = new Event('pointerout', { bubbles: true });
  Object.defineProperty(event, 'relatedTarget', { value: related });
  target.dispatchEvent(event);
}

/** Fires the router's before-swap with an arriving document whose template pill reads `label`. */
function beforeSwap(label: string): void {
  const newDocument = document.implementation.createHTMLDocument('next');
  newDocument.body.innerHTML = TEMPLATE;
  const pill = newDocument
    .querySelector<HTMLTemplateElement>('template[data-cursor-template]')
    ?.content.querySelector('[data-cursor-pill]');
  if (!pill) throw new Error('fixture pill missing');
  pill.textContent = label;
  const event = new Event('astro:before-swap');
  Object.defineProperty(event, 'newDocument', { value: newDocument });
  document.dispatchEvent(event);
}

describe('createCursor', () => {
  beforeEach(() => {
    document.body.innerHTML = PAGE;
    setMotion('on');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete document.documentElement.dataset['motion'];
    vi.restoreAllMocks();
  });

  it('does nothing without the template', () => {
    document.body.innerHTML = '<a href="#">plain</a>';
    const h = harness();
    expect(createCursor(h.deps)(document)).toBeUndefined();
    expect(h.loadGsap).not.toHaveBeenCalled();
  });

  it('does nothing without the persisted host', () => {
    document.body.innerHTML = TEMPLATE;
    const h = harness();
    expect(createCursor(h.deps)(document)).toBeUndefined();
    expect(h.loadGsap).not.toHaveBeenCalled();
  });

  it.each([
    ['coarse pointer', { fine: false }, 'on'],
    ['forced colours', { forced: true }, 'on'],
    ['reduced motion', {}, 'reduced'],
    ['motion off', {}, 'off'],
  ])('does not mount under %s', async (_label, opts, motion) => {
    setMotion(motion);
    const h = harness(opts);
    const cleanup = createCursor(h.deps)(document);
    await flush();
    move(10, 10);
    expect(h.loadGsap).not.toHaveBeenCalled();
    expect(layers()).toHaveLength(0);
    cleanup?.();
  });

  it('mounts one hidden, aria-hidden layer cloned from the template', async () => {
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    await flush();
    expect(layers()).toHaveLength(1);
    const l = layer();
    expect(l.getAttribute('aria-hidden')).toBe('true');
    expect(l.hasAttribute('data-hidden')).toBe(true);
    expect(l.querySelector('[data-cursor-pill]')?.textContent).toBe('View');
    // The template itself is untouched (cloned, not moved).
    const tpl = document.querySelector<HTMLTemplateElement>('template[data-cursor-template]');
    expect(tpl?.content.querySelector('[data-cursor-layer]')).not.toBeNull();
    expect(h.gsap.quickTo).toHaveBeenCalledWith(l.querySelector('[data-cursor-pos]'), 'x', {
      duration: 0.25,
      ease: 'power2.out',
    });
    expect(h.gsap.quickTo).toHaveBeenCalledWith(l.querySelector('[data-cursor-pos]'), 'y', {
      duration: 0.25,
      ease: 'power2.out',
    });
    cleanup?.();
  });

  it('shows on the first move and follows clientX/clientY without layout reads', async () => {
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    await flush();
    rect.mockClear();
    move(120, 340);
    expect(layer().hasAttribute('data-hidden')).toBe(false);
    expect(h.gsap.setters.get('x')?.mock.calls.at(-1)?.[0]).toBe(120);
    expect(h.gsap.setters.get('y')?.mock.calls.at(-1)?.[0]).toBe(340);
    move(130, 350);
    expect(h.gsap.setters.get('x')?.mock.calls.at(-1)?.[0]).toBe(130);
    expect(rect).not.toHaveBeenCalled();
    cleanup?.();
  });

  it('jumps to the first position instead of sliding in from the corner', async () => {
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    await flush();
    move(120, 340);
    expect(h.gsap.setters.get('x')?.mock.calls[0]).toEqual([120, 120]);
    expect(h.gsap.setters.get('y')?.mock.calls[0]).toEqual([340, 340]);
    move(130, 350);
    expect(h.gsap.setters.get('x')?.mock.calls[1]).toEqual([130]);
    cleanup?.();
  });

  it('ignores touch moves', async () => {
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    await flush();
    move(120, 340, 'touch');
    expect(layer().hasAttribute('data-hidden')).toBe(true);
    expect(h.gsap.setters.get('x')?.mock.calls).toHaveLength(0);
    cleanup?.();
  });

  it('switches state over project imagery, links, buttons and fields', async () => {
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    await flush();
    move(10, 10);
    const l = layer();

    over(el('card-img'));
    expect(l.dataset['state']).toBe('view');
    over(el('cta-face'));
    expect(l.dataset['state']).toBe('link');
    over(el('btn'));
    expect(l.dataset['state']).toBe('link');
    over(el('text'));
    expect(l.dataset['state']).toBeUndefined();

    over(el('field'));
    expect(l.hasAttribute('data-hidden')).toBe(true);
    move(12, 12);
    expect(l.hasAttribute('data-hidden')).toBe(true);
    over(el('text'));
    expect(l.hasAttribute('data-hidden')).toBe(false);

    // Added only here: happy-dom logs a warning for every iframe it parses.
    const frame = document.createElement('iframe');
    frame.title = 'embed';
    document.body.append(frame);
    over(frame);
    expect(l.hasAttribute('data-hidden')).toBe(true);

    over(el('card-img'));
    expect(l.dataset['state']).toBe('view');
    out(el('card-img'), document.body);
    expect(l.dataset['state']).toBeUndefined();
    expect(l.hasAttribute('data-hidden')).toBe(false);
    cleanup?.();
  });

  // 06-10 review decision 3: an accent dot over the accent pill tinted its label.
  it('hides over an accent pill button and comes back once the pointer leaves it', async () => {
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    await flush();
    move(10, 10);
    const l = layer();
    expect(l.hasAttribute('data-hidden')).toBe(false);

    over(el('pill-face'));
    expect(l.hasAttribute('data-hidden')).toBe(true);
    move(12, 12);
    expect(l.hasAttribute('data-hidden')).toBe(true);

    out(el('pill-face'), el('text'));
    expect(l.hasAttribute('data-hidden')).toBe(false);
    expect(l.dataset['state']).toBeUndefined();

    over(el('pill'));
    expect(l.hasAttribute('data-hidden')).toBe(true);
    out(el('pill'), el('btn'));
    expect(l.hasAttribute('data-hidden')).toBe(false);
    expect(l.dataset['state']).toBe('link');
    cleanup?.();
  });

  it('hides when the pointer leaves the window or the window blurs', async () => {
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    await flush();
    move(10, 10);
    document.documentElement.dispatchEvent(new Event('pointerleave'));
    expect(layer().hasAttribute('data-hidden')).toBe(true);
    move(10, 10);
    expect(layer().hasAttribute('data-hidden')).toBe(false);
    window.dispatchEvent(new Event('blur'));
    expect(layer().hasAttribute('data-hidden')).toBe(true);
    cleanup?.();
  });

  it('removes the layer on reduced and mounts it again on on', async () => {
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    await flush();
    move(10, 10);

    setMotion('reduced');
    dispatchMotionChange(document, 'reduced');
    expect(layers()).toHaveLength(0);
    expect(h.gsap.revert).toHaveBeenCalledTimes(1);
    const calls = h.gsap.setters.get('x')?.mock.calls.length;
    move(20, 20);
    expect(h.gsap.setters.get('x')?.mock.calls.length).toBe(calls);

    setMotion('on');
    dispatchMotionChange(document, 'on');
    await flush();
    expect(layers()).toHaveLength(1);
    expect(layer().hasAttribute('data-hidden')).toBe(true);
    move(30, 30);
    expect(layer().hasAttribute('data-hidden')).toBe(false);
    cleanup?.();
  });

  it('removes the layer when the fine pointer or colours change', async () => {
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    await flush();
    h.fine.fire(false);
    expect(layers()).toHaveLength(0);
    h.fine.fire(true);
    await flush();
    expect(layers()).toHaveLength(1);
    h.forced.fire(true);
    expect(layers()).toHaveLength(0);
    cleanup?.();
  });

  it('does not leave a layer behind when torn down before gsap arrives', async () => {
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    cleanup?.();
    await flush();
    expect(layers()).toHaveLength(0);
  });

  it('survives a failed gsap load without a layer', async () => {
    const h = harness({ reject: true });
    const cleanup = createCursor(h.deps)(document);
    await flush();
    expect(layers()).toHaveLength(0);
    expect(() => {
      move(10, 10);
    }).not.toThrow();
    cleanup?.();
  });

  it('cleans up the layer, listeners and context', async () => {
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    await flush();
    cleanup?.();
    expect(layers()).toHaveLength(0);
    expect(h.gsap.revert).toHaveBeenCalledTimes(1);
    h.fine.fire(false);
    h.fine.fire(true);
    setMotion('on');
    dispatchMotionChange(document, 'on');
    await flush();
    expect(h.loadGsap).toHaveBeenCalledTimes(1);
    expect(layers()).toHaveLength(0);
  });

  it('keeps one cleanup and no layers across 10 lifecycle cycles', async () => {
    const h = harness();
    const lifecycle = createLifecycle(document);
    lifecycle.register(createCursor(h.deps));
    for (let i = 0; i < 10; i += 1) {
      lifecycle.mount();
      await flush();
      expect(lifecycle.activeCleanups).toBe(1);
      expect(layers()).toHaveLength(1);
      lifecycle.unmount();
      expect(layers()).toHaveLength(0);
    }
    expect(lifecycle.activeCleanups).toBe(0);
    expect(h.gsap.revert).toHaveBeenCalledTimes(10);
  });

  // 07 D-05 / Research Security: the persisted pill must speak the arriving page's language.
  it('resyncs the pill label from the arriving document on astro:before-swap', async () => {
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    await flush();
    const pill = layer().querySelector('[data-cursor-pill]');
    beforeSwap('Ver');
    expect(pill?.textContent).toBe('Ver');
    expect(layer().querySelector('[data-cursor-pill]')).toBe(pill);
    // textContent only (T-07-08): markup in the label stays inert text.
    beforeSwap('<img src=x onerror=alert(1)>');
    expect(pill?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(pill?.querySelector('img')).toBeNull();
    cleanup?.();
  });

  it('mounts a later session with the arriving page label', async () => {
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    await flush();
    setMotion('reduced');
    dispatchMotionChange(document, 'reduced');
    // A swap replaces the body (template included) but keeps the persisted host.
    const host = document.querySelector('[data-cursor-host]');
    document.querySelector('template[data-cursor-template]')?.remove();
    document.body.insertAdjacentHTML('afterbegin', TEMPLATE.replace('View', 'Ver'));
    expect(document.querySelector('[data-cursor-host]')).toBe(host);
    setMotion('on');
    dispatchMotionChange(document, 'on');
    await flush();
    expect(layer().querySelector('[data-cursor-pill]')?.textContent).toBe('Ver');
    cleanup?.();
  });

  it('returns to rest when a navigation starts', async () => {
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    await flush();
    move(10, 10);
    const l = layer();
    over(el('card-img'));
    expect(l.dataset['state']).toBe('view');
    document.dispatchEvent(new Event('astro:before-preparation'));
    expect(l.dataset['state']).toBeUndefined();
    expect(l.hasAttribute('data-hidden')).toBe(false);

    over(el('field'));
    expect(l.hasAttribute('data-hidden')).toBe(true);
    document.dispatchEvent(new Event('astro:before-preparation'));
    expect(l.dataset['state']).toBeUndefined();
    expect(l.hasAttribute('data-hidden')).toBe(false);
    cleanup?.();
  });

  it('ignores router events once torn down', async () => {
    const h = harness();
    const cleanup = createCursor(h.deps)(document);
    await flush();
    const pill = layer().querySelector('[data-cursor-pill]');
    cleanup?.();
    beforeSwap('Ver');
    expect(pill?.textContent).toBe('View');
  });
});
