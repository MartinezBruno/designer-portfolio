import type { GsapModules } from './load-gsap';
import { durations, eases } from './tokens';

/** A running line rise; `finish()` lands it at once and restores the plain heading. */
export interface SplitHandle {
  finish(): void;
}

/** 80ms between the lines of one heading (UI-SPEC "Motion Tokens"). */
const LINE_STAGGER_S = 0.08;

/**
 * Headings that wrap a link are never split: SplitText's aria handling would strip the link's
 * semantics (UI-SPEC "SplitText contract"). They take the CSS reveal instead.
 */
export function canSplit(heading: Element): boolean {
  return heading.querySelector('a') === null;
}

/**
 * Masked line rise for one `[data-reveal="lines"]` heading (MOTN-02, D-01). Lines only: no word or
 * character effects. Plain headings get `aria: 'auto'` (aria-label on the heading, aria-hidden
 * lines); a heading holding a `lang` span gets `aria: 'none'` so the span keeps its language for
 * assistive tech. `autoSplit` re-splits on font load and width change and carries the tween; the
 * split is reverted when the rise ends, so find-in-page and later resizes see plain text again.
 */
export function splitAndRise(heading: HTMLElement, mods: GsapModules): SplitHandle {
  const { gsap, SplitText } = mods;
  let tween: ReturnType<typeof gsap.from> | undefined;
  let done = false;

  // Only ever called after create() has returned (tween end or finish()), so `split` is set.
  const restore = (): void => {
    if (done) return;
    done = true;
    split.revert();
  };

  const split = SplitText.create(heading, {
    type: 'lines',
    mask: 'lines',
    tag: 'span',
    linesClass: 'split-line',
    aria: heading.querySelector('[lang]') === null ? 'auto' : 'none',
    autoSplit: true,
    onSplit(self) {
      // SplitText clips both axes inline; clip only the vertical one so side bearings and
      // italic overhangs never get cut (Pitfall 4). The 0.1em padding pair lives in global.css.
      for (const mask of self.masks) {
        if (!(mask instanceof HTMLElement)) continue;
        mask.style.overflow = '';
        mask.style.overflowY = 'clip';
      }
      // Same task as the from-tween's immediate render: the heading turns visible with every
      // line already pushed below its mask, so no unmasked frame paints.
      heading.setAttribute('data-revealed', '');
      tween = gsap.from(self.lines, {
        yPercent: 110,
        duration: durations.line,
        ease: eases.reveal,
        stagger: LINE_STAGGER_S,
        onComplete: restore,
      });
      return tween;
    },
  });

  return {
    finish() {
      if (done) return;
      tween?.progress(1);
      restore();
    },
  };
}
