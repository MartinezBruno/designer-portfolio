import type { Cleanup } from '../motion/lifecycle';
import { providerForUrl } from '../projects/embeds';

const SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
// The poster sizing gives way to a 16:9 box at every width once the frame is loaded.
const POSTER_CLASSES = ['min-h-64', 'p-6', 'sm:p-8', 'sm:aspect-video', 'sm:min-h-0'];
const IFRAME_CLASSES = [
  'block',
  'size-full',
  'focus-visible:outline-2',
  'focus-visible:outline-accent',
];

/**
 * Click-to-load facade for allowlisted embeds (D-07). The markup ships with no iframe, so the
 * page makes no third-party request until the visitor asks. The button is hidden without JS;
 * init reveals it. On click the `data-src` is re-checked against the embed allowlist (the
 * attribute is data crossing into a navigable frame) and the frame is built with createElement
 * and setters only. Focus moves into the frame so keyboard users are not dropped to <body>.
 */
export function initEmbedFacades(doc: Document): Cleanup | undefined {
  const facades = doc.querySelectorAll<HTMLElement>('[data-embed-facade]');
  if (facades.length === 0) return undefined;

  const ac = new AbortController();
  for (const facade of facades) {
    const button = facade.querySelector<HTMLButtonElement>('[data-embed-load]');
    if (!button) continue;
    button.hidden = false;
    button.addEventListener(
      'click',
      () => {
        const src = facade.dataset['src'] ?? '';
        if (providerForUrl(src) === null) return;

        const iframe = doc.createElement('iframe');
        iframe.src = src;
        iframe.title = facade.dataset['title'] ?? '';
        iframe.setAttribute('sandbox', SANDBOX);
        iframe.setAttribute('allow', 'fullscreen');
        iframe.allowFullscreen = true;
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        iframe.classList.add(...IFRAME_CLASSES);

        facade.classList.remove(...POSTER_CLASSES);
        facade.classList.add('aspect-video');
        facade.replaceChildren(iframe);
        iframe.focus();
      },
      { signal: ac.signal },
    );
  }

  return () => {
    ac.abort();
  };
}
