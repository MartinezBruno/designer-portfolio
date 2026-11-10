import type { TransitionBeforeSwapEvent } from 'astro:transitions/client';
import { interpolate } from '../../i18n/interpolate';
import { currentMotionState } from '../motion/events';
import type { Cleanup } from '../motion/lifecycle';
import { ALL_CATEGORIES, parseCategoryParam, withCategory } from '../projects/category-param';
import { sizesFor, tileSize } from '../projects/layout';

/**
 * Projects category filter (PROJ-04, PROJ-07, D-12..D-15). Native radios do the selection; this
 * module only hides cards, re-flows the grid rhythm and keeps the URL in step.
 *
 * - URL: `?category=<id>` is attacker-controllable, so every value goes through
 *   parseCategoryParam's allow-list of the radios the page actually rendered. Element ids are only
 *   ever built from allow-listed values; no URL text reaches a selector or any HTML (T-09-07).
 * - History: `history.replaceState(history.state, …)`, never a new entry (D-14a). Arrow keys check
 *   a radio per keypress, and `<ClientRouter />` owns popstate and keys its entries on
 *   `history.state` (RESEARCH Pitfall 1), so the router's state object is passed through as is.
 * - Before-swap: the router restores scroll before `astro:page-load`, so a page-load-only filter
 *   would restore a position measured on the unfiltered list (RESEARCH Pitfall 3). An app-scoped
 *   `astro:before-swap` hook filters `event.newDocument` first; the page init re-applies the same
 *   state (idempotent) and binds the change listener.
 * - Status: the live region is written only on a user change, never on load (UI-SPEC Live region).
 *   Its templates come from data-* attributes, so no dictionary is bundled.
 */

export const FILTER_ROOT = '[data-project-filter]';
export const FILTER_STATUS = '[data-project-filter-status]';
export const GRID_ITEMS = '[data-project-grid] > li[data-tile]';

const STAGGER_MS = 60;
const STAGGER_MAX_STEPS = 4;
const RISE = '0 16px';

// Works on any Document (e.g. the router's newDocument), whose elements are not instances of the
// live window's constructors, so no instanceof checks.
function isRadio(el: Element | null): el is HTMLInputElement {
  return el !== null && el.tagName === 'INPUT' && el.getAttribute('type') === 'radio';
}

function gridItems(doc: Document): HTMLElement[] {
  return [...doc.querySelectorAll<HTMLElement>(GRID_ITEMS)];
}

function matches(li: HTMLElement, id: string): boolean {
  return id === ALL_CATEGORIES || li.dataset['category'] === id;
}

/** Category values of the rendered radios (All excluded): the allow-list for the URL. */
function allowedCategories(doc: Document): string[] {
  const root = doc.querySelector(FILTER_ROOT);
  if (root === null) return [];
  const values: string[] = [];
  for (const input of root.querySelectorAll('input[name="category"]')) {
    if (isRadio(input) && input.value !== ALL_CATEGORIES) values.push(input.value);
  }
  return values;
}

/**
 * Shows the cards of `id` (All for ''), hides the rest with `hidden`, recomputes the D-18 rhythm
 * over the visible cards (`data-tile` and every `sizes`) and checks the matching radio. Touches
 * only `doc`, never window or location, so it runs on the router's arriving document too.
 * Returns the visible count.
 */
export function applyCategory(doc: Document, id: string): number {
  const items = gridItems(doc);
  const visible: HTMLElement[] = [];
  for (const li of items) {
    const show = matches(li, id);
    li.hidden = !show;
    if (show) visible.push(li);
  }
  visible.forEach((li, index) => {
    const tile = tileSize(index, visible.length);
    li.dataset['tile'] = tile;
    for (const el of li.querySelectorAll('source, img')) el.setAttribute('sizes', sizesFor[tile]);
  });
  const radio = doc.getElementById(
    id === ALL_CATEGORIES ? 'projects-filter-all' : `projects-filter-${id}`,
  );
  if (isRadio(radio)) radio.checked = true;
  return visible.length;
}

/** The live-region text for a selection, from the region's localized data-* templates. */
export function filterStatusText(
  status: HTMLElement,
  id: string,
  count: number,
  label: string,
): string {
  const name =
    id === ALL_CATEGORIES
      ? 'data-status-all'
      : count === 1
        ? 'data-status-one'
        : 'data-status-many';
  return interpolate(status.getAttribute(name) ?? '', { count, category: label });
}

function labelText(root: Element, radio: HTMLInputElement): string {
  for (const label of root.querySelectorAll('label')) {
    if (label.htmlFor === radio.id) return (label.textContent ?? '').trim();
  }
  return '';
}

/** `--t-*` token in ms from the live root, or the global.css value when it cannot be read. */
function tokenMs(view: Window, name: string, fallback: number): number {
  const raw = view.getComputedStyle(view.document.documentElement).getPropertyValue(name).trim();
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(raw);
  if (match === null) return fallback;
  const value = Number(match[1]);
  return match[2] === 's' ? value * 1000 : value;
}

function tokenEase(view: Window, name: string, fallback: string): string {
  const raw = view.getComputedStyle(view.document.documentElement).getPropertyValue(name).trim();
  return raw === '' ? fallback : raw;
}

