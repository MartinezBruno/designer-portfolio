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
 * Only constants and the narrowed live state are written into the new document (T-07-02).
 * Handlers stay named so later Phase 7 plans can extend them locally.
 */
export function bindNavigation(doc: Document): () => void {
  const ac = new AbortController();
  const { signal } = ac;

  function preventOffNavigation(event: TransitionBeforePreparationEvent): void {
    if (currentMotionState(doc) === 'off') event.preventDefault();
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
  doc.addEventListener('astro:before-swap', carryMotionState, { signal });
  doc.addEventListener('astro:before-swap', syncMotionToggle, { signal });

  return () => {
    ac.abort();
  };
}
