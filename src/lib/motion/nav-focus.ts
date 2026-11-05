/**
 * Focus after soft navigation (MOTN-05, 07 D-14, Research Pattern 5). A full page load resets focus
 * to the document start; a ClientRouter swap keeps the old focus point, so keyboard and
 * screen-reader users would be stranded. After each swap focus moves to the arriving page's
 * anchor target, else its main h1, else `#main`. The h1 and `#main` carry `tabindex="-1"`, are
 * non-interactive and show no ring (global.css); any other target is given `tabindex="-1"` when
 * it cannot take focus, and if focus still does not land the chain falls through (07-11 WR-03).
 * `preventScroll` leaves scrolling to the router.
 * The same binding also moves focus for same-page anchors (07-07, bindAnchorFocus below).
 */
import { applyServicePreselect } from '../ui/service-preselect';
import { currentMotionState } from './events';

export interface NavFocusOptions {
  /** Resolves when the arriving page may take focus (a later plan holds it during the wipe). */
  waitForRelease?: () => Promise<void>;
}

function hashTarget(doc: Document, hash: string): HTMLElement | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw === '') return null;
  let id: string;
  try {
    id = decodeURIComponent(raw);
  } catch {
    return null;
  }
  // getElementById, never querySelector: the hash is untrusted text, not a selector (T-07-01).
  const element = doc.getElementById(id);
  return element instanceof HTMLElement ? element : null;
}

/** Order: decoded hash id -> `main h1` -> `#main`. */
export function pickFocusTarget(doc: Document, hash: string): HTMLElement | null {
  const fromHash = hashTarget(doc, hash);
  if (fromHash) return fromHash;
  const heading = doc.querySelector('main h1');
  if (heading instanceof HTMLElement) return heading;
  const main = doc.getElementById('main');
  return main instanceof HTMLElement ? main : null;
}

/**
 * Lets a non-interactive element take programmatic focus. Elements that are already focusable
 * (native controls, links, anything with a tabindex) are left as they are. Only the constant
 * `-1` is ever written (T-07-21).
 */
export function ensureFocusable(el: HTMLElement): HTMLElement {
  if (el.tabIndex < 0 && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  return el;
}

/**
 * Focuses `primary`, else `main h1`, else `#main`, stopping at the first one that actually becomes
 * the active element, so focus is never left on body when one of them exists (T-07-20, WR-03).
 */
export function focusWithFallback(doc: Document, primary: HTMLElement | null): void {
  const heading = doc.querySelector('main h1');
  const main = doc.getElementById('main');
  const chain = [primary, heading, main];
  for (const candidate of chain) {
    if (!(candidate instanceof HTMLElement)) continue;
    ensureFocusable(candidate).focus({ preventScroll: true });
    if (doc.activeElement === candidate) return;
  }
}

/** Upper bound on waiting for `scrollend` after a smooth glide (T-07-20: focus is never lost). */
const GLIDE_FOCUS_FALLBACK_MS = 1200;

/** Hash targets the anchor hook leaves alone: form controls and links keep their own handling. */
const SKIPPED_TARGETS = 'input, select, textarea, button, a[href]';

/**
 * Resolves true when the scroll has landed: on `scrollend`, or after the fallback (1200 ms for a
 * glide, two frames for a jump). Resolves false if `signal` aborts first. Every listener and timer
 * goes away either way, so nothing outlives one navigation.
 */
function waitForLanding(win: Window, smooth: boolean, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }
    const local = new AbortController();
    let timer = 0;
    let frame = 0;
    const finish = (landed: boolean): void => {
      if (local.signal.aborted) return;
      local.abort();
      win.clearTimeout(timer);
      win.cancelAnimationFrame(frame);
      resolve(landed);
    };
    win.addEventListener('scrollend', () => finish(true), { once: true, signal: local.signal });
    signal.addEventListener('abort', () => finish(false), { once: true, signal: local.signal });
    if (smooth) {
      timer = win.setTimeout(() => finish(true), GLIDE_FOCUS_FALLBACK_MS);
    } else {
      frame = win.requestAnimationFrame(() => {
        frame = win.requestAnimationFrame(() => finish(true));
      });
    }
  });
}

/**
 * Same-page anchors (MOTN-06, 07 D-08, UI-SPEC "Anchors and the skip link"). A capture-phase click
 * hook, so it sees the click before the ClientRouter's bubble-phase handler.
 *
 * - Same pathname and search: the router keeps its native fragment navigation, so the URL and
 *   history stay router-owned (Research Pitfall 4: Lenis anchors are off so the two never both
 *   handle one click). Under 'on' the hook sets an inline `scroll-behavior: smooth` on `html` for
 *   that one navigation: the browser's own smooth scroll glides on every pointer type and honours
 *   `scroll-padding`, and Lenis follows native scroll while idle. Never set in CSS, because the
 *   router restores history positions with scrollTo. The previous value comes back as soon as
 *   the glide starts (first scroll event), or on landing/cancel if no scroll happens, so a
 *   history traversal during the glide is restored by the router's scrollTo without a glide
 *   (WR-01, 07-20).
 * - The skip link (`data-skip-link`) never glides.
 * - Same pathname with a different `?service=` (Home "Ask about this"): handled locally, because
 *   the router would swap Home onto itself (wipe, hero replay, typed message lost). The chip is
 *   checked through the allow-list and is the source of truth for the selected service. The URL
 *   keeps its search and only the fragment changes, replaced in place with the router's own
 *   state object (no new history entry): the router decides "same page" against its private
 *   `originalLocation`, so a search rewritten behind it would make the next in-page click or the
 *   skip link swap Home onto itself (07-11 CR-01). The target is then scrolled into view.
 * - A pending landing is cancelled by `popstate` and `astro:before-preparation`, so history
 *   traversal or a new router navigation never glides or focuses the abandoned target (WR-02).
 *
 * In every case the target gets focus with preventScroll once the scroll lands. Hash text is
 * looked up with getElementById only (T-07-17). Links inside a form and hashes that point at a
 * control or link are ignored: the contact error summary keeps its own handler.
 */
