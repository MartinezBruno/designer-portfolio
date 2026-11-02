import { currentMotionState, onMotionChange } from './events';
import type { PageInit } from './lifecycle';
import type { GsapModules } from './load-gsap';
import { eases } from './tokens';

/** Everything the follower needs from outside the DOM, injected so unit tests can drive it. */
export interface CursorDeps {
  matchMedia(query: string): MediaQueryList;
  loadGsap(): Promise<GsapModules>;
}

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const FORCED_COLORS = '(forced-colors: active)';
/** Slight lag behind the native pointer (UI-SPEC "Cursor Follower"). */
const FOLLOW_S = 0.25;

const VIEW = '[data-cursor="view"]';
const LINK = 'a[href],button,[role="button"],summary,label[for]';
/**
 * Fields keep their I-beam alone; iframes swallow pointer events, so the dot would freeze. The
 * accent pill hides it too (06-10 review): an accent dot on the accent face tinted the label, and
 * the face's own pull and hover fill already answer the pointer.
 */
const HIDE_OVER = 'input,textarea,select,iframe,[data-magnetic="pill"]';

type Zone = 'view' | 'link' | 'hide' | 'rest';

function zoneOf(target: EventTarget | null): Zone {
  if (!(target instanceof Element)) return 'rest';
  if (target.closest(HIDE_OVER)) return 'hide';
  if (target.closest(VIEW)) return 'view';
  if (target.closest(LINK)) return 'link';
  return 'rest';
}

const TEMPLATE = 'template[data-cursor-template]';
const PILL = '[data-cursor-pill]';

/** The pill label baked into a document's build-time template (the page's own locale). */
function templateLabel(doc: Document): string | undefined {
  const tpl = doc.querySelector<HTMLTemplateElement>(TEMPLATE);
  return tpl?.content.querySelector(PILL)?.textContent ?? undefined;
}

/**
 * Decorative cursor follower (MOTN-03, D-09..D-11, D-13). The layer is cloned from the build-time
 * `template[data-cursor-template]` (CursorFollower.astro), so the localized pill label never passes
 * through client code. It exists only for a fine hover pointer, `data-motion="on"` and no forced
 * colours; any of those changing at runtime mounts or removes it in place. The native cursor is
 * never hidden, and the layer is aria-hidden and pointer-events none.
 *
 * Phase 7 (07 D-05, D-17): started once at app scope, never per page. The layer lives in the
 * `[data-cursor-host]` element, which ClientRouter carries across swaps
 * (`data-astro-transition-persist`), so one layer and one set of delegated listeners on the
 * persistent document and window serve the whole session. On `astro:before-preparation` it returns
 * to rest (no View pill over a page that is leaving); on `astro:before-swap` the pill label is
 * re-read from the arriving document's template and written with `textContent` only, so an EN<->ES
 * switch never leaves stale text behind (T-07-07, T-07-08). A session started later clones the
 * template of whichever page is live.
 */
export function createCursor(deps: CursorDeps): PageInit {
  return (doc) => {
    const host = doc.querySelector<HTMLElement>('[data-cursor-host]');
    if (!host || !doc.querySelector(TEMPLATE)) return undefined;

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
      let layer: HTMLElement | undefined;
      let ctx: ReturnType<GsapModules['gsap']['context']> | undefined;

      deps
        .loadGsap()
        .then(({ gsap }) => {
          if (signal.aborted) return;
          // Re-read at session start: after a swap the live page's template carries its locale.
          const template = doc.querySelector<HTMLTemplateElement>(TEMPLATE);
          if (!template) return;
          const fragment = template.content.cloneNode(true) as DocumentFragment;
          const root = fragment.querySelector<HTMLElement>('[data-cursor-layer]');
          const pos = root?.querySelector<HTMLElement>('[data-cursor-pos]');
          if (!root || !pos) return;
          layer = root;
          const el = root;

          let moved = false;
          let outside = false;
          let overHidden = false;
          const syncHidden = (): void => {
            el.toggleAttribute('data-hidden', !moved || outside || overHidden);
          };
          const enter = (zone: Zone): void => {
            overHidden = zone === 'hide';
            if (zone === 'view' || zone === 'link') el.dataset['state'] = zone;
            else delete el.dataset['state'];
            syncHidden();
          };

          let xTo: ((value: number, start?: number) => unknown) | undefined;
          let yTo: ((value: number, start?: number) => unknown) | undefined;
          ctx = gsap.context(() => undefined);
          ctx.add(() => {
            const vars = { duration: FOLLOW_S, ease: eases.soft };
            xTo = gsap.quickTo(pos, 'x', vars);
            yTo = gsap.quickTo(pos, 'y', vars);
          });

          // Attribute writes and tween targets only: no layout reads in here.
          const onMove = (event: PointerEvent): void => {
            if (event.pointerType === 'touch') return;
            const x = event.clientX;
            const y = event.clientY;
            if (moved) {
              xTo?.(x);
              yTo?.(y);
            } else {
              // First sighting: jump there instead of sliding in from the corner.
              moved = true;
              xTo?.(x, x);
              yTo?.(y, y);
            }
            if (outside) outside = false;
            syncHidden();
          };

          host.append(fragment);
          // Every listener sits on the persistent document, root or window (delegation), so it
          // keeps working after the router replaces the body.
          doc.addEventListener('pointermove', onMove, { passive: true, signal });
          doc.addEventListener(
            'astro:before-preparation',
            () => {
              // Rest state: no View pill or link ring over a page that is leaving.
              enter('rest');
            },
            { signal },
          );
          doc.addEventListener(
            'astro:before-swap',
            (event) => {
              const label = templateLabel(event.newDocument);
              const pill = el.querySelector(PILL);
              if (label !== undefined && pill && pill.textContent !== label) {
                pill.textContent = label;
              }
            },
            { signal },
          );
          doc.addEventListener(
            'pointerover',
            (event) => {
              enter(zoneOf(event.target));
            },
            { passive: true, signal },
          );
          doc.addEventListener(
            'pointerout',
            (event) => {
              enter(zoneOf(event.relatedTarget));
            },
            { passive: true, signal },
          );
          doc.documentElement.addEventListener(
            'pointerleave',
            () => {
              outside = true;
              syncHidden();
            },
            { signal },
          );
          win?.addEventListener(
            'blur',
            () => {
              outside = true;
              syncHidden();
            },
            { signal },
          );
        })
        .catch(() => {
          // GSAP chunk failed: no follower. Nothing was attached or appended.
        });

      return () => {
        session.abort();
        ctx?.revert();
        layer?.remove();
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
