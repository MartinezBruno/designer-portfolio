import type { Cleanup, PageInit } from '../motion/lifecycle';

/** At most one retry after a failed chunk load on the same mount. */
const MAX_ATTEMPTS = 2;

/**
 * Loads the contact form controller on demand (07-15). The controller (Actions client, Turnstile
 * loader, validation UI) was the largest eager chunk on Home, and eager JS has a 22,000 B gzip
 * ceiling that is deferred to, never raised (07-10 user decision, 2026-11-04).
 *
 * Triggers, whichever comes first: the #contact section comes within one viewport (an
 * IntersectionObserver with a 100% bottom margin), or the first focusin/pointerdown inside it. The
 * page opened at #contact or with ?service=, or a browser without IntersectionObserver, loads at
 * once.
 *
 * Progressive enhancement: until the controller mounts it is the one that hides the mailto block and
 * reveals the form, so a visitor can always email Martina. A failed load is logged and hides nothing.
 * The returned cleanup disconnects the observer, removes the listeners, and blocks a load that
 * resolves after the page has been swapped away.
 */
export function createLazyContactForm(load: () => Promise<PageInit>): PageInit {
  return (doc) => {
    const form = doc.querySelector<HTMLFormElement>('form[data-contact-form]');
    if (!form) return undefined;
    const region: HTMLElement = form.closest<HTMLElement>('#contact') ?? form;
    const win = doc.defaultView;

    let dead = false;
    let busy = false;
    let attempts = 0;
    let inner: Cleanup | undefined;
    let observer: IntersectionObserver | undefined;
    const listeners = new AbortController();

    const stopTriggers = (): void => {
      observer?.disconnect();
      observer = undefined;
      listeners.abort();
    };

    const start = (): void => {
      if (dead || busy || attempts >= MAX_ATTEMPTS) return;
      busy = true;
      attempts += 1;
      load().then(
        (init) => {
          if (dead) return;
          stopTriggers();
          // A keyboard user who tabbed onto the mailto link (that focusin is a trigger) must not
          // be dropped to <body> when the controller hides the block: hand focus to the form.
          const nojs = region.querySelector<HTMLElement>('[data-contact-nojs]');
          const hadFocus = nojs?.contains(doc.activeElement) === true;
          inner = init(doc);
          if (hadFocus && nojs?.hidden === true && !form.hidden) {
            form
              .querySelector<HTMLElement>(
                'input[name="service"]:checked, input:not([type="hidden"]):not([tabindex="-1"]), textarea, button',
              )
              ?.focus();
          }
        },
        (err: unknown) => {
          busy = false;
          console.error('[contact] form controller failed to load', err);
          if (attempts >= MAX_ATTEMPTS) stopTriggers();
        },
      );
    };

    const opts = { capture: true, signal: listeners.signal };
    region.addEventListener('focusin', start, opts);
    region.addEventListener('pointerdown', start, opts);

    const loc = win?.location;
    const immediate =
      loc !== undefined &&
      (loc.hash === '#contact' || new URLSearchParams(loc.search).has('service'));
    const IO = win?.IntersectionObserver;

    if (immediate || typeof IO !== 'function') {
      start();
    } else {
      observer = new IO(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) start();
        },
        { rootMargin: '0px 0px 100% 0px' },
      );
      observer.observe(region);
    }

    return () => {
      dead = true;
      stopTriggers();
      const c = inner;
      inner = undefined;
      c?.();
    };
  };
}
