import type { MotionState } from './gate';

declare global {
  interface DocumentEventMap {
    'motion:change': CustomEvent<{ state: MotionState }>;
  }
}

/**
 * Subscribes to resolved motion-state changes (OS setting or header toggle). Effects pass the
 * same AbortSignal they use for their other listeners, so lifecycle cleanup removes this one.
 * Toggling never remounts the page (UI-SPEC "Live switching"): effects adapt in place.
 */
export function onMotionChange(
  doc: Document,
  cb: (state: MotionState) => void,
  signal: AbortSignal,
): void {
  doc.addEventListener(
    'motion:change',
    (event): void => {
      cb(event.detail.state);
    },
    { signal },
  );
}

/** Fired by the gate only when the resolved state actually changed. */
export function dispatchMotionChange(doc: Document, state: MotionState): void {
  doc.dispatchEvent(new CustomEvent('motion:change', { detail: { state } }));
}

/** Reads `html[data-motion]`; anything unknown (or missing) counts as 'off', the safe default. */
export function currentMotionState(doc: Document): MotionState {
  const value = doc.documentElement.dataset['motion'];
  return value === 'on' || value === 'reduced' ? value : 'off';
}
