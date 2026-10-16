export type MotionState = 'on' | 'off';

/**
 * Resolves whether motion is allowed and writes it to `html[data-motion]`.
 * MUST stay self-contained (no imports, no outer-scope references): it is stringified
 * into the blocking inline script in BaseLayout's head via `motionGateInline`.
 * Safe default: without matchMedia the state is 'off'.
 * Phase 6 (MOTN-08) may add an optional stored-override parameter; nothing is read from storage here.
 */
export function applyMotionGate(doc: Document, win: Window): MotionState {
  const canQuery = typeof win.matchMedia === 'function';
  const reduce = canQuery && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state: MotionState = canQuery && !reduce ? 'on' : 'off';
  doc.documentElement.dataset['motion'] = state;
  return state;
}

/** Build-time constant injected into the inline head script; never contains user data. */
export const motionGateInline = `(${applyMotionGate.toString()})(document, window);`;

export function onMotionPreferenceChange(
  win: Window,
  cb: (state: MotionState) => void,
): () => void {
  const mq = win.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = (): void => {
    cb(mq.matches ? 'off' : 'on');
  };
  mq.addEventListener('change', handler);
  return () => {
    mq.removeEventListener('change', handler);
  };
}
