import { syncMotionGate } from './gate';
import { bindToAstro, createLifecycle } from './lifecycle';
import { bindNavFocus } from './nav-focus';
import { bindNavigation } from './navigation';

// App-scoped module: under ClientRouter (Phase 7) it runs once per session, not once per page.
// `lifecycle` holds the page-scoped effects (Phase 2 marquee toggle and tool tooltips, Phase 6
// motion): it mounts on every astro:page-load and unmounts on every astro:before-swap.
export const lifecycle = createLifecycle(document, (err) => {
  console.error(err);
});

bindToAstro(lifecycle, document);

// Follow reduced-motion changes after load (WR-03). App-scoped: the listener lives for the session.
syncMotionGate(document, window);

// Router hooks: motion-state carry, toggle sync, 'off' full-load opt-out (07 D-04, D-05).
bindNavigation(document);

// Focus the arriving page's h1 (or hash target, or #main) after each soft navigation (07 D-14).
bindNavFocus(document);
