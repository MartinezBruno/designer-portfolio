import type {
  TransitionBeforePreparationEvent,
  TransitionBeforeSwapEvent,
} from 'astro:transitions/client';
import { currentMotionState, onMotionChange } from './events';
import type { MotionState } from './gate';
import { durations, wipeRelease } from './tokens';

declare global {
  interface DocumentEventMap {
    'astro:before-preparation': TransitionBeforePreparationEvent;
    'astro:before-swap': TransitionBeforeSwapEvent;
  }
}

/**
 * App-scope ClientRouter hooks (MOTN-05, 07 D-03..D-05, Research Pattern 1, Pitfalls 1, 2, 9).
 * Bound once per session: the motion module runs once under the router, so these listeners live
 * on the persistent `document`, not in the page lifecycle.
 *
 * - `off` opts out of soft navigation: preventing `astro:before-preparation` makes the router fall
 *   back to `location.href = to.href`, a plain full page load (D-04).
 * - The router replaces every `<html>` attribute with the arriving document's, whose markup default
 *   is `data-motion="off"`, and the inline gate does not re-run on a swap. Copying the live value
 *   onto the arriving root keeps motion on (Pitfall 1).
 * - The toggle's icon is keyed on `aria-pressed`; its init runs at page-load, after the new page
 *   has painted. Setting it on the arriving markup avoids a wrong-icon flash (Pitfall 2).
 *
 * - Under `on` the arriving document is marked `data-wipe="out"` so the ink panel's new snapshot is
 *   parked past the far edge and its view-transition group travels across the page (07-02, D-01).
 *   The marker only exists during a transition: it is removed when the transition finishes, and
 *   again at the start of the next navigation in case an aborted one never settled (Pitfall 8).
 *
 * - Release gate (07-04, D-16, Research Pattern 2, Pitfall 3): while a transition runs the arriving
 *   html carries `data-vt`, which holds the hero keyframes paused (global.css). The page is released
 *   at 70% of `--t-wipe` after `ready` under `on`, or when the transition finishes, whichever comes
 *   first, and never later than RELEASE_CAP_MS after the swap (T-07-10). Release removes `data-vt`
 *   and resolves `waitForRelease()`, which the page lifecycle and nav focus await.
 * - Live switching (D-18): a change away from `on` finishes the running transition at once with
 *   `skipTransition()`, so nothing is left half-wiped.
 *
 * - Pressed state (07-16, touch latency gap from 07-10): when the router starts a soft navigation
 *   under `on` or `reduced`, the tapped link gets `data-nav-pressed`, so a tap is acknowledged
 *   before the next document arrives. It is cleared on the swap, at the next navigation, after
 *   PRESS_TIMEOUT_MS and on unbind, so it never reaches the arriving page (T-07-38).
 *
 * Only constants and the narrowed live state are written into the new document (T-07-02).
 * Handlers stay named so later Phase 7 plans can extend them locally.
 */

/** Hard cap after the swap: a stalled transition must never strand held content (T-07-10). */
export const RELEASE_CAP_MS = 1200;

/**
 * Vestibular limit (UI-SPEC "Vestibular", WCAG 2.3.1): at most three ink passes in any one second.
 * The router aborts a running navigation but still starts a fresh wipe for each click, so rapid
 * clicking measured five passes in 0.9 s (07-04 e2e). A fourth inside the window is skipped: the
 * swap lands as an instant cut with no panel. The window carries 100 ms of margin because a pass
 * is counted at the swap, slightly before its animations start.
 */
export const WIPE_LIMIT = 3;
export const WIPE_WINDOW_MS = 1100;

/** Safety net: a pressed marker whose navigation never swaps (stalled, aborted) clears itself. */
export const PRESS_TIMEOUT_MS = 3000;

export interface NavigationDeps {
  setTimeout?: (cb: () => void, ms: number) => number;
  clearTimeout?: (id: number) => void;
  now?: () => number;
  requestAnimationFrame?: (cb: () => void) => void;
}

