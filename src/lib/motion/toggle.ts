import { currentMotionState, onMotionChange } from './events';
import { isOsReduced, setMotionPreference } from './gate';
import type { Cleanup } from './lifecycle';

const HINT_ID = 'motion-toggle-hint';
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Header motion toggle (MOTN-08, D-15..D-18). Pressing it switches `data-motion` between 'on' and
 * 'reduced' live and persists the choice; the `motion:change` event lets effects adapt in place.
 * It never remounts the lifecycle (UI-SPEC "Live switching"): a remount would wipe a half-typed
 * contact message. When the OS already reduces motion the button stays focusable but locked
 * (`aria-disabled`, hint via `aria-describedby`) because the toggle can only reduce (D-18).
 */
export function initMotionToggle(doc: Document): Cleanup | undefined {
  const button = doc.querySelector<HTMLButtonElement>('[data-motion-toggle]');
  const win = doc.defaultView;
  if (!button || !win) return undefined;
  const root = button.closest<HTMLElement>('[data-motion-toggle-root]') ?? button;

  const ac = new AbortController();
  const { signal } = ac;

  const sync = (): void => {
    button.setAttribute('aria-pressed', String(currentMotionState(doc) === 'reduced'));
    const locked = isOsReduced(win);
    if (locked) {
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('aria-describedby', HINT_ID);
    } else {
      button.removeAttribute('aria-disabled');
      button.removeAttribute('aria-describedby');
    }
    root.toggleAttribute('data-locked', locked);
  };

  button.addEventListener(
    'click',
    () => {
      if (button.getAttribute('aria-disabled') === 'true') return;
      setMotionPreference(doc, win, button.getAttribute('aria-pressed') !== 'true');
      sync();
    },
    { signal },
  );

  onMotionChange(doc, sync, signal);
  // The lock follows the OS setting even when the resolved state does not change (a stored
  // 'reduced' choice keeps data-motion 'reduced', so no motion:change fires on unlock).
  if (typeof win.matchMedia === 'function') {
    win.matchMedia(REDUCE_QUERY).addEventListener('change', sync, { signal });
  }

  // Esc hides the tooltip while focus stays (WCAG 1.4.13); leaving clears the dismissal.
  button.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') root.setAttribute('data-dismissed', '');
    },
    { signal },
  );
  const undismiss = (): void => {
    root.removeAttribute('data-dismissed');
  };
  button.addEventListener('blur', undismiss, { signal });
  root.addEventListener('pointerleave', undismiss, { signal });

  sync();

  return () => {
    ac.abort();
  };
}
