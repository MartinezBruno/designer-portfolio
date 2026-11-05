// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchMotionChange } from '../../src/lib/motion/events';
import {
  bindNavigation,
  MORPH_NAME,
  wrapForMorph,
  type NavigationHandle,
} from '../../src/lib/motion/navigation';

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

  it('marks the arriving html with data-vt and releases 336 ms after ready under on', async () => {
    setLiveState('on');
    const transition = fakeTransition();
    const next = swap(transition);
    expect(next.documentElement.hasAttribute('data-vt')).toBe(true);
    const state = tracked();
    await vi.advanceTimersByTimeAsync(100);
    transition.makeReady();
    await vi.advanceTimersByTimeAsync(335);
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

  it('releases on finished under reduced, not at 336 ms after ready', async () => {
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

  it('still skips after release while the wipe is running (D-18)', async () => {
    setLiveState('on');
    const transition = fakeTransition();
    swap(transition);
    transition.makeReady();
    await vi.advanceTimersByTimeAsync(400);
    expect(document.documentElement.hasAttribute('data-vt')).toBe(false);
    dispatchMotionChange(document, 'reduced');
    expect(transition.skipTransition).toHaveBeenCalledTimes(1);
  });

  it('does not skip a transition that has finished', async () => {
    setLiveState('on');
    const transition = fakeTransition();
    swap(transition);
    transition.finish();
    await vi.advanceTimersByTimeAsync(0);
    dispatchMotionChange(document, 'reduced');
    expect(transition.skipTransition).not.toHaveBeenCalled();
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

// 07-04 (UI-SPEC "Vestibular", WCAG 2.3.1): at most three wipe passes in any one-second window.
describe('bindNavigation wipe rate limit', () => {
  let now = 0;
  let navigation: NavigationHandle;

  beforeEach(() => {
    now = 0;
    navigation = bindNavigation(document, { now: () => now });
    setLiveState('on');
  });

  afterEach(() => {
    navigation.unbind();
    delete document.documentElement.dataset['motion'];
    delete document.documentElement.dataset['wipe'];
    delete document.documentElement.dataset['vt'];
  });

  function navigateAt(at: number): FakeTransition {
    now = at;
    const transition = fakeTransition();
    beforeSwap(parse(ARRIVING_WITHOUT_TOGGLE), transition);
    return transition;
  }

  it('lets three wipes through and skips a fourth inside the window', () => {
    const passes = [0, 200, 400].map(navigateAt);
    for (const transition of passes) expect(transition.skipTransition).not.toHaveBeenCalled();
    const fourth = navigateAt(600);
    expect(fourth.skipTransition).toHaveBeenCalledTimes(1);
  });

  it('a skipped navigation does not count, and the window slides', () => {
    [0, 200, 400].map(navigateAt);
    navigateAt(600);
    // 1150 ms after the first pass: only two passes (200, 400) remain inside the window.
    const later = navigateAt(1300);
    expect(later.skipTransition).not.toHaveBeenCalled();
  });

  it('never limits reduced crossfades (no panel, no flash)', () => {
    setLiveState('reduced');
    const fades = [0, 100, 200, 300, 400].map(navigateAt);
    for (const transition of fades) expect(transition.skipTransition).not.toHaveBeenCalled();
  });
});

// 07-06: card title -> detail h1 morph (D-02; UI-SPEC "Title Morph"; Research Pattern 4, Pitfall 8).
describe('bindNavigation title morph', () => {
  let navigation: NavigationHandle;

  const CARD = `<article data-card><h2><a href="/projects/a/">Insta<em>Blogs</em></a></h2></article>`;
  const LANG_CARD = `<article data-card><h3><a href="/projects/b/"><span lang="es">Fotografía</span></a></h3></article>`;
  const TEASER = `<article data-card><h3><a href="/projects/c/"><span class="sr-only">Next project:</span> <span lang="es">Señales</span></a></h3></article>`;
  const NAV = `<nav><a href="/projects/">Projects</a></nav>`;
  const DETAIL =
    '<!doctype html><html data-motion="off"><body><main><h1 id="project-title" data-reveal="lines" tabindex="-1"><span lang="es">Señales</span></h1></main></body></html>';

  function mount(html: string): HTMLAnchorElement {
    document.body.innerHTML = html;
    const link = document.body.querySelector('a');
    if (link === null) throw new Error('no link');
    return link;
  }

  function prepare(sourceElement?: Element): Event {
    const event = Object.assign(new Event('astro:before-preparation', { cancelable: true }), {
      sourceElement,
    });
    document.dispatchEvent(event);
    return event;
  }

  function named(root: ParentNode): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>('[style]')].filter(
      (el) => el.style.getPropertyValue('view-transition-name') === MORPH_NAME,
    );
  }

  // Animation frames queued by the morph cleanup, run by `nextFrame()`.
  let frames: (() => void)[] = [];

  function nextFrame(): void {
    const queued = frames;
    frames = [];
    for (const cb of queued) cb();
  }

  async function settle(): Promise<void> {
    for (let i = 0; i < 4; i += 1) await Promise.resolve();
  }

  beforeEach(() => {
    frames = [];
    navigation = bindNavigation(document, {
      requestAnimationFrame: (cb) => {
        frames.push(cb);
      },
    });
    setLiveState('on');
  });

  afterEach(() => {
    navigation.unbind();
    document.body.innerHTML = '';
    delete document.documentElement.dataset['motion'];
    delete document.documentElement.dataset['wipe'];
    delete document.documentElement.dataset['vt'];
  });

  it('wrapForMorph moves the qualifying nodes into one fit-content inline-block span', () => {
    const link = mount(TEASER);
    const before = link.textContent;
    const span = wrapForMorph(
      link,
      (node) => node instanceof Element && node.classList.contains('sr-only'),
    );
    expect(span.hasAttribute('data-morph-title')).toBe(true);
    expect(span.style.getPropertyValue('display')).toBe('inline-block');
    expect(span.style.getPropertyValue('width')).toBe('fit-content');
    expect(span.style.getPropertyValue('view-transition-name')).toBe(MORPH_NAME);
    expect(span.childNodes).toHaveLength(2);
    expect(span.previousElementSibling?.classList.contains('sr-only')).toBe(true);
    expect(link.textContent).toBe(before);
  });

  it('names the clicked card title link under on, exactly once', () => {
    const link = mount(CARD);
    const before = link.textContent;
    prepare(link);
    const spans = named(document);
    expect(spans).toHaveLength(1);
    const span = spans[0];
    expect(span?.parentElement).toBe(link);
    expect(span?.hasAttribute('data-morph-title')).toBe(true);
    expect(span?.style.getPropertyValue('display')).toBe('inline-block');
    expect(span?.style.getPropertyValue('width')).toBe('fit-content');
    expect(link.textContent).toBe(before);
    expect(link.querySelector('em')?.parentElement).toBe(span);
  });

  it('wraps a lang title without touching its lang span', () => {
    const link = mount(LANG_CARD);
    prepare(link);
    const span = named(document)[0];
    expect(span?.firstElementChild?.getAttribute('lang')).toBe('es');
    expect(link.textContent).toBe('Fotografía');
  });

  it('leaves the teaser sr-only prefix and its whitespace outside the wrapper', () => {
    const link = mount(TEASER);
    const before = link.textContent;
    prepare(link);
    const span = named(document)[0];
    expect(span?.textContent).toBe('Señales');
    expect(link.firstElementChild?.classList.contains('sr-only')).toBe(true);
    expect(span?.querySelector('.sr-only')).toBeNull();
    expect(link.textContent).toBe(before);
  });

  it('names a card title when the click lands on a node inside the link', () => {
    const link = mount(CARD);
    const inner = link.querySelector('em');
    if (inner === null) throw new Error('no inner');
    prepare(inner);
    expect(named(document)).toHaveLength(1);
  });

  it('names nothing for a link outside a card, without a source, or under reduced', () => {
    prepare(mount(NAV));
    expect(named(document)).toHaveLength(0);
    mount(CARD);
    prepare();
    expect(named(document)).toHaveLength(0);
    setLiveState('reduced');
    prepare(mount(CARD));
    expect(named(document)).toHaveLength(0);
    expect(document.querySelector('[data-morph-title]')).toBeNull();
  });

  it('names nothing when motion is off (the navigation becomes a full load)', () => {
    setLiveState('off');
    prepare(mount(CARD));
    expect(named(document)).toHaveLength(0);
  });

  it('names the arriving h1 and reveals it instantly after a named source', () => {
    prepare(mount(CARD));
    const next = parse(DETAIL);
    beforeSwap(next, fakeTransition());
    const title = next.getElementById('project-title');
    expect(title?.hasAttribute('data-revealed')).toBe(true);
    expect(title?.hasAttribute('data-reveal-instant')).toBe(true);
    const spans = named(next);
    expect(spans).toHaveLength(1);
    expect(spans[0]?.parentElement).toBe(title);
    expect(spans[0]?.style.getPropertyValue('display')).toBe('inline-block');
    expect(title?.textContent).toBe('Señales');
    expect(spans[0]?.firstElementChild?.getAttribute('lang')).toBe('es');
  });

  it('does not touch the arriving h1 without a named source (nav link, back)', () => {
    prepare(mount(NAV));
    const next = parse(DETAIL);
    beforeSwap(next, fakeTransition());
    const title = next.getElementById('project-title');
    expect(title?.hasAttribute('data-revealed')).toBe(false);
    expect(named(next)).toHaveLength(0);
  });

  it('adds nothing when the arriving document has no #project-title', () => {
    prepare(mount(CARD));
    const next = parse(ARRIVING_WITHOUT_TOGGLE);
    beforeSwap(next, fakeTransition());
    expect(next.querySelector('[data-morph-title]')).toBeNull();
    expect(next.querySelector('[data-revealed]')).toBeNull();
  });

  it('clears both names when the transition finishes and restores the source link', async () => {
    const link = mount(CARD);
    const markup = link.innerHTML;
    prepare(link);
    const next = parse(DETAIL);
    const transition = fakeTransition();
    beforeSwap(next, transition);
    transition.finish();
    await transition.finished;
    await Promise.resolve();
    await Promise.resolve();
    expect(named(next)).toHaveLength(0);
    expect(named(document)).toHaveLength(0);
    expect(link.innerHTML).toBe(markup);
    expect(next.getElementById('project-title')?.textContent).toBe('Señales');
  });

  it('a new navigation clears a leftover name first (aborted transition)', () => {
    const first = mount(CARD);
    const markup = first.innerHTML;
    prepare(first);
    expect(named(document)).toHaveLength(1);
    prepare();
    expect(named(document)).toHaveLength(0);
    expect(first.innerHTML).toBe(markup);
  });

  it('only the latest clicked title carries the name', () => {
    document.body.innerHTML = CARD + LANG_CARD;
    const [a, b] = [...document.querySelectorAll('a')];
    if (a === undefined || b === undefined) throw new Error('no links');
    prepare(a);
    prepare(b);
    const spans = named(document);
    expect(spans).toHaveLength(1);
    expect(spans[0]?.parentElement).toBe(b);
  });

  it('a fallback swap without a view transition does not mark the h1', () => {
    prepare(mount(CARD));
    const next = parse(DETAIL);
    beforeSwap(next);
    expect(next.getElementById('project-title')?.hasAttribute('data-revealed')).toBe(false);
    expect(named(next)).toHaveLength(0);
    expect(named(document)).toHaveLength(0);
  });

  it('unwraps the landed h1 one frame after the transition finishes (IN-01)', async () => {
    prepare(mount(CARD));
    const next = parse(DETAIL);
    const title = next.getElementById('project-title');
    const lang = title?.querySelector('[lang]');
    const transition = fakeTransition();
    beforeSwap(next, transition);
    transition.finish();
    await settle();
    // Unnamed at once, but the wrapper holds the snapshot box until the next frame.
    expect(named(next)).toHaveLength(0);
    expect(title?.querySelector('[data-morph-title]')).not.toBeNull();
    nextFrame();
    expect(title?.querySelector('[data-morph-title]')).toBeNull();
    expect(title?.textContent).toBe('Señales');
    expect(title?.querySelector('[lang]')).toBe(lang);
    expect(lang?.parentElement).toBe(title);
  });

  it('an aborted transition leaves no wrapper on either side', async () => {
    const link = mount(CARD);
    const markup = link.innerHTML;
    prepare(link);
    const next = parse(DETAIL);
    const transition = fakeTransition();
    let abort: (reason: unknown) => void = () => undefined;
    transition.finished = new Promise<void>((_, reject) => {
      abort = reject;
    });
    beforeSwap(next, transition);
    abort(new DOMException('Transition was aborted', 'AbortError'));
    await settle();
    nextFrame();
    expect(document.querySelector('[data-morph-title]')).toBeNull();
    expect(next.querySelector('[data-morph-title]')).toBeNull();
    expect(link.innerHTML).toBe(markup);
    expect(next.getElementById('project-title')?.textContent).toBe('Señales');
  });

  it('a skipped transition also unwraps the landed h1', async () => {
    prepare(mount(CARD));
    const next = parse(DETAIL);
    const transition = fakeTransition();
    beforeSwap(next, transition);
    transition.skipTransition();
    await settle();
    nextFrame();
    expect(next.querySelector('[data-morph-title]')).toBeNull();
    expect(named(next)).toHaveLength(0);
  });
});
