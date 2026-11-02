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
 * Only constants and the narrowed live state are written into the new document (T-07-02).
 * Handlers stay named so later Phase 7 plans can extend them locally.
 */

/** Hard cap after the swap: a stalled transition must never strand held content (T-07-10). */
export const RELEASE_CAP_MS = 1200;

export interface NavigationDeps {
  setTimeout?: (cb: () => void, ms: number) => number;
  clearTimeout?: (id: number) => void;
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
  const holdMs = Math.round(durations.wipe * wipeRelease * 1000);

  let pending: PendingTransition | undefined;

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
    event.newDocument.documentElement.dataset['wipe'] = 'out';
    // `viewTransition` is typed as always present, but fake events in tests may omit it.
    const transition: ViewTransition | undefined = event.viewTransition;
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
  }

  function skipOnMotionChange(state: MotionState): void {
    if (state !== 'on') pending?.transition.skipTransition();
  }

  doc.addEventListener('astro:before-preparation', preventOffNavigation, { signal });
  doc.addEventListener('astro:before-preparation', clearStaleWipe, { signal });
  doc.addEventListener('astro:before-swap', carryMotionState, { signal });
  doc.addEventListener('astro:before-swap', syncMotionToggle, { signal });
  doc.addEventListener('astro:before-swap', markWipe, { signal });
  doc.addEventListener('astro:before-swap', holdArrival, { signal });
  onMotionChange(doc, skipOnMotionChange, signal);

  return {
    unbind: () => {
      ac.abort();
    },
    waitForRelease: () => pending?.release ?? Promise.resolve(),
  };
}
