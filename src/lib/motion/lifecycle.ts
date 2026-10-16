export type Cleanup = () => void;
// Return undefined for no cleanup (void unions are rejected by @typescript-eslint/no-invalid-void-type).
export type PageInit = (doc: Document) => Cleanup | undefined;

export interface Lifecycle {
  register(init: PageInit): void;
  /** Idempotent: runs every registered init once per mounted page. */
  mount(): void;
  /** Idempotent: runs every collected cleanup exactly once. */
  unmount(): void;
  readonly activeCleanups: number;
}

export function createLifecycle(
  doc: Document,
  onError: (err: Error) => void = () => undefined,
): Lifecycle {
  const inits: PageInit[] = [];
  const cleanups: Cleanup[] = [];
  let mounted = false;

  // One failing effect must not stop the others.
  const run = (init: PageInit): void => {
    try {
      const cleanup = init(doc);
      if (cleanup) cleanups.push(cleanup);
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  return {
    register(init) {
      inits.push(init);
      if (mounted) run(init);
    },
    mount() {
      if (mounted) return;
      mounted = true;
      inits.forEach(run);
    },
    unmount() {
      if (!mounted) return;
      mounted = false;
      for (const cleanup of cleanups.splice(0)) {
        try {
          cleanup();
        } catch (err) {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    },
    get activeCleanups() {
      return cleanups.length;
    },
  };
}

/**
 * Mounts immediately (module scripts are deferred, so the DOM is parsed) and follows
 * Astro navigation events. Those only fire once a ClientRouter exists (Phase 7); without
 * it 'astro:page-load' never fires and the immediate mount covers the page.
 * Raw event names: Astro 7 removed the TRANSITION_* helper constants.
 */
export function bindToAstro(lifecycle: Lifecycle, doc: Document): () => void {
  const onLoad = (): void => {
    lifecycle.mount();
  };
  const onBeforeSwap = (): void => {
    lifecycle.unmount();
  };
  lifecycle.mount();
  doc.addEventListener('astro:page-load', onLoad);
  doc.addEventListener('astro:before-swap', onBeforeSwap);
  return () => {
    doc.removeEventListener('astro:page-load', onLoad);
    doc.removeEventListener('astro:before-swap', onBeforeSwap);
  };
}
