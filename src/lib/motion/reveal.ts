import { currentMotionState, onMotionChange } from './events';
import type { MotionState } from './gate';
import type { PageInit } from './lifecycle';
import type { GsapModules } from './load-gsap';
import { canSplit, splitAndRise, type SplitHandle } from './split-lines';

/**
 * Everything the reveal effect needs from outside the DOM, injected so unit tests can drive the
 * clock and the observer (happy-dom's IntersectionObserver never calls back).
 */
export interface RevealDeps {
  now(): number;
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
/** The CSS failsafe shows unarmed elements at 1500ms; a later mount must not hide them again. */
const FAILSAFE_MS = 1500;
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
      observer?.unobserve(el);
      if (!instant && isLines(el) && splitReady() && canSplit(el)) {
        const mods = gsapMods as GsapModules;
        // Inside the context, so cleanup's ctx.revert() restores the heading's original markup.
        ctx?.add(() => {
          splits.add(splitAndRise(el, mods));
        });
        return;
      }
      if (instant) el.setAttribute('data-reveal-instant', '');
      else el.style.setProperty('--reveal-delay', `${String(delay)}ms`);
      el.setAttribute('data-revealed', '');
    };

    const revealBatch = (batch: HTMLElement[]): void => {
      const sorted = [...batch].sort(byDomOrder);
      for (const el of sorted) finish(el, false, revealDelay(el, sorted));
    };

    // Late mount: the failsafe already showed everything, so whatever is in (or above) the
    // viewport stays shown; only elements below the fold get armed. One layout read, at mount.
    const shownByFailsafe = (el: HTMLElement): boolean =>
      deps.now() > FAILSAFE_MS && el.getBoundingClientRect().top < (win?.innerHeight ?? 0);
    const showInstantly = (el: HTMLElement): void => {
      el.setAttribute('data-revealed', '');
      el.setAttribute('data-reveal-instant', '');
    };
    const gateLines = deps.loadGsap !== undefined && currentMotionState(doc) === 'on';
    const toArm: HTMLElement[] = [];
    for (const el of elements) {
      if (shownByFailsafe(el)) showInstantly(el);
      else if (gateLines && isLines(el)) waitingLines.add(el);
      else toArm.push(el);
    }

    // Arm only once the observer exists (Pitfall 1): if creating it throws, nothing is armed and
    // the CSS failsafe still shows every element.
    try {
      observer = deps.createObserver(
        (entries) => {
          const batch: HTMLElement[] = [];
          for (const entry of entries) {
            const target = entry.target as HTMLElement;
            if (entry.isIntersecting && pending.has(target)) batch.push(target);
          }
          if (batch.length > 0) revealBatch(batch);
        },
        { rootMargin: '0px 0px -12% 0px', threshold: 0 },
      );
      for (const el of toArm) {
        el.setAttribute('data-reveal-armed', '');
        pending.add(el);
        observer.observe(el);
      }
    } catch (err) {
      for (const el of toArm) el.removeAttribute('data-reveal-armed');
      pending.clear();
      observer?.disconnect();
      throw err;
    }

    // Keyboard focus never lands on an invisible tile (WCAG 2.4.7): reveal the focused element's
    // reveal ancestor, and every part of its card, with no transition.
    doc.addEventListener(
      'focusin',
      (event) => {
        if (!(event.target instanceof Element)) return;
        const own = event.target.closest<HTMLElement>(PENDING);
        if (own) finish(own, true);
        const card = event.target.closest('article');
        if (card) for (const el of card.querySelectorAll<HTMLElement>(PENDING)) finish(el, true);
      },
      { signal: ac.signal },
    );

    // Elements near the page end may never cross the -12% trigger line (Pitfall 2).
    win?.addEventListener(
      'scrollend',
      () => {
        if (pending.size === 0) return;
        if (win.scrollY + win.innerHeight >= doc.documentElement.scrollHeight - 2) {
          revealBatch([...pending]);
        }
      },
      { signal: ac.signal },
    );

    /**
     * Arms lines headings that waited for a driver. One that the failsafe already showed (in or
     * above the viewport after 1.5s) stays shown instead of blinking out (Pitfall 6).
     */
    const armWaiting = (): void => {
      for (const el of waitingLines) {
        if (el.hasAttribute('data-revealed')) continue;
        if (shownByFailsafe(el)) {
          showInstantly(el);
          continue;
        }
        el.setAttribute('data-reveal-armed', '');
        pending.add(el);
        observer?.observe(el);
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
      observer?.disconnect();
      splits.clear();
      ctx?.revert();
      ctx = undefined;
      waitingLines.clear();
      // Unrevealed elements drop the armed marker so the CSS failsafe owns them again.
      for (const el of pending) el.removeAttribute('data-reveal-armed');
      pending.clear();
      for (const el of doc.querySelectorAll<HTMLElement>(SELECTOR)) {
        el.style.removeProperty('--reveal-delay');
      }
    };
  };
}
