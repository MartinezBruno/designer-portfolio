/**
 * Focus after soft navigation (MOTN-05, 07 D-14, Research Pattern 5). A full page load resets focus
 * to the document start; a ClientRouter swap keeps the old focus point, so keyboard and
 * screen-reader users would be stranded. After each swap focus moves to the arriving page's
 * anchor target, else its main h1, else `#main`. All three carry `tabindex="-1"`, are
 * non-interactive and show no ring (global.css). `preventScroll` leaves scrolling to the router.
 */

export interface NavFocusOptions {
  /** Resolves when the arriving page may take focus (a later plan holds it during the wipe). */
  waitForRelease?: () => Promise<void>;
}

function hashTarget(doc: Document, hash: string): HTMLElement | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw === '') return null;
  let id: string;
  try {
    id = decodeURIComponent(raw);
  } catch {
    return null;
  }
  // getElementById, never querySelector: the hash is untrusted text, not a selector (T-07-01).
  const element = doc.getElementById(id);
  return element instanceof HTMLElement ? element : null;
}

/** Order: decoded hash id -> `main h1` -> `#main`. */
export function pickFocusTarget(doc: Document, hash: string): HTMLElement | null {
  const fromHash = hashTarget(doc, hash);
  if (fromHash) return fromHash;
  const heading = doc.querySelector('main h1');
  if (heading instanceof HTMLElement) return heading;
  const main = doc.getElementById('main');
  return main instanceof HTMLElement ? main : null;
}

export function bindNavFocus(doc: Document, options: NavFocusOptions = {}): () => void {
  const ac = new AbortController();
  const { signal } = ac;
  // astro:page-load also fires on the first load, where the browser's own focus start is right.
  let navigated = false;

  function onAfterSwap(): void {
    navigated = true;
  }

  async function onPageLoad(): Promise<void> {
    if (!navigated) return;
    navigated = false;
    await (options.waitForRelease?.() ?? Promise.resolve());
    if (signal.aborted) return;
    pickFocusTarget(doc, doc.defaultView?.location.hash ?? '')?.focus({ preventScroll: true });
  }

  doc.addEventListener('astro:after-swap', onAfterSwap, { signal });
  doc.addEventListener(
    'astro:page-load',
    () => {
      void onPageLoad();
    },
    { signal },
  );

  return () => {
    ac.abort();
  };
}
