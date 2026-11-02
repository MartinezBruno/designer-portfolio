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

// Router hooks: motion-state carry, toggle sync, 'off' full-load opt-out (07 D-04, D-05), and the
// release gate (07 D-16). Bound before bindToAstro so its before-swap listener runs first.
const navigation = bindNavigation(document);

// Page effects mount when the wipe releases the arriving page, not under the ink (07 D-16).
bindToAstro(lifecycle, document, { waitForRelease: navigation.waitForRelease });

// Follow reduced-motion changes after load (WR-03). App-scoped: the listener lives for the session.
syncMotionGate(document, window);

// Focus the arriving page's h1 (or hash target, or #main) at release, never earlier (07 D-14).
bindNavFocus(document, { waitForRelease: navigation.waitForRelease });
