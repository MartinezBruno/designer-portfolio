import type {
  TransitionBeforePreparationEvent,
  TransitionBeforeSwapEvent,
} from 'astro:transitions/client';
import { currentMotionState } from './events';

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
 * Only constants and the narrowed live state are written into the new document (T-07-02).
 * Handlers stay named so later Phase 7 plans can extend them locally.
 */
export function bindNavigation(doc: Document): () => void {
  const ac = new AbortController();
  const { signal } = ac;

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

  doc.addEventListener('astro:before-preparation', preventOffNavigation, { signal });
  doc.addEventListener('astro:before-preparation', clearStaleWipe, { signal });
  doc.addEventListener('astro:before-swap', carryMotionState, { signal });
  doc.addEventListener('astro:before-swap', syncMotionToggle, { signal });
  doc.addEventListener('astro:before-swap', markWipe, { signal });

  return () => {
    ac.abort();
  };
}
