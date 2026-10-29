import { currentMotionState, onMotionChange } from './events';
import type { PageInit } from './lifecycle';

export interface HeroPlayedDeps {
  /** Milliseconds since navigation start (performance.now in the browser). */
  now(): number;
}

/** The CSS sequence ends at 960ms; a mount at or after this point has nothing left to wait for. */
const SEQUENCE_END_MS = 1000;

/**
 * No-replay marker for the CSS hero load sequence (UI-SPEC "Hero load sequence", D-03).
 * The keyframes in global.css only match `[data-hero]:not([data-hero-played])`, so once this
 * attribute is set, a later reduced -> on switch never replays the hero. The sequence itself is
 * pure CSS: this module only records that it has run (or never will on this page).
 */
export function createHeroPlayed(deps: HeroPlayedDeps): PageInit {
  return (doc) => {
    const hero = doc.querySelector<HTMLElement>('[data-hero]');
    if (!hero) return undefined;

    const markPlayed = (): void => {
      hero.toggleAttribute('data-hero-played', true);
    };

    if (
      hero.hasAttribute('data-hero-played') ||
      currentMotionState(doc) !== 'on' ||
      deps.now() >= SEQUENCE_END_MS
    ) {
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
    const pending = new Set<Element>(
      [hero.querySelector('[data-hero-cta]'), hero.querySelector('[data-hero-portrait]')].filter(
        (el): el is Element => el !== null,
      ),
    );
    if (pending.size === 0) {
      markPlayed();
      return undefined;
    }
    for (const target of pending) {
      target.addEventListener(
        'animationend',
        (event) => {
          if (event.target !== target) return;
          pending.delete(target);
          if (pending.size === 0) done();
        },
        { signal: ac.signal },
      );
    }
    // Any motion switch mid-sequence also ends it: the hero must never restart later.
    onMotionChange(doc, done, ac.signal);

    return () => {
      ac.abort();
    };
  };
}
