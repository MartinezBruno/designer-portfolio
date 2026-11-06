import { currentMotionState, onMotionChange } from './events';
import type { Cleanup } from './lifecycle';

export type FocusVisibleCheck = (el: HTMLElement) => boolean;

const matchesFocusVisible: FocusVisibleCheck = (el) => el.matches(':focus-visible');

/**
 * Wires every `[data-marquee-toggle]` button to pause its `[data-marquee]` section.
 * WCAG 2.2.2 (Pause, Stop, Hide) mechanism: a transparent toggle laid over the whole band
 * (tap/click or Space/Enter) with a fixed label whose state lives in `aria-pressed`.
 *
 * This controller is the single source of pause truth (Phase 2 WR-01, WCAG 4.1.2). The band is
 * paused when the user's explicit choice says so, or, with no explicit choice yet, while a mouse
 * hovers it or the toggle has keyboard focus. Every change goes through `apply()`, which writes
 * `aria-pressed` and `data-paused` together; CSS pauses only through `data-paused`, so the
 * visible play state and the announced state can't disagree. A click flips whatever is visible
 * (a click while hovered resumes). Touch pointers don't count as hover, so a tap pauses.
 *
 * When motion leaves `on` (WR-03) the state resets to running with no explicit choice, and the
 * toggle, which becomes `display: none`, is blurred if focused. The pause state is not persisted.
 * `isFocusVisible` is injectable because happy-dom cannot evaluate `:focus-visible`.
 */
export function initMarqueeToggles(
  doc: Document,
  isFocusVisible: FocusVisibleCheck = matchesFocusVisible,
): Cleanup | undefined {
  const buttons = doc.querySelectorAll<HTMLButtonElement>('[data-marquee-toggle]');
  if (buttons.length === 0) return undefined;

  const ac = new AbortController();
  const { signal } = ac;
  const motionOn = (): boolean => currentMotionState(doc) === 'on';

  for (const button of buttons) {
    const root = button.closest<HTMLElement>('[data-marquee]');
    let explicit: boolean | null = null;
    let hovered = false;
    let focused = false;

    const isPaused = (): boolean => explicit ?? (hovered || focused);
    const apply = (): void => {
      const paused = isPaused();
      button.setAttribute('aria-pressed', String(paused));
      root?.toggleAttribute('data-paused', paused);
    };

    button.addEventListener(
      'click',
      () => {
        explicit = !isPaused();
        apply();
      },
      { signal },
    );

    button.addEventListener(
      'focus',
      () => {
        focused = motionOn() && isFocusVisible(button);
        apply();
      },
      { signal },
    );
    button.addEventListener(
      'blur',
      () => {
        focused = false;
        apply();
      },
      { signal },
    );

    root?.addEventListener(
      'pointerenter',
      (event) => {
        if (event.pointerType === 'touch' || !motionOn()) return;
        hovered = true;
        apply();
      },
      { signal },
    );
    root?.addEventListener(
      'pointerleave',
      () => {
        hovered = false;
        apply();
      },
      { signal },
    );

    onMotionChange(
      doc,
      (state) => {
        if (state === 'on') return;
        explicit = null;
        hovered = false;
        focused = false;
        if (doc.activeElement === button) button.blur();
        apply();
      },
      signal,
    );
  }

  return () => {
    ac.abort();
  };
}
