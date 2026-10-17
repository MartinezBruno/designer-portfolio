import type { Cleanup } from './lifecycle';

/**
 * Wires every `[data-marquee-toggle]` button to pause its `[data-marquee]` section.
 * WCAG 2.2.2 (Pause, Stop, Hide) mechanism: a transparent toggle laid over the whole band
 * (tap/click or Space/Enter) with a fixed label whose state lives in `aria-pressed`; CSS reads `data-paused` on the section to stop the
 * animation. The pause state is not persisted, so a reload resumes the marquee.
 */
export function initMarqueeToggles(doc: Document): Cleanup | undefined {
  const buttons = doc.querySelectorAll<HTMLButtonElement>('[data-marquee-toggle]');
  if (buttons.length === 0) return undefined;

  const ac = new AbortController();
  for (const button of buttons) {
    const root = button.closest<HTMLElement>('[data-marquee]');
    button.addEventListener(
      'click',
      () => {
        const paused = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(paused));
        root?.toggleAttribute('data-paused', paused);
      },
      { signal: ac.signal },
    );
  }

  return () => {
    ac.abort();
  };
}
