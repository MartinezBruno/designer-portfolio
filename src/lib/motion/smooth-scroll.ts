import { currentMotionState, onMotionChange } from './events';
import type { PageInit } from './lifecycle';
import type { LenisCtor } from './load-lenis';

/** Everything smooth scroll needs from outside the DOM, injected so unit tests can drive it. */
export interface SmoothScrollDeps {
  matchMedia(query: string): MediaQueryList;
  loadLenis(): Promise<LenisCtor>;
}

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const FORCED_COLORS = '(forced-colors: active)';

/**
 * Lenis options (UI-SPEC "Smooth Scroll"). lerp 0.12 is a light glide that catches up within a few
 * frames; tune only inside 0.10-0.14. Touch keeps native momentum (syncTouch false). anchors stays
 * false so the router and the 07-07 anchor handler own hash links (Research Pitfall 4).
 */
const LENIS_OPTIONS = {
  lerp: 0.12,
  smoothWheel: true,
  syncTouch: false,
  wheelMultiplier: 1,
  anchors: false,
  stopInertiaOnNavigate: true,
  autoRaf: true,
} as const;

/**
 * Inertial wheel and trackpad scrolling (MOTN-06, 07 D-06, D-07, D-15, D-18; UI-SPEC Smooth
 * Scroll; Research Pattern 6, Pitfall 4 (Lenis anchors off)).
 *
 * Page-scoped: the lifecycle mounts it on astro:page-load, after the router has restored the scroll
 * position, and Lenis starts from the current native position, so back/forward never jumps. It is
 * destroyed on astro:before-swap. It exists only for a fine hover pointer, `data-motion="on"` and no
 * forced colours; any of those changing at runtime destroys or re-creates it in place, with no
 * reload. Lenis never intercepts keys, so keyboard scrolling, find-in-page and Tab stay native.
 * `scroll-behavior: smooth` is never set: the router restores history with scrollTo (Pattern 5).
 */
export function createSmoothScroll(deps: SmoothScrollDeps): PageInit {
  return (doc) => {
    if (!doc.defaultView) return undefined;

    const ac = new AbortController();
    const fine = deps.matchMedia(FINE_POINTER);
    const forced = deps.matchMedia(FORCED_COLORS);
    let stopSession: (() => void) | undefined;

    const allowed = (): boolean =>
      fine.matches && !forced.matches && currentMotionState(doc) === 'on';

    const startSession = (): (() => void) => {
      const session = new AbortController();
      const { signal } = session;
      let lenis: InstanceType<LenisCtor> | undefined;

      deps
        .loadLenis()
        .then((Lenis) => {
          if (signal.aborted) return;
          lenis = new Lenis({ ...LENIS_OPTIONS });
        })
        .catch(() => {
          // Lenis chunk failed: native scrolling stays. Nothing was created.
        });

      return () => {
        session.abort();
        lenis?.destroy();
        lenis = undefined;
      };
    };

    const sync = (): void => {
      if (allowed()) {
        stopSession ??= startSession();
      } else if (stopSession) {
        stopSession();
        stopSession = undefined;
      }
    };

    fine.addEventListener('change', sync, { signal: ac.signal });
    forced.addEventListener('change', sync, { signal: ac.signal });
    onMotionChange(doc, sync, ac.signal);
    sync();

    return () => {
      ac.abort();
      stopSession?.();
      stopSession = undefined;
    };
  };
}
