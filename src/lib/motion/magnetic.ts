import { currentMotionState, onMotionChange } from './events';
import type { PageInit } from './lifecycle';
import type { GsapModules } from './load-gsap';
import { eases } from './tokens';

/**
 * Everything the magnetic effect needs from outside the DOM, injected so unit tests can drive the
 * media queries, the GSAP load and the layout observer.
 */
export interface MagneticDeps {
  matchMedia(query: string): MediaQueryList;
  loadGsap(): Promise<GsapModules>;
  /** Defaults to the browser ResizeObserver (absent in some test environments). */
  createResizeObserver?: (cb: () => void) => Pick<ResizeObserver, 'observe' | 'disconnect'>;
}

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const FORCED_COLORS = '(forced-colors: active)';
/** Activation zone: the shell's box plus this margin on every side (UI-SPEC "Magnetic Targets"). */
const ZONE_PX = 24;
const PULL = 0.3;
const CAPS = { pill: 8, link: 6 } as const;
/** quickTo follow; the release reuses the same setters, so it eases out the same way. */
const FOLLOW_S = 0.3;
const REMEASURE_DEBOUNCE_MS = 150;

const clamp = (value: number, cap: number): number => Math.min(cap, Math.max(-cap, value)) + 0;

/**
 * Face offset for a pointer near a shell (pure). Null when the pointer is more than 24px outside the
 * box on any side; otherwise (pointer - centre) x 0.3, each axis clamped to [-cap, cap].
 */
export function magneticOffset(pointer: Point, rect: Box, cap: number): Point | null {
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  if (
    pointer.x < rect.left - ZONE_PX ||
    pointer.x > right + ZONE_PX ||
    pointer.y < rect.top - ZONE_PX ||
    pointer.y > bottom + ZONE_PX
  ) {
    return null;
  }
  return {
    x: clamp((pointer.x - (rect.left + rect.width / 2)) * PULL, cap),
    y: clamp((pointer.y - (rect.top + rect.height / 2)) * PULL, cap),
  };
}

interface Target {
  shell: HTMLElement;
  face: HTMLElement;
  cap: number;
  rect: Box;
  active: boolean;
  xTo?: (value: number) => unknown;
  yTo?: (value: number) => unknown;
}

/**
 * Magnetic pull (MOTN-03, D-12, D-13). Markup: `[data-magnetic="pill"|"link"]` shell holding one
 * `[data-magnetic-face]`. The shell owns the hit area and focus outline and never moves; only the
 * face is translated by GSAP. Runs only for a fine hover pointer, `data-motion="on"` and no forced
 * colours; any of those changing at runtime attaches or detaches in place. Keyboard focus never
 * moves anything.
 */
export function createMagnetic(deps: MagneticDeps): PageInit {
  return (doc) => {
    const shells = [...doc.querySelectorAll<HTMLElement>('[data-magnetic]')];
    const targets: Target[] = [];
    for (const shell of shells) {
      const face = shell.querySelector<HTMLElement>('[data-magnetic-face]');
      if (!face) continue;
      const cap = shell.dataset['magnetic'] === 'pill' ? CAPS.pill : CAPS.link;
      targets.push({
        shell,
        face,
        cap,
        rect: { left: 0, top: 0, width: 0, height: 0 },
        active: false,
      });
    }
    if (targets.length === 0) return undefined;

    const win = doc.defaultView;
    const ac = new AbortController();
    const fine = deps.matchMedia(FINE_POINTER);
    const forced = deps.matchMedia(FORCED_COLORS);
    let stopSession: (() => void) | undefined;

    const allowed = (): boolean =>
      fine.matches && !forced.matches && currentMotionState(doc) === 'on';

    const startSession = (): (() => void) => {
      const session = new AbortController();
      const { signal } = session;
      let gsapApi: GsapModules['gsap'] | undefined;
      let ctx: ReturnType<GsapModules['gsap']['context']> | undefined;
      let observer: Pick<ResizeObserver, 'observe' | 'disconnect'> | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;

      // Page-relative rects, so scrolling never stales them; read only outside the move handler.
      const measure = (): void => {
        const sx = win?.scrollX ?? 0;
        const sy = win?.scrollY ?? 0;
        for (const t of targets) {
          const r = t.shell.getBoundingClientRect();
          t.rect = { left: r.left + sx, top: r.top + sy, width: r.width, height: r.height };
        }
      };
      const remeasureSoon = (): void => {
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(measure, REMEASURE_DEBOUNCE_MS);
      };
      // A reveal or hero transform on an ancestor moves the shell without changing layout, so no
      // resize or ResizeObserver callback fires. Remeasure once that transform settles (06 review
      // CR-01), but only for transitions and animations on an element holding a shell.
      const onSettle = (event: Event): void => {
        const source = event.target;
        if (!(source instanceof Element)) return;
        if (targets.some((t) => source.contains(t.shell))) remeasureSoon();
      };

      const release = (t: Target): void => {
        if (!t.active) return;
        t.active = false;
        t.xTo?.(0);
        t.yTo?.(0);
      };

      const onMove = (event: PointerEvent): void => {
        if (event.pointerType === 'touch') return;
        const pointer = { x: event.pageX, y: event.pageY };
        for (const t of targets) {
          const offset = magneticOffset(pointer, t.rect, t.cap);
          if (offset === null) {
            release(t);
            continue;
          }
          t.active = true;
          t.xTo?.(offset.x);
          t.yTo?.(offset.y);
        }
      };

      deps
        .loadGsap()
        .then(({ gsap }) => {
          if (signal.aborted) return;
          gsapApi = gsap;
          ctx = gsap.context(() => undefined);
          ctx.add(() => {
            for (const t of targets) {
              const vars = { duration: FOLLOW_S, ease: eases.soft };
              t.xTo = gsap.quickTo(t.face, 'x', vars);
              t.yTo = gsap.quickTo(t.face, 'y', vars);
            }
          });
          measure();
          doc.addEventListener('pointermove', onMove, { passive: true, signal });
          doc.documentElement.addEventListener(
            'pointerleave',
            () => {
              targets.forEach(release);
            },
            { signal },
          );
          for (const type of ['transitionend', 'transitioncancel', 'animationend']) {
            doc.addEventListener(type, onSettle, { passive: true, signal });
          }
          win?.addEventListener('resize', measure, { passive: true, signal });
          win?.addEventListener('load', measure, { signal });
          void doc.fonts?.ready.then(() => {
            if (!signal.aborted) measure();
          });
          const createObserver =
            deps.createResizeObserver ??
            (win?.ResizeObserver ? (cb: () => void) => new ResizeObserver(cb) : undefined);
          observer = createObserver?.(remeasureSoon);
          observer?.observe(doc.body);
        })
        .catch(() => {
          // GSAP chunk failed: the controls simply stay still. Nothing was attached.
        });

      return () => {
        session.abort();
        observer?.disconnect();
        if (timer !== undefined) clearTimeout(timer);
        ctx?.revert();
        gsapApi?.set(
          targets.map((t) => t.face),
          { x: 0, y: 0 },
        );
        for (const t of targets) {
          t.active = false;
          delete t.xTo;
          delete t.yTo;
        }
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