export interface NavigationHandle {
  unbind: () => void;
  /** Resolves when the arriving page may animate and take focus; at once outside a transition. */
  waitForRelease: () => Promise<void>;
}

interface PendingTransition {
  transition: ViewTransition;
  release: Promise<void>;
}

/** The one shared view-transition name of the card title -> detail h1 morph (07 D-02). */
export const MORPH_NAME = 'project-title';

/**
 * Moves `el`'s child nodes, except those `skip` rejects, into a new `span[data-morph-title]` set
 * to `display: inline-block; width: fit-content` and named MORPH_NAME (07 D-02, UI-SPEC "Title
 * Morph"). The span is the morph's box: the stretched link's `::after` covers the whole tile, so
 * the link itself must never carry the name, and an atomic inline box keeps the link's hover
 * underline and focus ring out of the snapshot. Nodes are moved, never re-parsed (T-07-15), so
 * text, `lang` spans and listeners are untouched. Created through `el.ownerDocument`, so it also
 * works on the router's DOMParser document.
 */
export function wrapForMorph(el: Element, skip: (node: Node) => boolean): HTMLSpanElement {
  const span = el.ownerDocument.createElement('span');
  span.setAttribute('data-morph-title', '');
  span.style.setProperty('display', 'inline-block');
  span.style.setProperty('width', 'fit-content');
  span.style.setProperty('view-transition-name', MORPH_NAME);
  const nodes = [...el.childNodes].filter((node) => !skip(node));
  el.insertBefore(span, nodes[0] ?? null);
  span.append(...nodes);
  return span;
}

/** Puts a wrapper's children back where it stood and removes it. */
function unwrap(span: HTMLElement): void {
  span.replaceWith(...span.childNodes);
}

const isScreenReaderOnly = (node: Node | null): boolean =>
  node instanceof Element && node.classList.contains('sr-only');

/**
 * The teaser link reads "<sr-only prefix> <title>": the prefix and the whitespace beside it stay
 * outside the morph box, so only the visible title flies (UI-SPEC "Title Morph").
 */
function isTitleChrome(node: Node): boolean {
  if (isScreenReaderOnly(node)) return true;
  if (node.nodeType !== Node.TEXT_NODE || (node.textContent ?? '').trim() !== '') return false;
  return isScreenReaderOnly(node.previousSibling) || isScreenReaderOnly(node.nextSibling);
}

interface Morph {
  /** The wrapper inside the clicked card title link, in the live (old) document. */
  source: HTMLSpanElement;
  /** The wrapper inside the arriving `#project-title`, once the swap is prepared. */
  target?: HTMLSpanElement;
}

