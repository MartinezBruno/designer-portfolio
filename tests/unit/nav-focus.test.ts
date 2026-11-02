// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bindNavFocus, pickFocusTarget } from '../../src/lib/motion/nav-focus';

// 07-01: focus after soft navigation (MOTN-05, 07 D-14, Research Pattern 5, threat T-07-01).

const PAGE = `
  <main id="main" tabindex="-1">
    <h1 tabindex="-1">Title</h1>
    <section id="contact" tabindex="-1">Contact</section>
    <p id="a">a</p>
  </main>`;

function page(html: string): void {
  document.body.innerHTML = html;
}

const flush = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe('pickFocusTarget', () => {
  beforeEach(() => {
    page(PAGE);
  });

  it('returns the element whose id matches the hash', () => {
    expect(pickFocusTarget(document, '#contact')?.id).toBe('contact');
  });

  it('falls back to main h1 when the id does not exist', () => {
    expect(pickFocusTarget(document, '#no-such-id')?.tagName).toBe('H1');
  });

  it('falls back to main h1 for an empty hash', () => {
    expect(pickFocusTarget(document, '')?.tagName).toBe('H1');
  });

  it('falls back to #main when the page has no h1', () => {
    page('<main id="main" tabindex="-1"><p>no heading</p></main>');
    expect(pickFocusTarget(document, '')?.id).toBe('main');
  });

  it('does not throw on a malformed percent-encoded hash and falls back', () => {
    expect(() => pickFocusTarget(document, '#%E0%A4%A')).not.toThrow();
    expect(pickFocusTarget(document, '#%E0%A4%A')?.tagName).toBe('H1');
  });

  it('decodes an encoded id', () => {
    page(`${PAGE}<div id="año">x</div>`);
    expect(pickFocusTarget(document, '#a%C3%B1o')?.id).toBe('año');
  });

  it('never treats hash text as a selector', () => {
    const spy = vi.spyOn(document, 'querySelector');
    expect(pickFocusTarget(document, '#a,body')?.tagName).toBe('H1');
    for (const call of spy.mock.calls) expect(call[0]).not.toContain('a,body');
    spy.mockRestore();
  });
});

describe('bindNavFocus', () => {
  let focus: ReturnType<typeof vi.spyOn>;
  let unbind: () => void = () => undefined;

  beforeEach(() => {
    page(PAGE);
    focus = vi.spyOn(HTMLElement.prototype, 'focus');
  });

  afterEach(() => {
    unbind();
    focus.mockRestore();
  });

  it('does nothing on the first page-load (no preceding swap)', async () => {
    unbind = bindNavFocus(document);
    document.dispatchEvent(new Event('astro:page-load'));
    await flush();
    expect(focus).not.toHaveBeenCalled();
  });

  it('focuses the target once with preventScroll after a swap', async () => {
    unbind = bindNavFocus(document);
    document.dispatchEvent(new Event('astro:after-swap'));
    document.dispatchEvent(new Event('astro:page-load'));
    await flush();
    expect(focus).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(focus.mock.contexts[0]).toBe(document.querySelector('main h1'));

    document.dispatchEvent(new Event('astro:page-load'));
    await flush();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('waits for waitForRelease before focusing', async () => {
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    unbind = bindNavFocus(document, { waitForRelease: () => pending });
    document.dispatchEvent(new Event('astro:after-swap'));
    document.dispatchEvent(new Event('astro:page-load'));
    await flush();
    expect(focus).not.toHaveBeenCalled();
    release();
    await flush();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('unbind stops listening', async () => {
    unbind = bindNavFocus(document);
    unbind();
    document.dispatchEvent(new Event('astro:after-swap'));
    document.dispatchEvent(new Event('astro:page-load'));
    await flush();
    expect(focus).not.toHaveBeenCalled();
  });
});
