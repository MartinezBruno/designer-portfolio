import { currentMotionState, onMotionChange } from './events';
import type { MotionState } from './gate';
import type { PageInit } from './lifecycle';
import type { GsapModules } from './load-gsap';
import { canSplit, splitAndRise, type SplitHandle } from './split-lines';

/**
 * Everything the reveal effect needs from outside the DOM, injected so unit tests can drive the
 * observer (happy-dom's IntersectionObserver never calls back).
 */
export interface RevealDeps {
  createObserver(
    cb: IntersectionObserverCallback,
    init: IntersectionObserverInit,
  ): Pick<IntersectionObserver, 'observe' | 'unobserve' | 'disconnect'>;
  /**
   * The lazy GSAP + SplitText loader. When present, `lines` headings under 'on' wait for it and
   * rise line by line; without it they take the CSS reveal like every other kind.
   */
  loadGsap?: () => Promise<GsapModules>;
}

const SELECTOR = '[data-reveal]';
const PENDING = '[data-reveal]:not([data-revealed])';
const isLines = (el: HTMLElement): boolean => el.dataset['reveal'] === 'lines';
/** The CSS failsafe keyframes (global.css): unarmed elements show themselves at 1500ms. */
const FAILSAFE_ANIMATION = 'reveal-failsafe';
const MAX_BASE_MS = 600;
const MAX_STEP_MS = 90;
const DEFAULT_STEP_MS = 70;
/** The 6th and later elements share the 5th's offset, so a batch never waits more than 4 steps. */
const MAX_INDEX = 4;

/** Integer-only parse (digits, no sign, no exponent), clamped; anything else is the fallback. */
function parseMs(value: string | undefined, max: number, fallback: number): number {
  if (value === undefined || !/^\d+$/.test(value.trim())) return fallback;
  return Math.min(Number.parseInt(value, 10), max);
}

/**
 * Whether the CSS failsafe has already shown `el`. Asks the element's own animation instead of
 * the page clock (06 review WR-05): the failsafe starts at first style resolution, and a future
 * soft navigation restarts it on the new page while performance.now() keeps growing. Without
 * getAnimations() the answer is unknown, so the element is armed as on an early mount.
 */
function failsafeFired(el: Element): boolean {
  if (typeof el.getAnimations !== 'function') return false;
  return el
    .getAnimations()
    .some(
      (a) =>
        (a as Partial<CSSAnimation>).animationName === FAILSAFE_ANIMATION &&
        a.playState === 'finished',
    );
}

/** Quiet time after the last scroll event that counts as a settled scroll without `scrollend`. */
const SCROLL_SETTLE_MS = 150;

/**
 * Calls `cb` when a scroll gesture has settled: on `scrollend` where the browser has it, otherwise
 * after SCROLL_SETTLE_MS without a `scroll` event (06 review WR-07: older WebKit has no
 * `scrollend`, and an element stuck inside the bottom 12% at maximum scroll depends on this).
 */
