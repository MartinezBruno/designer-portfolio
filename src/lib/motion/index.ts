import { bindToAstro, createLifecycle } from './lifecycle';

// Page-scoped singleton. Motion effects (Phases 6-7) register through it; none in Phase 1.
export const lifecycle = createLifecycle(document, (err) => {
  console.error(err);
});

bindToAstro(lifecycle, document);
