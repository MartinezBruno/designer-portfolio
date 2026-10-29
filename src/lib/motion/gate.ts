import { dispatchMotionChange } from './events';

export type MotionState = 'on' | 'reduced' | 'off';

/** localStorage key for the header toggle. Its only stored value is 'reduced'; 'on' is never stored. */
export const MOTION_STORAGE_KEY = 'motion-preference';

/**
 * Resolves the motion state and writes it to `html[data-motion]`.
 * MUST stay self-contained (no imports, no outer-scope references): it is stringified
 * into the blocking inline script in BaseLayout's head via `motionGateInline`, which is why the
 * storage key appears as a literal here instead of `MOTION_STORAGE_KEY`.
 * Order: no matchMedia -> 'off' (safe default); OS reduce -> 'reduced' (wins over everything);
 * an explicit override (runtime session fallback when storage writes throw); otherwise the stored
 * choice, compared by strict equality only. The stored value is never interpolated or written.
 */
export function applyMotionGate(
  doc: Document,
  win: Window,
  override?: 'reduced' | null,
): MotionState {
  let state: MotionState = 'off';
  if (typeof win.matchMedia === 'function') {
    state = 'on';
    if (win.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      state = 'reduced';
    } else if (override !== undefined) {
      if (override === 'reduced') state = 'reduced';
    } else {
      try {
        // The property access itself throws when storage is blocked, so it sits inside the try.
        if (win.localStorage.getItem('motion-preference') === 'reduced') state = 'reduced';
      } catch {
        // Storage blocked: the OS setting decides.
      }
    }
  }
  doc.documentElement.dataset['motion'] = state;
  return state;
}

/** Build-time constant injected into the inline head script; never contains user data. */
export const motionGateInline = `(${applyMotionGate.toString()})(document, window);`;

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

// Only set when a storage write throws, so the toggle keeps working on this page.
// A later successful write clears it again.
let sessionOverride: 'reduced' | null | undefined;

export function isOsReduced(win: Window): boolean {
  return typeof win.matchMedia === 'function' && win.matchMedia(REDUCE_QUERY).matches;
}

function resolveAndNotify(doc: Document, win: Window): MotionState {
  const previous = doc.documentElement.dataset['motion'];
  const state = applyMotionGate(doc, win, sessionOverride);
  if (state !== previous) dispatchMotionChange(doc, state);
  return state;
}

/**
 * Header toggle write: stores 'reduced' or removes the key (never stores 'on'), then re-resolves.
 * The OS setting still wins (D-18). Dispatches `motion:change` only when the state changed.
 */
export function setMotionPreference(doc: Document, win: Window, reduced: boolean): MotionState {
  try {
    if (reduced) win.localStorage.setItem(MOTION_STORAGE_KEY, 'reduced');
    else win.localStorage.removeItem(MOTION_STORAGE_KEY);
    sessionOverride = undefined;
  } catch {
    sessionOverride = reduced ? 'reduced' : null;
  }
  return resolveAndNotify(doc, win);
}

/**
 * Keeps `html[data-motion]` in sync when the OS reduced-motion setting changes after load,
 * re-resolving with the stored choice (or session override) and dispatching `motion:change`,
 * so every `motion-*` variant re-evaluates live. Returns an unsubscribe function.
 * No-op without matchMedia (the gate already resolved 'off').
 */
export function syncMotionGate(doc: Document, win: Window): () => void {
  if (typeof win.matchMedia !== 'function') return () => undefined;
  const mq = win.matchMedia(REDUCE_QUERY);
  const handler = (): void => {
    resolveAndNotify(doc, win);
  };
  mq.addEventListener('change', handler);
  return () => {
    mq.removeEventListener('change', handler);
  };
}
