import { currentMotionState, onMotionChange } from './events';
import type { PageInit } from './lifecycle';

/**
 * Whether `el`'s own CSS animation is still to run, running or paused (not yet ended). Asks the element instead of a
 * clock (06 review WR-05): the sequence starts at first style resolution, not at navigation
 * start, and a future soft navigation restarts it with the page clock already far past 1s.
 * Without getAnimations() the answer is unknown, so treat it as running and wait for the event.
 */
function stillAnimating(el: Element): boolean {
  if (typeof el.getAnimations !== 'function') return true;
  // getAnimations() never lists idle animations, so anything not finished is still to end.
  return el.getAnimations().some((a) => a.playState !== 'finished');
}

/**
 * No-replay marker for the CSS hero load sequence (UI-SPEC "Hero load sequence", D-03).
 * The keyframes in global.css only match `[data-hero]:not([data-hero-played])`, so once this
 * attribute is set, a later reduced -> on switch never replays the hero. The sequence itself is
 * pure CSS: this module only records that it has run (or never will on this page).
 */
export function createHeroPlayed(): PageInit {
  return (doc) => {
    const hero = doc.querySelector<HTMLElement>('[data-hero]');
    if (!hero) return undefined;

    const markPlayed = (): void => {
      hero.toggleAttribute('data-hero-played', true);
    };

    if (hero.hasAttribute('data-hero-played') || currentMotionState(doc) !== 'on') {
      markPlayed();
      return undefined;
    }

    const ac = new AbortController();
    const done = (): void => {
      markPlayed();
      ac.abort();
    };

    // The CTA row is the last step to start (280ms + 560ms) and the portrait the last to finish
    // (120ms + 840ms). Marking played earlier would cut the portrait's shutter short, so wait for
    // both. Only each element's own animation counts; events bubbling from children are ignored.
    // A mount after an element's animation already ended (slow script, late mount) skips it.
    const pending = new Set<Element>(
      [hero.querySelector('[data-hero-cta]'), hero.querySelector('[data-hero-portrait]')].filter(
        (el): el is Element => el !== null && stillAnimating(el),
      ),
    );
    if (pending.size === 0) {
      markPlayed();
      return undefined;
    }
    for (const target of pending) {
      const settle = (event: Event): void => {
        if (event.target !== target) return;
        pending.delete(target);
        if (pending.size === 0) done();
      };
      target.addEventListener('animationend', settle, { signal: ac.signal });
      target.addEventListener('animationcancel', settle, { signal: ac.signal });
    }
    // Any motion switch mid-sequence also ends it: the hero must never restart later.
    onMotionChange(doc, done, ac.signal);

    return () => {
      ac.abort();
    };
  };
}
