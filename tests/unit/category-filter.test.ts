// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLifecycle } from '../../src/lib/motion/lifecycle';
import { sizesFor, type TileSize } from '../../src/lib/projects/layout';
import {
  applyCategory,
  bootCategoryFilter,
  filterStatusText,
  FILTER_ROOT,
  initCategoryFilter,
} from '../../src/lib/ui/category-filter';

const CATEGORIES: ReadonlyArray<readonly [string, string]> = [
  ['graphic-design', 'Graphic design'],
  ['web-design', 'Web design'],
  ['branding', 'Branding'],
  ['social-media', 'Social media'],
];

// D-17 order, newest first: web-design sits at positions 2, 3 and 6.
const CARDS = [
  'social-media',
  'graphic-design',
  'web-design',
  'web-design',
  'graphic-design',
  'branding',
  'web-design',
];
const RHYTHM_7: readonly TileSize[] = [
  'large',
  'small',
  'small',
  'large',
  'large',
  'small',
  'large-end',
];

function fixture(): string {
  const radios = [
    `<input type="radio" name="category" id="projects-filter-all" value="" checked><label for="projects-filter-all">All</label>`,
    ...CATEGORIES.map(
      ([id, title]) =>
        `<input type="radio" name="category" id="projects-filter-${id}" value="${id}"><label for="projects-filter-${id}"> ${title} </label>`,
    ),
  ].join('');
  const status = `<p role="status" class="sr-only" data-project-filter-status data-status-all="Showing all {count} projects" data-status-one="Showing 1 project in {category}" data-status-many="Showing {count} projects in {category}"></p>`;
  const items = CARDS.map(
    (category, index) =>
      `<li data-tile="${RHYTHM_7[index] ?? 'large'}" data-category="${category}"><a href="/projects/p${String(index)}/"><picture><source type="image/webp" sizes="${sizesFor[RHYTHM_7[index] ?? 'large']}"><img alt="" sizes="${sizesFor[RHYTHM_7[index] ?? 'large']}"></picture><div data-reveal="shutter"></div></a></li>`,
  ).join('');
  return `<fieldset data-project-filter><legend>Filter</legend>${radios}</fieldset>${status}<ul data-project-grid>${items}</ul>`;
}

function setSearch(search: string): void {
  window.history.replaceState(null, '', `/projects/${search}`);
}

function items(doc: Document = document): HTMLElement[] {
  return [...doc.querySelectorAll<HTMLElement>('[data-project-grid] > li')];
}

function visible(doc: Document = document): HTMLElement[] {
  return items(doc).filter((li) => !li.hidden);
}

function radio(id: string, doc: Document = document): HTMLInputElement {
  const el = doc.getElementById(`projects-filter-${id}`);
  if (!(el instanceof HTMLInputElement)) throw new Error(`fixture radio ${id} missing`);
  return el;
}

function status(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-project-filter-status]');
  if (el === null) throw new Error('fixture status missing');
  return el;
}

function choose(id: string): void {
  const el = radio(id);
  el.checked = true;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function expectTiles(list: readonly HTMLElement[], tiles: readonly TileSize[]): void {
  expect(list.map((li) => li.dataset['tile'])).toEqual(tiles);
  list.forEach((li, index) => {
    const expected = sizesFor[tiles[index] ?? 'large'];
    for (const el of li.querySelectorAll('source, img')) {
      expect(el.getAttribute('sizes')).toBe(expected);
    }
  });
}

interface FakeAnimation {
  el: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  onfinish: (() => void) | null;
  cancelled: boolean;
  cancel: () => void;
  finish: () => void;
}

let animations: FakeAnimation[] = [];
const realAnimate = HTMLElement.prototype.animate;

function fakeAnimate(): void {
  HTMLElement.prototype.animate = function animate(
    this: Element,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ): Animation {
    const animation: FakeAnimation = {
      el: this,
      keyframes,
      options,
      onfinish: null,
      cancelled: false,
      cancel() {
        animation.cancelled = true;
      },
      finish() {
        animation.onfinish?.();
      },
    };
    animations.push(animation);
    return animation as unknown as Animation;
  } as unknown as typeof HTMLElement.prototype.animate;
}

function setMotion(state: 'on' | 'reduced' | 'off'): void {
  document.documentElement.dataset['motion'] = state;
}

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-motion');
  window.history.replaceState(null, '', '/');
  HTMLElement.prototype.animate = realAnimate;
  animations = [];
  vi.restoreAllMocks();
});

