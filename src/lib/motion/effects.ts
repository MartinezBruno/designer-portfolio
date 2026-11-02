import { lifecycle } from './index';
import { loadGsap } from './load-gsap';
import { loadLenis } from './load-lenis';
import { createMagnetic } from './magnetic';
import { createReveal } from './reveal';
import { createSmoothScroll } from './smooth-scroll';

// Page-wide motion effects, registered once on the lifecycle singleton (BaseLayout imports this).
lifecycle.register(
  createReveal({
    createObserver: (cb, init) => new IntersectionObserver(cb, init),
    // Lines headings rise through SplitText under 'on'; the loader keeps GSAP out of eager chunks.
    loadGsap,
  }),
);

// GSAP stays behind the lazy loader: magnetic only fetches it for a fine pointer under 'on'.
lifecycle.register(createMagnetic({ matchMedia: (q) => window.matchMedia(q), loadGsap }));

// Lenis stays behind its lazy loader (fine pointer, 'on', no forced colours only). Page-scoped:
// destroyed on astro:before-swap and rebuilt on astro:page-load, after the router restores scroll.
lifecycle.register(createSmoothScroll({ matchMedia: (q) => window.matchMedia(q), loadLenis }));
