import { lifecycle } from './index';
import { createReveal } from './reveal';

// Page-wide motion effects, registered once on the lifecycle singleton (BaseLayout imports this).
lifecycle.register(
  createReveal({
    now: () => performance.now(),
    createObserver: (cb, init) => new IntersectionObserver(cb, init),
  }),
);
