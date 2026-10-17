// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createLifecycle } from '../../src/lib/motion/lifecycle';
import { initEmbedFacades } from '../../src/lib/ui/embed-facade';

const FACADE_CLASSES =
  'bg-surface-alt flex min-h-64 flex-col items-start justify-end gap-4 p-6 sm:aspect-video sm:min-h-0 sm:p-8';

function fixture(src: string, title = 'T'): string {
  return `<div data-embed-facade data-src="${src}" data-title="${title}" class="${FACADE_CLASSES}"><p>Interactive prototype</p><p>Loading it connects to Figma.</p><button type="button" hidden data-embed-load>Load</button></div><p><a href="https://www.behance.net/x">Behance</a></p>`;
}

function getFacade(): HTMLElement {
  const facade = document.querySelector<HTMLElement>('[data-embed-facade]');
  expect(facade).not.toBeNull();
  if (!facade) throw new Error('fixture facade missing');
  return facade;
}

function getButton(): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>('[data-embed-load]');
  expect(button).not.toBeNull();
  if (!button) throw new Error('fixture button missing');
  return button;
}

describe('initEmbedFacades', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns undefined when there is no facade', () => {
    document.body.innerHTML = '<p>nothing</p>';
    expect(initEmbedFacades(document)).toBeUndefined();
  });

  it('reveals the load button on init', () => {
    document.body.innerHTML = fixture('https://embed.figma.com/proto/x');
    expect(getButton().hidden).toBe(true);
    const cleanup = initEmbedFacades(document);
    expect(getButton().hasAttribute('hidden')).toBe(false);
    cleanup?.();
  });

  it('replaces the facade with one sandboxed, focused iframe on click', () => {
    document.body.innerHTML = fixture('https://embed.figma.com/proto/x', 'T');
    const cleanup = initEmbedFacades(document);
    const facade = getFacade();

    getButton().click();

    expect(facade.children).toHaveLength(1);
    const iframe = facade.querySelector('iframe');
    expect(iframe).not.toBeNull();
    if (!iframe) throw new Error('iframe missing');
    expect(facade.firstElementChild).toBe(iframe);
    expect(iframe.src).toBe('https://embed.figma.com/proto/x');
    expect(iframe.title).toBe('T');
    expect(iframe.getAttribute('sandbox')).toBe(
      'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox',
    );
    expect(iframe.getAttribute('allow')).toBe('fullscreen');
    expect(iframe.allowFullscreen).toBe(true);
    expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
    expect(iframe.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(iframe.classList.contains('size-full')).toBe(true);

    expect(facade.classList.contains('aspect-video')).toBe(true);
    for (const dropped of ['min-h-64', 'p-6', 'sm:p-8', 'sm:aspect-video', 'sm:min-h-0']) {
      expect(facade.classList.contains(dropped)).toBe(false);
    }
    expect(facade.classList.contains('bg-surface-alt')).toBe(true);
    expect(document.activeElement).toBe(iframe);

    cleanup?.();
  });

  it.each([
    'https://evil.example.com/proto/x',
    'https://embed.figma.com.evil.example/x',
    'http://embed.figma.com/proto/x',
    'javascript:alert(1)',
    'https://user:pass@embed.figma.com/x',
    '',
  ])('never loads a non-allowlisted src (%s)', (src) => {
    document.body.innerHTML = fixture(src);
    const cleanup = initEmbedFacades(document);

    getButton().click();

    expect(document.querySelector('iframe')).toBeNull();
    expect(document.querySelector('[data-embed-load]')).not.toBeNull();
    cleanup?.();
  });

  it('stops reacting to clicks after cleanup', () => {
    document.body.innerHTML = fixture('https://embed.figma.com/proto/x');
    const cleanup = initEmbedFacades(document);
    expect(cleanup).toBeTypeOf('function');
    cleanup?.();

    getButton().click();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('binds once across 10 lifecycle unmount/mount cycles', () => {
    document.body.innerHTML = fixture('https://embed.figma.com/proto/x');
    const lifecycle = createLifecycle(document);
    lifecycle.register(initEmbedFacades);
    lifecycle.mount();
    for (let i = 0; i < 10; i += 1) {
      lifecycle.unmount();
      lifecycle.mount();
    }
    expect(lifecycle.activeCleanups).toBe(1);

    getButton().click();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    lifecycle.unmount();
  });

  it('has no innerHTML in the module source', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../src/lib/ui/embed-facade.ts', import.meta.url)),
      'utf8',
    );
    expect(source).not.toContain('innerHTML');
  });
});
