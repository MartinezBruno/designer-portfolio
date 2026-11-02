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

export interface BindToAstroOptions {
  /**
   * Resolves when the arriving page is released after a soft navigation (07-04, D-16). Without
   * it, page-load mounts at once.
   */
  waitForRelease?: () => Promise<void>;
}

/**
 * Mounts immediately (module scripts are deferred, so the DOM is parsed) and follows the
 * ClientRouter events (Phase 7): `astro:before-swap` unmounts the leaving page and
 * `astro:page-load` mounts the arriving one. page-load fires right after the swap while the view
 * transition still runs, so with `waitForRelease` the mount waits until the wipe has uncovered the
 * page (07 D-16, Research Pattern 2). A navigation token guards that wait: if another swap happens
 * first, the stale release never mounts effects on the wrong page (T-07-11).
 * page-load also fires on the first load; mount() is idempotent, so it never double-runs.
 * Raw event names: Astro 7 removed the TRANSITION_* helper constants.
 */
export function bindToAstro(
  lifecycle: Lifecycle,
  doc: Document,
  options: BindToAstroOptions = {},
): () => void {
  let navToken = 0;
  let bound = true;
  const { waitForRelease } = options;
  const onLoad = (): void => {
    if (waitForRelease === undefined) {
      lifecycle.mount();
      return;
    }
    const token = navToken;
    void waitForRelease().then(() => {
      if (bound && token === navToken) lifecycle.mount();
    });
  };
  const onBeforeSwap = (): void => {
    navToken += 1;
    lifecycle.unmount();
  };
  lifecycle.mount();
  doc.addEventListener('astro:page-load', onLoad);
  doc.addEventListener('astro:before-swap', onBeforeSwap);
  return () => {
    bound = false;
    doc.removeEventListener('astro:page-load', onLoad);
    doc.removeEventListener('astro:before-swap', onBeforeSwap);
  };
}