describe('applyCategory', () => {
  beforeEach(() => {
    document.body.innerHTML = fixture();
  });

  it('hides non-matching cards, re-flows the rhythm and checks the radio', () => {
    expect(applyCategory(document, 'web-design')).toBe(3);
    const hidden = items().filter((li) => li.hidden);
    expect(hidden).toHaveLength(4);
    expect(hidden.every((li) => li.dataset['category'] !== 'web-design')).toBe(true);
    expect(visible().map((li) => li.dataset['category'])).toEqual([
      'web-design',
      'web-design',
      'web-design',
    ]);
    expectTiles(visible(), ['large', 'small', 'large-end']);
    expect(radio('web-design').checked).toBe(true);
    expect(radio('all').checked).toBe(false);
  });

  it('restores every card and the 7-card rhythm for All', () => {
    applyCategory(document, 'branding');
    expect(applyCategory(document, '')).toBe(7);
    expect(items().some((li) => li.hidden)).toBe(false);
    expectTiles(visible(), RHYTHM_7);
    expect(radio('all').checked).toBe(true);
  });

  it('works on a detached document without touching the live one', () => {
    const next = document.implementation.createHTMLDocument('next');
    next.body.innerHTML = fixture();
    expect(applyCategory(next, 'branding')).toBe(1);
    expect(visible(next).map((li) => li.dataset['tile'])).toEqual(['large']);
    expect(next.querySelector<HTMLInputElement>('#projects-filter-branding')?.checked).toBe(true);
    expect(items().some((li) => li.hidden)).toBe(false);
  });

  it('does nothing harmful without a grid', () => {
    document.body.innerHTML = '<p>nothing</p>';
    expect(applyCategory(document, 'branding')).toBe(0);
  });
});

describe('filterStatusText', () => {
  beforeEach(() => {
    document.body.innerHTML = fixture();
  });

  it.each([
    ['', 7, 'All', 'Showing all 7 projects'],
    ['web-design', 3, 'Web design', 'Showing 3 projects in Web design'],
    ['branding', 1, 'Branding', 'Showing 1 project in Branding'],
  ])('%j with %i cards reads %j', (id, count, label, expected) => {
    expect(filterStatusText(status(), id, count, label)).toBe(expected);
  });
});