export function onScrollSettled(win: Window, cb: () => void, signal: AbortSignal): void {
  // Reflect.has, not `in`: lib.dom types every Window with onscrollend, which would narrow to never.
  if (Reflect.has(win, 'onscrollend')) {
    win.addEventListener('scrollend', cb, { signal });
    return;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  win.addEventListener(
    'scroll',
    () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(cb, SCROLL_SETTLE_MS);
    },
    { passive: true, signal },
  );
  signal.addEventListener('abort', () => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

function byDomOrder(a: Element, b: Element): number {
  if (a === b) return 0;
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

/** The direct child of `root` that contains `el` (or `el` itself when it is one). */
function childOf(root: Element, el: Element): Element | null {
  let node: Element | null = el;
  while (node && node.parentElement !== root) node = node.parentElement;
  return node;
}

/**
 * Start offset in ms for `el` within one intersection batch: the authored `data-reveal-delay`
 * (0..600) plus min(index, 4) steps. The step comes from the nearest `[data-reveal-stagger]`
 * ancestor (0..90, 70 when present without a valid value). The index is the DOM-order position of
 * the stagger root's direct child holding `el`, among the children holding batch elements, so a
 * card's cover and text share one slot. Pure: reads attributes only.
 */
export function revealDelay(el: Element, batch: readonly Element[]): number {
  const base = parseMs(el.getAttribute('data-reveal-delay') ?? undefined, MAX_BASE_MS, 0);
  const root = el.parentElement?.closest('[data-reveal-stagger]');
  if (!root) return base;
  const step = parseMs(
    root.getAttribute('data-reveal-stagger') ?? undefined,
    MAX_STEP_MS,
    DEFAULT_STEP_MS,
  );
  const own = childOf(root, el);
  const slots: Element[] = [];
  for (const member of batch) {
    if (member.parentElement?.closest('[data-reveal-stagger]') !== root) continue;
    const slot = childOf(root, member);
    if (slot && !slots.includes(slot)) slots.push(slot);
  }
  slots.sort(byDomOrder);
  const index = own ? Math.max(0, slots.indexOf(own)) : 0;
  return base + Math.min(index, MAX_INDEX) * step;
}

/**
 * The element the observers watch for `el` (08 A11Y-01). A shutter's own hidden clip-path
 * (`inset(0 0 100% 0)`) leaves a zero-height visible box at its top edge, so an observer on the
 * shutter never reports it while its card's top is above the viewport (an instant jump, a deep
 * link then scrolling back up): the cover stayed blank while on screen. The shutter is watched
 * through its card instead, which has no clip-path and starts at the same top edge as the cover,
 * so the trigger line for downward scrolling is unchanged. A shutter outside a card uses its
 * parent. Every other kind is watched directly.
 */
export function observeTargetFor(el: HTMLElement): Element {
  if (el.dataset['reveal'] !== 'shutter') return el;
  return el.closest('[data-card]') ?? el.parentElement ?? el;
}

/**
 * Scroll reveals (MOTN-01, UI-SPEC "Reveal Contract"). Markup carries `data-reveal`; CSS owns the
 * hidden, armed and revealed states and picks the transition per motion state. This effect only
 * writes attributes and `--reveal-delay`: `data-reveal-armed` (observer owns it, the CSS failsafe
 * stops), `data-revealed` (once, never removed, D-02) and `data-reveal-instant` (no transition).
 */
export function createReveal(deps: RevealDeps): PageInit {
  return (doc) => {
    if (currentMotionState(doc) === 'off') return undefined;
    const win = doc.defaultView;
    const elements = [...doc.querySelectorAll<HTMLElement>(PENDING)];
    const ac = new AbortController();

    const pending = new Set<HTMLElement>();
    let observer: ReturnType<RevealDeps['createObserver']> | undefined;
    /** Observed element -> the pending reveal targets it stands for (see observeTargetFor). */
    const targetsByProxy = new Map<Element, Set<HTMLElement>>();
    /** Registers `el` under its proxy once and returns the proxy to observe. */
    const track = (el: HTMLElement): Element => {
      const proxy = observeTargetFor(el);
      let targets = targetsByProxy.get(proxy);
      if (targets === undefined) {
        targets = new Set();
        targetsByProxy.set(proxy, targets);
      }
      targets.add(el);
      return proxy;
    };
    /** Drops `el` from its proxy; the proxy is unobserved once nothing pending maps to it. */
    const untrack = (el: HTMLElement): void => {
      const proxy = observeTargetFor(el);
      const targets = targetsByProxy.get(proxy);
      targets?.delete(el);
      if (targets !== undefined && targets.size > 0) return;
      targetsByProxy.delete(proxy);
      observer?.unobserve(proxy);
    };

    // Lines driver (Pattern 3 rules 3 and 6): under 'on' a `lines` heading stays unarmed (the CSS
    // failsafe owns it) until GSAP has loaded, so nothing is ever armed with no way to reveal it.
    let gsapMods: GsapModules | undefined;
    let ctx: ReturnType<GsapModules['gsap']['context']> | undefined;
    let loading = false;
    const waitingLines = new Set<HTMLElement>();
    const splits = new Set<SplitHandle>();
    const splitReady = (): boolean =>
      gsapMods !== undefined && ctx !== undefined && currentMotionState(doc) === 'on';

    const finish = (el: HTMLElement, instant: boolean, delay = 0): void => {
      if (!pending.delete(el)) return;
      untrack(el);
      if (!instant && isLines(el) && splitReady() && canSplit(el)) {
        const mods = gsapMods as GsapModules;
        let handle: SplitHandle | undefined;
        // Inside the context, so cleanup's ctx.revert() restores the heading's original markup.
        // The catch sits inside the callback so GSAP still restores its current context.
        ctx?.add(() => {
          try {
            handle = splitAndRise(el, mods);
          } catch {
            handle = undefined;
          }
        });
        if (handle !== undefined) {
          splits.add(handle);
          return;
        }
        // The split threw (06 review WR-03): the heading is no longer pending, so nothing else
        // could reveal it. Take the CSS reveal instead of staying armed and invisible (D-05).
      }
      if (instant) el.setAttribute('data-reveal-instant', '');
      else el.style.setProperty('--reveal-delay', `${String(delay)}ms`);
      el.setAttribute('data-revealed', '');
    };

    const revealBatch = (batch: HTMLElement[]): void => {
      const sorted = [...batch].sort(byDomOrder);
      for (const el of sorted) finish(el, false, revealDelay(el, sorted));
    };

    // Late mount: the failsafe already showed these, so whatever is in (or above) the viewport
    // stays shown; only elements below the fold get armed. Layout is read only for those.
    const shownByFailsafe = (el: HTMLElement): boolean =>
      failsafeFired(el) && el.getBoundingClientRect().top < (win?.innerHeight ?? 0);
    const showInstantly = (el: HTMLElement): void => {
      el.setAttribute('data-revealed', '');
      el.setAttribute('data-reveal-instant', '');
    };
    // Restored position (07 D-15): back/forward lands mid-page, and an element that starts above
    // the viewport at mount is shown at once, so no entrance replays above the visitor, including
    // one straddling the top edge. Later jumps past a card top are covered by observing shutters
    // through their card (observeTargetFor). At scroll 0 (every fresh load) nothing can be above,
    // so no layout is read and first-load is unchanged.
    const scrolled = (win?.scrollY ?? 0) > 0;
    const aboveViewport = (el: HTMLElement): boolean =>
      scrolled && el.getBoundingClientRect().top < 0;
    const gateLines = deps.loadGsap !== undefined && currentMotionState(doc) === 'on';
    const toArm: HTMLElement[] = [];
    for (const el of elements) {
      if (aboveViewport(el) || shownByFailsafe(el)) showInstantly(el);
      else if (gateLines && isLines(el)) waitingLines.add(el);
      else toArm.push(el);
    }

    type Observer = ReturnType<RevealDeps['createObserver']>;
    /** Reveals the still-pending targets of one callback's intersecting proxies as one batch. */
    const revealEntries = (entries: IntersectionObserverEntry[]): void => {
      const batch: HTMLElement[] = [];
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const target of targetsByProxy.get(entry.target) ?? []) {
          if (pending.has(target) && !batch.includes(target)) batch.push(target);
        }
      }
      if (batch.length > 0) revealBatch(batch);
    };
    // One-shot viewport passes (06-10 review, 06 review WR-01): an element already on screen but
    // inside the trigger's bottom 12% would otherwise stay blank until the first scroll. A pass
    // observes with no margin, reveals what is visible now as one batch, then goes away.
    const passes = new Set<Observer>();
    const createPass = (): Observer => {
      let done = false;
      const pass = deps.createObserver(
        (entries) => {
          if (done) return;
          done = true;
          pass.disconnect();
          passes.delete(pass);
          revealEntries(entries);
        },
        { rootMargin: '0px', threshold: 0 },
      );
      passes.add(pass);
      return pass;
    };

    // Arm only once the observer exists (Pitfall 1): if creating it throws, nothing is armed and
    // the CSS failsafe still shows every element.
    let mountPass: Observer | undefined;
    try {
      // The mount pass is created first, so its initial callback runs before the trigger's and
      // owns the batch.
      mountPass = createPass();
      observer = deps.createObserver(revealEntries, {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0,
      });
      for (const el of toArm) {
        el.setAttribute('data-reveal-armed', '');
        pending.add(el);
        const proxy = track(el);
        observer.observe(proxy);
        mountPass.observe(proxy);
      }
    } catch (err) {
      for (const el of toArm) el.removeAttribute('data-reveal-armed');
      pending.clear();
      targetsByProxy.clear();
      mountPass?.disconnect();
      observer?.disconnect();
      throw err;
    }

    // Keyboard focus never lands on an invisible tile (WCAG 2.4.7): reveal the focused element's
    // reveal ancestor, and every part of its card, with no transition. Only `[data-card]` counts as
    // a card: the detail page's whole-page <article> must not reveal every module (06 review WR-02).
    doc.addEventListener(
      'focusin',
      (event) => {
        if (!(event.target instanceof Element)) return;
        const own = event.target.closest<HTMLElement>(PENDING);
        if (own) finish(own, true);
        const card = event.target.closest('[data-card]');
        if (card) for (const el of card.querySelectorAll<HTMLElement>(PENDING)) finish(el, true);
      },
      { signal: ac.signal },
    );

    // Elements near the page end may never cross the -12% trigger line (Pitfall 2).
    if (win) {
      onScrollSettled(
        win,
        () => {
          if (pending.size === 0) return;
          if (win.scrollY + win.innerHeight >= doc.documentElement.scrollHeight - 2) {
            revealBatch([...pending]);
          }
        },
        ac.signal,
      );
    }

    /**
     * Arms lines headings that waited for a driver. One that the failsafe already showed (in or
     * above the viewport after 1.5s) stays shown instead of blinking out (Pitfall 6).
     */
    const armWaiting = (): void => {
      // These missed the mount-time pass (06 review WR-01): they get their own one-shot pass, so
      // a heading already on screen inside the bottom 12% reveals now, not on a scroll that may
      // never come.
      let pass: Observer | undefined;
      for (const el of waitingLines) {
        if (el.hasAttribute('data-revealed')) continue;
        if (shownByFailsafe(el)) {
          showInstantly(el);
          continue;
        }
        el.setAttribute('data-reveal-armed', '');
        pending.add(el);
        const proxy = track(el);
        observer?.observe(proxy);
        (pass ??= createPass()).observe(proxy);
      }
      waitingLines.clear();
    };

    const ensureGsap = (): void => {
      const load = deps.loadGsap;
      if (load === undefined || gsapMods !== undefined || loading) return;
      loading = true;
      void load()
        .then((mods) => {
          if (ac.signal.aborted) return;
          gsapMods = mods;
          ctx = mods.gsap.context(() => undefined);
          armWaiting();
        })
        .catch(() => {
          if (ac.signal.aborted) return;
          // GSAP chunk failed (D-05): nothing may stay hidden, so show the waiting lines now.
          for (const el of waitingLines) if (!el.hasAttribute('data-revealed')) showInstantly(el);
          waitingLines.clear();
        })
        .finally(() => {
          loading = false;
        });
    };

    const finishSplits = (): void => {
      for (const handle of splits) handle.finish();
      splits.clear();
    };

    if (waitingLines.size > 0) ensureGsap();

    // CSS swaps settle/shutter transitions between 'on' and 'reduced' by itself; only the GSAP
    // line rise needs handling here.
    onMotionChange(
      doc,
      (state: MotionState) => {
        if (state === 'on') {
          // Nothing replays; lines still waiting to reveal get the split driver if it is missing.
          const linesLeft = [...pending].some(isLines) || waitingLines.size > 0;
          if (linesLeft) ensureGsap();
          return;
        }
        finishSplits();
        // Waiting lines take the fade path (or, under 'off', no hidden state at all).
        armWaiting();
      },
      ac.signal,
    );

    return () => {
      ac.abort();
      for (const pass of passes) pass.disconnect();
      passes.clear();
      observer?.disconnect();
      splits.clear();
      ctx?.revert();
      ctx = undefined;
      waitingLines.clear();
      // Unrevealed elements drop the armed marker so the CSS failsafe owns them again.
      for (const el of pending) el.removeAttribute('data-reveal-armed');
      pending.clear();
      targetsByProxy.clear();
      for (const el of doc.querySelectorAll<HTMLElement>(SELECTOR)) {
        el.style.removeProperty('--reveal-delay');
      }
    };
  };
}