export function bindNavigation(doc: Document, deps: NavigationDeps = {}): NavigationHandle {
  const ac = new AbortController();
  const { signal } = ac;
  const setTimer =
    deps.setTimeout ?? ((cb: () => void, ms: number): number => window.setTimeout(cb, ms));
  const clearTimer =
    deps.clearTimeout ??
    ((id: number): void => {
      window.clearTimeout(id);
    });
  const now = deps.now ?? ((): number => performance.now());
  const nextFrame =
    deps.requestAnimationFrame ??
    ((cb: () => void): void => {
      window.requestAnimationFrame(() => {
        cb();
      });
    });
  const holdMs = Math.round(durations.wipe * wipeRelease * 1000);
  // Swap times of the wipe passes inside the current vestibular window.
  let wipeStarts: number[] = [];

  let pending: PendingTransition | undefined;
  // The transition still animating; it outlives the release (D-18 skips it until it finishes).
  let running: ViewTransition | undefined;

  function preventOffNavigation(event: TransitionBeforePreparationEvent): void {
    if (currentMotionState(doc) === 'off') event.preventDefault();
  }

  // The transition that owns the live marker; a superseded one must not clear its successor's.
  let wipeOwner: ViewTransition | undefined;

  function clearStaleWipe(): void {
    wipeOwner = undefined;
    doc.documentElement.removeAttribute('data-wipe');
  }

  function markWipe(event: TransitionBeforeSwapEvent): void {
    if (currentMotionState(doc) !== 'on') return;
    // `viewTransition` is typed as always present, but fake events in tests may omit it.
    const transition: ViewTransition | undefined = event.viewTransition;
    if (transition !== undefined) {
      const at = now();
      wipeStarts = wipeStarts.filter((start) => at - start < WIPE_WINDOW_MS);
      if (wipeStarts.length >= WIPE_LIMIT) {
        // Skipped inside the update callback: no pseudo-elements are built, so no panel shows.
        transition.skipTransition();
        return;
      }
      wipeStarts.push(at);
    }
    event.newDocument.documentElement.dataset['wipe'] = 'out';
    if (transition === undefined) return;
    wipeOwner = transition;
    void transition.finished
      .catch(() => undefined)
      .finally(() => {
        if (wipeOwner !== transition) return;
        wipeOwner = undefined;
        doc.documentElement.removeAttribute('data-wipe');
      });
  }

  function carryMotionState(event: TransitionBeforeSwapEvent): void {
    const live = doc.documentElement.dataset['motion'];
    if (live !== undefined) event.newDocument.documentElement.dataset['motion'] = live;
  }

  function syncMotionToggle(event: TransitionBeforeSwapEvent): void {
    const toggle = event.newDocument.querySelector('[data-motion-toggle]');
    toggle?.setAttribute('aria-pressed', String(currentMotionState(doc) === 'reduced'));
  }

  function holdArrival(event: TransitionBeforeSwapEvent): void {
    const state = currentMotionState(doc);
    const transition: ViewTransition | undefined = event.viewTransition;
    if (transition === undefined || state === 'off') return;
    event.newDocument.documentElement.dataset['vt'] = '';

    const timers: number[] = [];
    const entry: PendingTransition = { transition, release: Promise.resolve() };
    entry.release = new Promise<void>((resolve) => {
      let settled = false;
      const settle = (): void => {
        if (settled) return;
        settled = true;
        for (const id of timers) clearTimer(id);
        // Only the transition that owns the marker clears it; a successor holds its own page.
        if (pending === entry) {
          pending = undefined;
          doc.documentElement.removeAttribute('data-vt');
        }
        resolve();
      };
      timers.push(setTimer(settle, RELEASE_CAP_MS));
      if (state === 'on') {
        transition.ready.then(
          () => {
            if (!settled) timers.push(setTimer(settle, holdMs));
          },
          // A skipped or aborted transition rejects `ready`; `finished` or the cap releases it.
          () => undefined,
        );
      }
      transition.finished.then(settle, settle);
    });
    pending = entry;
    running = transition;
    const clearRunning = (): void => {
      if (running === transition) running = undefined;
    };
    transition.finished.then(clearRunning, clearRunning);
  }

  function skipOnMotionChange(state: MotionState): void {
    if (state !== 'on') running?.skipTransition();
  }

  let morph: Morph | undefined;

  /**
   * Ends the morph: the source link gets its original children back (an aborted navigation leaves
   * the visitor on the card, whose hover underline needs the bare text), and the arriving h1 loses
   * the name at once. Its wrapper is unwrapped separately, one frame after the transition settles
   * (`nameMorphTarget`), so the landed h1 matches a full load of the same page (IN-01) without a
   * reflow while the new snapshot is still on screen. Afterwards no element is named (Pitfall 8).
   */
  function clearMorph(): void {
    if (morph === undefined) return;
    unwrap(morph.source);
    morph.target?.style.removeProperty('view-transition-name');
    morph = undefined;
  }

  /**
   * 07 D-02, Research Pattern 4: under `on` a click on a card's title link (`event.sourceElement`
   * inside `[data-card]`) names that title only, before the router captures the old state. Nav
   * links, the EN/ES switch, back/forward (no source element), `reduced` and `off` name nothing.
   * Any leftover from an aborted navigation is cleared first, so names stay unique (T-07-16).
   */
  function nameMorphSource(event: TransitionBeforePreparationEvent): void {
    clearMorph();
    if (event.defaultPrevented || currentMotionState(doc) !== 'on') return;
    const source: Element | undefined = event.sourceElement;
    const card = source?.closest('[data-card]');
    const link = source?.closest('a');
    if (card == null || link == null || !card.contains(link)) return;
    if (link.closest('h1, h2, h3, h4, h5, h6') === null) return;
    morph = { source: wrapForMorph(link, isTitleChrome) };
  }

  /**
   * The arriving `#project-title` gets the same name around its children, and lands revealed
   * (`data-revealed data-reveal-instant`), so the Phase 6 line rise never splits or replays it
   * under the flying title (UI-SPEC "Title Morph"). Both names are cleared once the transition
   * settles, whether it finished, was skipped or was aborted, and one frame later the h1's wrapper
   * is unwrapped (IN-01, 07-13). Its nodes are moved back, never re-parsed (T-07-27).
   */
  function nameMorphTarget(event: TransitionBeforeSwapEvent): void {
    if (morph === undefined || morph.target !== undefined) return;
    const transition: ViewTransition | undefined = event.viewTransition;
    if (transition === undefined || currentMotionState(doc) !== 'on') {
      clearMorph();
      return;
    }
    const entry = morph;
    const title = event.newDocument.getElementById('project-title');
    if (title !== null) {
      entry.target = wrapForMorph(title, () => false);
      title.setAttribute('data-revealed', '');
      title.setAttribute('data-reveal-instant', '');
    }
    void transition.finished
      .catch(() => undefined)
      .finally(() => {
        if (morph === entry) clearMorph();
        const target = entry.target;
        if (target === undefined) return;
        nextFrame(() => {
          if (target.isConnected && target.parentNode !== null) unwrap(target);
        });
      });
  }

  let pressed: Element | undefined;
  let pressTimer: number | undefined;

  function clearPressed(): void {
    if (pressTimer !== undefined) clearTimer(pressTimer);
    pressTimer = undefined;
    pressed?.removeAttribute('data-nav-pressed');
    pressed = undefined;
  }

  /**
   * 07-16: the tapped link shows its pressed state the moment the router starts, ahead of the
   * fetch (07-10 touch latency gap). Only the constant attribute is written (T-07-37). `off` and
   * back/forward (no source element) mark nothing.
   */
  function markPressed(event: TransitionBeforePreparationEvent): void {
    clearPressed();
    if (event.defaultPrevented || currentMotionState(doc) === 'off') return;
    const source: Element | undefined = event.sourceElement;
    const link = source?.closest('a');
    if (link == null) return;
    link.setAttribute('data-nav-pressed', '');
    pressed = link;
    pressTimer = setTimer(clearPressed, PRESS_TIMEOUT_MS);
  }

  doc.addEventListener('astro:before-preparation', preventOffNavigation, { signal });
  doc.addEventListener('astro:before-preparation', markPressed, { signal });
  doc.addEventListener('astro:before-preparation', clearStaleWipe, { signal });
  doc.addEventListener('astro:before-preparation', nameMorphSource, { signal });
  doc.addEventListener('astro:before-swap', clearPressed, { signal });
  doc.addEventListener('astro:before-swap', carryMotionState, { signal });
  doc.addEventListener('astro:before-swap', syncMotionToggle, { signal });
  doc.addEventListener('astro:before-swap', markWipe, { signal });
  doc.addEventListener('astro:before-swap', holdArrival, { signal });
  doc.addEventListener('astro:before-swap', nameMorphTarget, { signal });
  onMotionChange(doc, skipOnMotionChange, signal);

  return {
    unbind: () => {
      ac.abort();
      clearPressed();
    },
    waitForRelease: () => pending?.release ?? Promise.resolve(),
  };
}