describe('initCategoryFilter', () => {
  it('returns undefined without the filter', () => {
    document.body.innerHTML = '<p>nothing</p>';
    setSearch('?category=branding');
    expect(initCategoryFilter(document)).toBeUndefined();
  });

  it('applies the URL category on init without announcing it', () => {
    document.body.innerHTML = fixture();
    setSearch('?category=web-design');
    const cleanup = initCategoryFilter(document);
    expect(visible()).toHaveLength(3);
    expect(radio('web-design').checked).toBe(true);
    expect(status().textContent).toBe('');
    expect(window.location.search).toBe('?category=web-design');
    cleanup?.();
  });

  it('removes an invalid category from the URL on init, keeping other params and the hash', () => {
    document.body.innerHTML = fixture();
    window.history.replaceState(null, '', '/projects/?a=1&category=bogus#main');
    const length = window.history.length;
    const cleanup = initCategoryFilter(document);
    expect(window.location.search).toBe('?a=1');
    expect(window.location.hash).toBe('#main');
    expect(window.history.length).toBe(length);
    expect(items().some((li) => li.hidden)).toBe(false);
    cleanup?.();
  });

  it('filters, writes the URL with replaceState and announces once on a user change', () => {
    document.body.innerHTML = fixture();
    setSearch('');
    window.history.replaceState({ index: 3 }, '', window.location.href);
    const writes: string[] = [];
    const el = status();
    Object.defineProperty(el, 'textContent', {
      configurable: true,
      get: () => writes.at(-1) ?? '',
      set: (value: string) => {
        writes.push(value);
      },
    });
    const length = window.history.length;
    const cleanup = initCategoryFilter(document);
    expect(writes).toEqual([]);

    choose('branding');
    expect(visible().map((li) => li.dataset['category'])).toEqual(['branding']);
    expect(window.location.search).toBe('?category=branding');
    expect(window.history.length).toBe(length);
    expect(window.history.state).toEqual({ index: 3 });
    expect(writes).toEqual(['Showing 1 project in Branding']);

    choose('web-design');
    expect(writes.at(-1)).toBe('Showing 3 projects in Web design');

    choose('all');
    expect(window.location.search).toBe('');
    expect(items().some((li) => li.hidden)).toBe(false);
    expect(writes.at(-1)).toBe('Showing all 7 projects');
    expect(writes).toHaveLength(3);
    cleanup?.();
  });

  it('shows newly visible cards instantly so the scroll reveal never replays', () => {
    document.body.innerHTML = fixture();
    setSearch('?category=branding');
    const cleanup = initCategoryFilter(document);
    const branding = items().find((li) => li.dataset['category'] === 'branding');
    choose('web-design');
    for (const li of visible()) {
      const target = li.querySelector('[data-reveal]');
      expect(target?.hasAttribute('data-revealed')).toBe(true);
      expect(target?.hasAttribute('data-reveal-instant')).toBe(true);
    }
    expect(branding?.querySelector('[data-reveal]')?.hasAttribute('data-revealed')).toBe(false);
    cleanup?.();
  });

  it('also shows cards that stayed visible but were never revealed (09-07 e2e)', () => {
    // A card below the fold under All is still waiting for its scroll reveal; the filter can move
    // it into view, where a late reveal fade would follow the instant change (UI-SPEC: no card
    // left at opacity < 1, no reveal on top of the filter).
    document.body.innerHTML = fixture();
    setMotion('reduced');
    setSearch('');
    const cleanup = initCategoryFilter(document);
    choose('web-design');
    for (const li of visible()) {
      const target = li.querySelector('[data-reveal]');
      expect(target?.hasAttribute('data-revealed')).toBe(true);
      expect(target?.hasAttribute('data-reveal-instant')).toBe(true);
    }
    cleanup?.();
  });

  it('applies in the same task with no animation under reduced motion', () => {
    document.body.innerHTML = fixture();
    setMotion('reduced');
    setSearch('');
    const spy = vi.spyOn(HTMLElement.prototype, 'animate');
    const cleanup = initCategoryFilter(document);
    choose('web-design');
    expect(visible()).toHaveLength(3);
    expect(spy).not.toHaveBeenCalled();
    cleanup?.();
  });

  it('falls back to an instant change when animate() is unavailable', () => {
    document.body.innerHTML = fixture();
    setMotion('on');
    setSearch('');
    // @ts-expect-error simulating a browser without the Web Animations API
    HTMLElement.prototype.animate = undefined;
    const cleanup = initCategoryFilter(document);
    choose('web-design');
    expect(visible()).toHaveLength(3);
    cleanup?.();
  });

  it('fades leaving cards out, then swaps and staggers the visible cards in', () => {
    document.body.innerHTML = fixture();
    setMotion('on');
    setSearch('');
    fakeAnimate();
    const cleanup = initCategoryFilter(document);
    choose('web-design');

    const out = [...animations];
    expect(out).toHaveLength(4);
    expect(
      out.every((a) => a.el instanceof HTMLElement && a.el.dataset['category'] !== 'web-design'),
    ).toBe(true);
    expect(out[0]?.keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    expect(out[0]?.options.duration).toBe(240);
    // Nothing is hidden until the out-phase ends.
    expect(visible()).toHaveLength(7);

    out[0]?.finish();
    expect(visible()).toHaveLength(3);
    expect(out.every((a) => a.cancelled)).toBe(true);
    expectTiles(visible(), ['large', 'small', 'large-end']);

    const inPhase = animations.slice(4);
    expect(inPhase.map((a) => a.el)).toEqual(visible());
    expect(inPhase.map((a) => a.options.delay)).toEqual([0, 60, 120]);
    expect(inPhase[0]?.options.duration).toBe(560);
    expect(inPhase[0]?.keyframes).toEqual([
      { opacity: 0, translate: '0 16px' },
      { opacity: 1, translate: '0 0' },
    ]);
    expect(items().some((li) => li.hasAttribute('style'))).toBe(false);
    cleanup?.();
  });

  it('caps the entrance stagger at 4 steps', () => {
    document.body.innerHTML = fixture();
    setMotion('on');
    setSearch('?category=branding');
    fakeAnimate();
    const cleanup = initCategoryFilter(document);
    choose('all');
    // Nothing leaves when widening to All: the in-phase starts at once.
    expect(animations.map((a) => a.options.delay)).toEqual([0, 60, 120, 180, 240, 240, 240]);
    cleanup?.();
  });

  it('skips the out-phase when a new selection interrupts a running one', () => {
    document.body.innerHTML = fixture();
    setMotion('on');
    setSearch('');
    fakeAnimate();
    const cleanup = initCategoryFilter(document);
    choose('web-design');
    const firstOut = [...animations];
    choose('branding');
    expect(firstOut.every((a) => a.cancelled)).toBe(true);
    expect(visible().map((li) => li.dataset['category'])).toEqual(['branding']);
    // A late finish of the cancelled phase must not re-apply the old selection.
    firstOut[0]?.finish();
    expect(visible().map((li) => li.dataset['category'])).toEqual(['branding']);
    cleanup?.();
  });

  it('cancels running animations on cleanup', () => {
    document.body.innerHTML = fixture();
    setMotion('on');
    setSearch('');
    fakeAnimate();
    const cleanup = initCategoryFilter(document);
    choose('web-design');
    cleanup?.();
    expect(animations.length).toBeGreaterThan(0);
    expect(animations.every((a) => a.cancelled)).toBe(true);
  });

  it('stops listening after lifecycle unmount and binds one listener per mount', () => {
    document.body.innerHTML = fixture();
    setSearch('');
    const lifecycle = createLifecycle(document, (err) => {
      throw err;
    });
    lifecycle.register(initCategoryFilter);
    lifecycle.mount();
    for (let i = 0; i < 5; i += 1) {
      lifecycle.unmount();
      lifecycle.mount();
    }
    const spy = vi.spyOn(window.history, 'replaceState');
    choose('branding');
    expect(spy).toHaveBeenCalledTimes(1);

    lifecycle.unmount();
    expect(lifecycle.activeCleanups).toBe(0);
    choose('web-design');
    expect(visible().map((li) => li.dataset['category'])).toEqual(['branding']);
    expect(window.location.search).toBe('?category=branding');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('bootCategoryFilter', () => {
  function beforeSwap(next: Document, to: string): void {
    const event = Object.assign(new Event('astro:before-swap'), {
      newDocument: next,
      to: new URL(to, window.location.origin),
    });
    document.dispatchEvent(event);
  }

  it('filters the arriving document before the swap', () => {
    const remove = bootCategoryFilter(document);
    const next = document.implementation.createHTMLDocument('next');
    next.body.innerHTML = fixture();
    beforeSwap(next, '/projects/?category=branding');
    expect(visible(next).map((li) => li.dataset['category'])).toEqual(['branding']);
    expect(next.querySelector<HTMLInputElement>('#projects-filter-branding')?.checked).toBe(true);
    remove();
  });

  it('leaves an arriving document without the filter untouched', () => {
    const remove = bootCategoryFilter(document);
    const next = document.implementation.createHTMLDocument('next');
    next.body.innerHTML =
      '<ul data-project-grid><li data-tile="large" data-category="x"></li></ul>';
    const before = next.body.innerHTML;
    beforeSwap(next, '/projects/?category=x');
    expect(next.body.innerHTML).toBe(before);
    remove();
  });

  it('applies the current URL on a hard load', () => {
    document.body.innerHTML = fixture();
    setSearch('?category=web-design');
    const remove = bootCategoryFilter(document);
    expect(visible()).toHaveLength(3);
    remove();
  });

  it('binds once per session', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = bootCategoryFilter(document);
    const again = bootCategoryFilter(document);
    expect(add.mock.calls.filter(([type]) => type === 'astro:before-swap')).toHaveLength(1);
    again();
    remove();
  });

  it('exposes the filter root selector', () => {
    expect(FILTER_ROOT).toBe('[data-project-filter]');
  });
});

describe('category-filter module', () => {
  it('keeps its imports small and never uses pushState or innerHTML', () => {
    const source = readFileSync(resolve('src/lib/ui/category-filter.ts'), 'utf8');
    const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]).sort();
    expect(imports).toEqual(
      [
        '../../i18n/interpolate',
        '../motion/events',
        '../motion/lifecycle',
        '../projects/category-param',
        '../projects/layout',
        'astro:transitions/client',
      ].sort(),
    );
    expect(source).toMatch(/import type \{[^}]*\} from '\.\.\/motion\/lifecycle'/);
    expect(source).toMatch(/import type \{[^}]*\} from 'astro:transitions\/client'/);
    expect(source).not.toMatch(/pushState|innerHTML|gsap/);
  });
});
