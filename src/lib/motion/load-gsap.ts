// The only module in src/ that references the 'gsap' specifier. GSAP core and SplitText load lazily
// through dynamic import(), so they land in a separate chunk that is fetched only when an effect asks
// for it (scripts/measure-bundle.ts fails the build check if GSAP ever turns up in an eager chunk).
// Even then the request waits for load, one painted frame and idle (afterLoadIdle, 08-14 lever L2b),
// so it never starts before the LCP paint. Lines headings keep the 1.5 s CSS failsafe meanwhile.
import { afterLoadIdle } from './idle';
import type { gsap } from 'gsap';
import type { SplitText } from 'gsap/SplitText';

export interface GsapModules {
  gsap: typeof gsap;
  SplitText: typeof SplitText;
}

/**
 * Wraps an importer so every caller shares one load. SplitText is registered once, after the first
 * successful load (explicit registerPlugin also stops the bundler from tree-shaking the plugin).
 * A rejected load is forgotten, so a later mount can retry (e.g. after a transient chunk 404).
 */
export function createGsapLoader(importer: () => Promise<GsapModules>): () => Promise<GsapModules> {
  let loading: Promise<GsapModules> | undefined;
  return () => {
    if (loading !== undefined) return loading;
    const attempt = importer().then((modules) => {
      modules.gsap.registerPlugin(modules.SplitText);
      return modules;
    });
    loading = attempt;
    attempt.catch(() => {
      if (loading === attempt) loading = undefined;
    });
    return attempt;
  };
}

async function importGsap(): Promise<GsapModules> {
  const [core, split] = await Promise.all([import('gsap'), import('gsap/SplitText')]);
  return { gsap: core.gsap, SplitText: split.SplitText };
}

export const loadGsap = createGsapLoader(() => afterLoadIdle(window).then(importGsap));
