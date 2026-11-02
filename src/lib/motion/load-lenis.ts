// The only module in src/ that references the 'lenis' specifier. Lenis loads lazily through dynamic
// import(), so it lands in a separate chunk that is fetched only when smooth scroll is allowed (fine
// pointer, 'on', no forced colours). Its CSS is never imported from here: the base rules live in
// src/styles/smooth-scroll.css, so the lazy chunk carries no stylesheet.
export type LenisCtor = typeof import('lenis').default;

/**
 * Wraps an importer so every caller shares one load. A rejected load is forgotten, so a later
 * mount can retry (e.g. after a transient chunk 404).
 */
export function createLenisLoader(importer: () => Promise<LenisCtor>): () => Promise<LenisCtor> {
  let loading: Promise<LenisCtor> | undefined;
  return () => {
    if (loading !== undefined) return loading;
    const attempt = importer();
    loading = attempt;
    attempt.catch(() => {
      if (loading === attempt) loading = undefined;
    });
    return attempt;
  };
}

export const loadLenis = createLenisLoader(() => import('lenis').then((m) => m.default));
