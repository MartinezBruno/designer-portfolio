import { syncMotionGate } from './gate';
import { bindToAstro, createLifecycle } from './lifecycle';

// Page-scoped singleton. Phase 2 registers the marquee toggle and the tool tooltips through it;
// Phases 6-7 add motion effects.
export const lifecycle = createLifecycle(document, (err) => {
  console.error(err);
});

bindToAstro(lifecycle, document);

// Follow reduced-motion changes after load (WR-03). Page-scoped like the lifecycle singleton.
syncMotionGate(document, window);