/** Same attributes reveal.ts sets for an instant show, so the scroll shutter never replays. */
function showInstantly(li: HTMLElement): void {
  for (const target of li.querySelectorAll('[data-reveal]')) {
    target.setAttribute('data-revealed', '');
    target.setAttribute('data-reveal-instant', '');
  }
}

/**
 * Page init (PageInit, D-15): applies the URL category (cleaning an invalid one out of the URL),
 * then binds one delegated change listener. Cleanup aborts it and cancels running animations;
 * the animations use the Web Animations API, so no inline style is ever left behind.
 */
export function initCategoryFilter(doc: Document): Cleanup | undefined {
  const root = doc.querySelector(FILTER_ROOT);
  const view = doc.defaultView;
  if (root === null || view === null) return undefined;

  const initial = parseCategoryParam(view.location.search, allowedCategories(doc));
  applyCategory(doc, initial);
  if (new URLSearchParams(view.location.search).has('category')) {
    const canonical = withCategory(view.location.href, initial);
    if (canonical !== view.location.href)
      view.history.replaceState(view.history.state, '', canonical);
  }

  const ac = new AbortController();
  let running: Animation[] = [];
  let generation = 0;

  const cancelRunning = (): void => {
    for (const animation of running) animation.cancel();
    running = [];
  };

  const enter = (id: string, gen: number, leaving: readonly Animation[]): void => {
    const before = new Set(gridItems(doc).filter((li) => li.hidden));
    applyCategory(doc, id);
    // The leaving cards are hidden now, so dropping their fill shows no flash.
    for (const animation of leaving) animation.cancel();
    const visible = gridItems(doc).filter((li) => !li.hidden);
    for (const li of visible) if (before.has(li)) showInstantly(li);
    const duration = tokenMs(view, '--t-settle', 560);
    const easing = tokenEase(view, '--ease-reveal', 'cubic-bezier(0.22, 1, 0.36, 1)');
    running = visible.map((li, index) =>
      li.animate(
        [
          { opacity: 0, translate: RISE },
          { opacity: 1, translate: '0 0' },
        ],
        // backwards: hold the first frame through the stagger delay; nothing remains after.
        {
          duration,
          easing,
          delay: Math.min(index, STAGGER_MAX_STEPS) * STAGGER_MS,
          fill: 'backwards',
        },
      ),
    );
    const last = running.at(-1);
    if (last !== undefined) {
      last.onfinish = () => {
        if (gen === generation) running = [];
      };
    }
  };

  const transition = (id: string): void => {
    generation += 1;
    const gen = generation;
    const interrupted = running.length > 0;
    cancelRunning();
    const items = gridItems(doc);
    const animatable =
      currentMotionState(doc) === 'on' && items.every((li) => typeof li.animate === 'function');
    if (!animatable) {
      const before = new Set(items.filter((li) => li.hidden));
      applyCategory(doc, id);
      for (const li of items) if (!li.hidden && before.has(li)) showInstantly(li);
      return;
    }
    const leaving = items.filter((li) => !li.hidden && !matches(li, id));
    // Interruption skips the out-phase (UI-SPEC Filter motion); so does widening the selection.
    if (interrupted || leaving.length === 0) {
      enter(id, gen, []);
      return;
    }
    const duration = tokenMs(view, '--t-ui', 240);
    const easing = tokenEase(view, '--ease-soft', 'cubic-bezier(0.33, 1, 0.68, 1)');
    const out = leaving.map((li) =>
      li.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing, fill: 'forwards' }),
    );
    running = out;
    const first = out[0];
    if (first === undefined) return;
    first.onfinish = () => {
      if (gen !== generation) return;
      enter(id, gen, out);
    };
  };

  root.addEventListener(
    'change',
    (event) => {
      const radio = event.target instanceof Element ? event.target : null;
      if (!isRadio(radio) || radio.name !== 'category' || !radio.checked) return;
      const id = radio.value;
      if (id !== ALL_CATEGORIES && !allowedCategories(doc).includes(id)) return;
      transition(id);
      view.history.replaceState(view.history.state, '', withCategory(view.location.href, id));
      const status = doc.querySelector<HTMLElement>(FILTER_STATUS);
      if (status === null) return;
      const count = gridItems(doc).filter((li) => matches(li, id)).length;
      status.textContent = filterStatusText(status, id, count, labelText(root, radio));
    },
    { signal: ac.signal },
  );

  return () => {
    ac.abort();
    generation += 1;
    cancelRunning();
  };
}

let booted = false;

/**
 * App-scoped hook, bound once per session: filters the router's arriving document from its URL
 * before the swap, and the current document at once on a hard load, so the first painted frame is
 * already filtered. Returns a remover (used by tests); a second call is a no-op.
 */
export function bootCategoryFilter(doc: Document): () => void {
  if (booted) return () => undefined;
  booted = true;
  const onBeforeSwap = (event: TransitionBeforeSwapEvent): void => {
    const next = event.newDocument;
    if (next.querySelector(FILTER_ROOT) === null) return;
    applyCategory(next, parseCategoryParam(event.to.search, allowedCategories(next)));
  };
  doc.addEventListener('astro:before-swap', onBeforeSwap);
  if (doc.querySelector(FILTER_ROOT) !== null) {
    applyCategory(
      doc,
      parseCategoryParam(doc.defaultView?.location.search ?? '', allowedCategories(doc)),
    );
  }
  return () => {
    doc.removeEventListener('astro:before-swap', onBeforeSwap);
    booted = false;
  };
}
