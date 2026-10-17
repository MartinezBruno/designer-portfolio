import type { Cleanup } from '../motion/lifecycle';

/**
 * Tool tile tooltips (D-14, WCAG 1.4.13: dismissible, hoverable, persistent).
 * CSS already shows the tooltip on hover and focus-visible, so it works without JS.
 * This script only adds tap-to-show (touch/pen), Esc to dismiss without moving pointer
 * or focus, outside-tap to close, and one tooltip at a time. It toggles only the
 * data-open and data-dismissed attributes on [data-tool] tiles.
 */
export function initToolTooltips(doc: Document): Cleanup | undefined {
  const tiles = [...doc.querySelectorAll<HTMLElement>('[data-tool]')];
  if (tiles.length === 0) return undefined;

  const ac = new AbortController();
  const { signal } = ac;

  // `keepFocused`: pointer movement over a neighbour is not a dismissal, so the tile that holds
  // focus keeps its tooltip (WCAG 1.4.13 persistent, WR-04). Only Esc or moving focus hides it.
  const focusOn = (tile: HTMLElement, keepFocused = false): void => {
    tile.removeAttribute('data-dismissed');
    for (const other of tiles) {
      if (other === tile) continue;
      other.removeAttribute('data-open');
      if (keepFocused && other === doc.activeElement) continue;
      other.setAttribute('data-dismissed', '');
    }
  };

  for (const tile of tiles) {
    tile.addEventListener(
      'pointerenter',
      () => {
        focusOn(tile, true);
      },
      { signal },
    );
    tile.addEventListener(
      'focusin',
      () => {
        focusOn(tile);
      },
      { signal },
    );
    tile.addEventListener(
      'pointerup',
      (event: PointerEvent) => {
        if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
        if (tile.hasAttribute('data-open')) {
          tile.removeAttribute('data-open');
          return;
        }
        focusOn(tile);
        tile.setAttribute('data-open', '');
      },
      { signal },
    );
  }

  doc.addEventListener(
    'pointerdown',
    (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-tool]')) return;
      for (const tile of tiles) tile.removeAttribute('data-open');
    },
    { signal },
  );

  doc.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      for (const tile of tiles) {
        tile.removeAttribute('data-open');
        tile.setAttribute('data-dismissed', '');
      }
    },
    { signal },
  );

  return () => {
    ac.abort();
  };
}
