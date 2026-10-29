import { lifecycle } from './index';
import { loadGsap } from './load-gsap';
import { createMagnetic } from './magnetic';
import { createReveal } from './reveal';

// Page-wide motion effects, registered once on the lifecycle singleton (BaseLayout imports this).
lifecycle.register(
  createReveal({
    now: () => performance.now(),
    createObserver: (cb, init) => new IntersectionObserver(cb, init),
    // Lines headings rise through SplitText under 'on'; the loader keeps GSAP out of eager chunks.
    loadGsap,
  }),
);

// GSAP stays behind the lazy loader: magnetic only fetches it for a fine pointer under 'on'.
lifecycle.register(createMagnetic({ matchMedia: (q) => window.matchMedia(q), loadGsap }));