interface PendingLanding {
  ac: AbortController;
  /** Inline scroll-behavior to put back, or null once restored (or never changed). */
  restore: string | null;
  target: HTMLElement;
}

function bindAnchorFocus(doc: Document, signal: AbortSignal): void {
  const html = doc.documentElement;
  // The one navigation still waiting to land, and the inline scroll-behavior to put back.
  let pending: PendingLanding | null = null;

  /**
   * Synchronous, so a superseding click reads the restored value, never our own 'smooth'.
   * A `popstate` whose location still points at the pending target is the router's own fragment
   * move for this very click (router.js dispatches one after `location.href = to.href`), so it
   * keeps the landing; any other popstate is history traversal and cancels it (WR-02).
   */
  function cancelPending(event?: Event): void {
    if (!pending) return;
    if (
      event instanceof PopStateEvent &&
      hashTarget(doc, doc.defaultView?.location.hash ?? '') === pending.target
    )
      return;
    const { ac, restore } = pending;
    pending = null;
    if (restore !== null) html.style.scrollBehavior = restore;
    ac.abort();
  }

  async function land(
    view: Window,
    target: HTMLElement,
    smooth: boolean,
    restore: string | null,
  ): Promise<void> {
    const entry: PendingLanding = { ac: new AbortController(), restore, target };
    pending = entry;
    if (restore !== null) {
      // The glide has started on the first scroll event; changing scroll-behavior does not stop
      // an in-progress smooth scroll, so the inline value goes back now (WR-01, 07-20).
      const onFirstScroll = (): void => {
        if (pending !== entry || entry.restore === null) return;
        html.style.scrollBehavior = entry.restore;
        entry.restore = null;
      };
      view.addEventListener('scroll', onFirstScroll, { once: true, signal: entry.ac.signal });
    }
    const landed = await waitForLanding(view, smooth, entry.ac.signal);
    if (pending !== entry) return; // superseded or unbound: already restored
    pending = null;
    if (entry.restore !== null) html.style.scrollBehavior = entry.restore;
    entry.ac.abort(); // no listener outlives the navigation
    if (landed) focusWithFallback(doc, target);
  }

  function onClick(event: MouseEvent): void {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!(link instanceof HTMLAnchorElement)) return;
    if ((link.target !== '' && link.target !== '_self') || link.hasAttribute('download')) return;
    if (link.closest('form') !== null) return;

    const view = doc.defaultView;
    if (!view) return;
    const here = view.location;
    let url: URL;
    try {
      url = new URL(link.href, here.href);
    } catch {
      return;
    }
    if (url.origin !== here.origin || url.pathname !== here.pathname || url.hash === '') return;
    const target = hashTarget(doc, url.hash);
    if (!target || target.matches(SKIPPED_TARGETS)) return;

    const smooth = currentMotionState(doc) === 'on' && !link.hasAttribute('data-skip-link');

    if (url.search !== here.search) {
      // Only the service links are taken over; any other search change stays the router's.
      if (!url.searchParams.has('service')) return;
      event.preventDefault();
      cancelPending();
      applyServicePreselect(doc, url.search);
      // Only the fragment changes: the search stays in step with the router (CR-01). The router's
      // own state object (index, scroll) stays, so back/forward keep working.
      const next = new URL(here.href);
      next.hash = url.hash;
      view.history.replaceState(view.history.state, '', next.href);
      target.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' });
      void land(view, target, smooth, null);
      return;
    }

    cancelPending();
    const previous = html.style.scrollBehavior;
    if (smooth) html.style.scrollBehavior = 'smooth';
    void land(view, target, smooth, smooth ? previous : null);
  }

  doc.addEventListener('click', onClick, { capture: true, signal });
  doc.defaultView?.addEventListener('popstate', cancelPending, { signal });
  doc.addEventListener('astro:before-preparation', cancelPending, { signal });
  signal.addEventListener(
    'abort',
    () => {
      cancelPending();
    },
    { once: true },
  );
}

export function bindNavFocus(doc: Document, options: NavFocusOptions = {}): () => void {
  const ac = new AbortController();
  const { signal } = ac;
  bindAnchorFocus(doc, signal);
  // astro:page-load also fires on the first load, where the browser's own focus start is right.
  let navigated = false;
  // Bumped on every swap, so a navigation released after a newer one started never focuses (WR-01).
  let navToken = 0;

  function onBeforeSwap(): void {
    navToken += 1;
  }

  function onAfterSwap(): void {
    navigated = true;
  }

  async function onPageLoad(): Promise<void> {
    if (!navigated) return;
    navigated = false;
    const mine = navToken;
    await (options.waitForRelease?.() ?? Promise.resolve());
    if (signal.aborted || mine !== navToken) return;
    focusWithFallback(doc, pickFocusTarget(doc, doc.defaultView?.location.hash ?? ''));
  }

  doc.addEventListener('astro:before-swap', onBeforeSwap, { signal });
  doc.addEventListener('astro:after-swap', onAfterSwap, { signal });
  doc.addEventListener(
    'astro:page-load',
    () => {
      void onPageLoad();
    },
    { signal },
  );

  return () => {
    ac.abort();
  };
}
