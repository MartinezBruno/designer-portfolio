// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bindNavFocus,
  ensureFocusable,
  focusWithFallback,
  pickFocusTarget,
} from '../../src/lib/motion/nav-focus';

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

  it('WR-01: a superseded navigation never focuses after its release', async () => {
    const releases: (() => void)[] = [];
    unbind = bindNavFocus(document, {
      waitForRelease: () =>
        new Promise<void>((resolve) => {
          releases.push(resolve);
        }),
    });
    // Navigation A.
    document.dispatchEvent(new Event('astro:before-swap'));
    document.dispatchEvent(new Event('astro:after-swap'));
    document.dispatchEvent(new Event('astro:page-load'));
    // Navigation B starts before A is released.
    document.dispatchEvent(new Event('astro:before-swap'));
    document.dispatchEvent(new Event('astro:after-swap'));
    document.dispatchEvent(new Event('astro:page-load'));
    await flush();
    expect(releases).toHaveLength(2);
    releases[0]?.();
    await flush();
    expect(focus).not.toHaveBeenCalled();
    releases[1]?.();
    await flush();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('WR-03: a hash element that cannot take focus falls through to main h1', async () => {
    page(`${PAGE}<div id="gone" hidden>x</div>`);
    window.history.replaceState(null, '', '/#gone');
    const gone = document.getElementById('gone');
    if (!gone) throw new Error('#gone missing');
    // Simulates an element focus() does not land on (hidden, inert or display:none).
    Object.defineProperty(gone, 'focus', { value: () => undefined });
    unbind = bindNavFocus(document);
    document.dispatchEvent(new Event('astro:after-swap'));
    document.dispatchEvent(new Event('astro:page-load'));
    await flush();
    expect(document.activeElement).toBe(document.querySelector('main h1'));
    window.history.replaceState(null, '', '/');
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

// 07-07: same-page anchors (MOTN-06, 07 D-08, UI-SPEC "Anchors and the skip link"; T-07-17..20).
describe('anchor hook (bindNavFocus)', () => {
  const RADIOS = [
    'graphic-design',
    'web-design',
    'branding',
    'social-media',
    'photography',
    'other',
  ]
    .map(
      (id) =>
        `<input type="radio" name="service" id="contact-service-${id}" value="${id}"${id === 'other' ? ' checked' : ''}>`,
    )
    .join('');
  const ANCHOR_PAGE = `
    <a id="skip" data-skip-link href="#main">Skip</a>
    <header>
      <a id="to-contact" href="/#contact">Contact</a>
      <a id="to-projects" href="/projects/#contact">Projects</a>
      <a id="ask" href="/?service=branding#contact">Ask</a>
      <a id="ask-bad" href='/?service=x"],body#contact'>Ask bad</a>
      <a id="hash-contact" href="#contact">Contact here</a>
      <a id="to-missing" href="/#nope">Missing</a>
      <a id="to-selector" href="/#a,body">Selector</a>
      <a id="to-field" href="#contact-name">Field</a>
      <a id="to-link" href="#mail">Mail</a>
      <a id="external" href="https://example.com/#contact">External</a>
      <a id="new-tab" href="/#contact" target="_blank">New tab</a>
    </header>
    <main id="main" tabindex="-1">
      <h1 tabindex="-1">Title</h1>
      <section id="contact" tabindex="-1">
        <a id="mail" href="mailto:x@example.com">mail</a>
        <form data-contact-form>
          <a id="summary-link" href="#contact-name">Name is required</a>
          ${RADIOS}
          <input id="contact-name" name="name">
        </form>
      </section>
    </main>`;

  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  let focus: ReturnType<typeof vi.spyOn>;
  let scrollIntoView: ReturnType<typeof vi.spyOn>;
  let unbind: () => void = () => undefined;
  let prevented: boolean[] = [];

  /** Records whether the hook prevented the click, then blocks happy-dom's own navigation. */
  function record(event: Event): void {
    prevented.push(event.defaultPrevented);
    event.preventDefault();
  }

  function click(id: string, init: MouseEventInit = {}): void {
    const link = document.getElementById(id);
    if (!link) throw new Error(`#${id} missing`);
    link.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }),
    );
  }

  function setMotion(state: 'on' | 'reduced' | 'off'): void {
    document.documentElement.dataset['motion'] = state;
  }

  const html = (): HTMLElement => document.documentElement;
  const focusedIds = (): string[] =>
    focus.mock.contexts.map((element: unknown) =>
      element instanceof HTMLElement ? element.id : '',
    );

  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    page(ANCHOR_PAGE);
    html().style.scrollBehavior = '';
    prevented = [];
    focus = vi.spyOn(HTMLElement.prototype, 'focus');
    scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {
      // happy-dom has no layout; the call itself is what is checked.
    });
    document.addEventListener('click', record);
    setMotion('on');
    unbind = bindNavFocus(document);
  });

  afterEach(() => {
    unbind();
    document.removeEventListener('click', record);
    focus.mockRestore();
    scrollIntoView.mockRestore();
    html().style.scrollBehavior = '';
    delete html().dataset['motion'];
    window.history.replaceState(null, '', '/');
  });

  it('on: sets smooth for the one navigation, lets the router handle it, focuses at scrollend', async () => {
    click('to-contact');
    expect(prevented).toEqual([false]);
    expect(html().style.scrollBehavior).toBe('smooth');
    await wait(50);
    expect(focus).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('scrollend'));
    await flush();
    expect(focusedIds()).toEqual(['contact']);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(html().style.scrollBehavior).toBe('');
  });

  it('on: restores a previous inline scroll-behavior value', async () => {
    html().style.scrollBehavior = 'auto';
    click('to-contact');
    expect(html().style.scrollBehavior).toBe('smooth');
    window.dispatchEvent(new Event('scrollend'));
    await flush();
    expect(html().style.scrollBehavior).toBe('auto');
  });

  it('on: focuses after the 1200 ms fallback when no scrollend arrives', async () => {
    click('to-contact');
    await wait(1100);
    expect(focus).not.toHaveBeenCalled();
    await wait(200);
    expect(focusedIds()).toEqual(['contact']);
    expect(html().style.scrollBehavior).toBe('');
  });

  // WR-01 (07-20): the inline smooth window ends once the glide has started, so a history
  // traversal during the glide is restored by the router's scrollTo without a glide.
  it('WR-01 (07-20): under on, the first scroll event restores the inline scroll-behavior', async () => {
    click('to-contact');
    expect(html().style.scrollBehavior).toBe('smooth');
    window.dispatchEvent(new Event('scroll'));
    expect(html().style.scrollBehavior).toBe('');
    await wait(50);
    expect(focus).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('scrollend'));
    await flush();
    expect(focusedIds()).toEqual(['contact']);
  });

  it('WR-01 (07-20): a previous inline value comes back on the first scroll', () => {
    html().style.scrollBehavior = 'auto';
    click('to-contact');
    expect(html().style.scrollBehavior).toBe('smooth');
    window.dispatchEvent(new Event('scroll'));
    expect(html().style.scrollBehavior).toBe('auto');
  });

  it('WR-01 (07-20): later scroll events and the landing do not overwrite a value set after the restore', async () => {
    click('to-contact');
    window.dispatchEvent(new Event('scroll'));
    expect(html().style.scrollBehavior).toBe('');
    html().style.scrollBehavior = 'auto';
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scrollend'));
    await flush();
    expect(html().style.scrollBehavior).toBe('auto');
    expect(focusedIds()).toEqual(['contact']);
  });

  it('WR-01 (07-20): without a scroll event the landing still restores', async () => {
    html().style.scrollBehavior = 'auto';
    click('to-contact');
    await wait(1100);
    expect(html().style.scrollBehavior).toBe('smooth');
    await wait(200);
    expect(html().style.scrollBehavior).toBe('auto');
    expect(focusedIds()).toEqual(['contact']);
  });

  describe('traversal re-pin (07-20, WR-01 follow-up)', () => {
    let y = 0;
    let scrollTo: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      y = 0;
      Object.defineProperty(window, 'scrollY', { configurable: true, get: () => y });
      scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {
        // happy-dom has no layout; the call itself is what is checked.
      });
    });

    afterEach(() => {
      scrollTo.mockRestore();
      Reflect.deleteProperty(window, 'scrollY');
    });

    it("a traversal during a glide puts the router's position back one frame later", async () => {
      click('to-contact');
      window.dispatchEvent(new Event('scroll'));
      // The router has already restored 0 when our popstate listener runs.
      window.dispatchEvent(new PopStateEvent('popstate', { state: { index: 0 } }));
      y = 145; // the in-flight glide leaves the page mid-way on the next frame
      await wait(50);
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 0, behavior: 'instant' });
    });

    it('does nothing when the page stayed where the router put it', async () => {
      click('to-contact');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { index: 0 } }));
      await wait(50);
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('never re-pins a jump (reduced) or a non-traversal cancel', async () => {
      setMotion('reduced');
      click('to-contact');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { index: 0 } }));
      setMotion('on');
      click('to-contact');
      document.dispatchEvent(new Event('astro:before-preparation'));
      y = 145;
      await wait(50);
      expect(scrollTo).not.toHaveBeenCalled();
    });
  });

  for (const state of ['reduced', 'off'] as const) {
    it(`${state}: no smooth behaviour, focus after two frames`, async () => {
      setMotion(state);
      click('to-contact');
      expect(prevented).toEqual([false]);
      expect(html().style.scrollBehavior).toBe('');
      await wait(100);
      expect(focusedIds()).toEqual(['contact']);
    });
  }

  it('skip link: never smooth under on, #main focused after two frames', async () => {
    click('skip');
    expect(prevented).toEqual([false]);
    expect(html().style.scrollBehavior).toBe('');
    await wait(100);
    expect(focusedIds()).toEqual(['main']);
  });

  it('a second anchor click supersedes the first wait', async () => {
    click('to-contact');
    click('skip');
    window.dispatchEvent(new Event('scrollend'));
    await wait(100);
    expect(focusedIds()).toEqual(['main']);
    expect(html().style.scrollBehavior).toBe('');
  });

  it('WR-02: popstate cancels a pending glide and its focus', async () => {
    html().style.scrollBehavior = 'auto';
    click('to-contact');
    expect(html().style.scrollBehavior).toBe('smooth');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    expect(html().style.scrollBehavior).toBe('auto');
    window.dispatchEvent(new Event('scrollend'));
    await wait(50);
    expect(focus).not.toHaveBeenCalled();
  });

  it("WR-02: the router's own popstate for this fragment keeps the glide", async () => {
    click('to-contact');
    // The router moves to the target hash, then dispatches a stateless popstate.
    window.history.replaceState(null, '', '/#contact');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    expect(html().style.scrollBehavior).toBe('smooth');
    window.dispatchEvent(new Event('scrollend'));
    await flush();
    expect(focusedIds()).toEqual(['contact']);
    expect(html().style.scrollBehavior).toBe('');
  });

  it('WR-02: astro:before-preparation cancels a pending glide and its focus', async () => {
    click('to-contact');
    expect(html().style.scrollBehavior).toBe('smooth');
    document.dispatchEvent(new Event('astro:before-preparation'));
    expect(html().style.scrollBehavior).toBe('');
    await wait(1300);
    expect(focus).not.toHaveBeenCalled();
  });

  it('WR-03: a non-focusable anchor target gets tabindex=-1 and takes focus', async () => {
    document.getElementById('main')?.insertAdjacentHTML('beforeend', '<div id="note">n</div>');
    document
      .querySelector('header')
      ?.insertAdjacentHTML('beforeend', '<a id="to-note" href="#note">Note</a>');
    setMotion('reduced');
    click('to-note');
    await wait(100);
    const note = document.getElementById('note');
    expect(note?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(note);
  });

  const ignored: [string, string, MouseEventInit?][] = [
    ['a link inside a form (error summary)', 'summary-link'],
    ['a link whose target is a form control', 'to-field'],
    ['a link whose target is a link', 'to-link'],
    ['a cross-page link', 'to-projects'],
    ['an external link', 'external'],
    ['a target=_blank link', 'new-tab'],
    ['a hash with no matching id', 'to-missing'],
    ['a hash that looks like a selector', 'to-selector'],
    ['a meta-click', 'to-contact', { metaKey: true }],
    ['a ctrl-click', 'to-contact', { ctrlKey: true }],
    ['a shift-click', 'to-contact', { shiftKey: true }],
    ['a middle click', 'to-contact', { button: 1 }],
  ];

  for (const [label, id, init] of ignored) {
    it(`ignores ${label}`, async () => {
      const querySelector = vi.spyOn(document, 'querySelector');
      click(id, init);
      expect(prevented).toEqual([false]);
      expect(html().style.scrollBehavior).toBe('');
      window.dispatchEvent(new Event('scrollend'));
      await wait(100);
      expect(focus).not.toHaveBeenCalled();
      for (const call of querySelector.mock.calls) expect(call[0]).not.toContain('a,body');
      querySelector.mockRestore();
    });
  }

  it('ignores a click already prevented before it reaches the document', async () => {
    window.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
      },
      { capture: true, once: true },
    );
    click('to-contact');
    expect(html().style.scrollBehavior).toBe('');
    await wait(100);
    expect(focus).not.toHaveBeenCalled();
  });

  describe('Ask about this (same pathname, ?service=)', () => {
    let replaceState: ReturnType<typeof vi.spyOn>;
    let pushState: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      window.history.replaceState({ index: 3, scrollX: 0, scrollY: 0 }, '', '/');
      replaceState = vi.spyOn(window.history, 'replaceState');
      pushState = vi.spyOn(window.history, 'pushState');
    });

    afterEach(() => {
      replaceState.mockRestore();
      pushState.mockRestore();
    });

    const checked = (): string | undefined =>
      document.querySelector<HTMLInputElement>('input[name="service"]:checked')?.value;

    it('on: handles it locally, checks the chip, replaces only the hash and glides', async () => {
      const state: unknown = window.history.state;
      click('ask');
      expect(prevented).toEqual([true]);
      expect(checked()).toBe('branding');
      expect(replaceState).toHaveBeenCalledTimes(1);
      expect(replaceState.mock.calls[0]?.[0]).toBe(state);
      expect(String(replaceState.mock.calls[0]?.[2])).toMatch(/\/#contact$/);
      expect(window.location.search).toBe('');
      expect(window.location.hash).toBe('#contact');
      expect(pushState).not.toHaveBeenCalled();
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('contact'));
      expect(focus).not.toHaveBeenCalled();

      window.dispatchEvent(new Event('scrollend'));
      await flush();
      expect(focusedIds()).toEqual(['contact']);
    });

    it('reduced: jumps instantly and focuses after two frames', async () => {
      setMotion('reduced');
      click('ask');
      expect(prevented).toEqual([true]);
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' });
      await wait(100);
      expect(focusedIds()).toEqual(['contact']);
      expect(pushState).not.toHaveBeenCalled();
    });

    it('an injection payload in ?service= falls back to other and never throws', () => {
      document.getElementById('contact-service-branding')?.click();
      expect(() => {
        click('ask-bad');
      }).not.toThrow();
      expect(checked()).toBe('other');
    });

    it('leaves a ?service= link alone when the page has no such target', () => {
      document.getElementById('contact')?.removeAttribute('id');
      click('ask');
      expect(prevented).toEqual([false]);
      expect(replaceState).not.toHaveBeenCalled();
    });

    it('CR-01: never rewrites the search, so a second Ask click stays local', () => {
      click('ask');
      click('ask');
      expect(prevented).toEqual([true, true]);
      expect(replaceState).toHaveBeenCalledTimes(2);
      for (const call of replaceState.mock.calls) {
        const next = new URL(String(call[2]), window.location.href);
        expect(next.search).toBe('');
        expect(next.hash).toBe('#contact');
      }
      expect(window.location.search).toBe('');
      expect(checked()).toBe('branding');
      expect(pushState).not.toHaveBeenCalled();
    });

    it('CR-01: keeps the loaded ?service= in the URL while the chip follows the click', () => {
      window.history.replaceState({ index: 3 }, '', '/?service=web-design');
      replaceState.mockClear();
      click('ask');
      expect(prevented).toEqual([true]);
      expect(checked()).toBe('branding');
      expect(replaceState).toHaveBeenCalledTimes(1);
      expect(window.location.search).toBe('?service=web-design');
      expect(window.location.hash).toBe('#contact');
    });
  });

  // 09-04: the project filter rewrites ?category= with replaceState, so the router's private
  // originalLocation is stale and a same-search hash click would swap /projects/ onto itself
  // (09 RESEARCH Pitfall 2, 07-11 CR-01).
  describe('filtered page (same pathname and search, [data-project-filter])', () => {
    let replaceState: ReturnType<typeof vi.spyOn>;
    let pushState: ReturnType<typeof vi.spyOn>;

    function addFilter(): void {
      const fieldset = document.createElement('fieldset');
      fieldset.setAttribute('data-project-filter', '');
      document.getElementById('main')?.prepend(fieldset);
    }

    beforeEach(() => {
      window.history.replaceState(
        { index: 2, scrollX: 0, scrollY: 0 },
        '',
        '/?category=web-design',
      );
      replaceState = vi.spyOn(window.history, 'replaceState');
      pushState = vi.spyOn(window.history, 'pushState');
    });

    afterEach(() => {
      replaceState.mockRestore();
      pushState.mockRestore();
    });

    it('skip link: jumps locally, keeps ?category=, replaces only the hash, focuses #main', async () => {
      addFilter();
      const state: unknown = window.history.state;
      const length = window.history.length;
      click('skip');
      expect(prevented).toEqual([true]);
      expect(replaceState).toHaveBeenCalledTimes(1);
      expect(replaceState.mock.calls[0]?.[0]).toBe(state);
      expect(window.location.search).toBe('?category=web-design');
      expect(window.location.hash).toBe('#main');
      expect(window.history.length).toBe(length);
      expect(window.history.state).toBe(state);
      expect(pushState).not.toHaveBeenCalled();
      expect(html().style.scrollBehavior).toBe('');
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' });
      expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('main'));
      await wait(100);
      expect(focusedIds()).toEqual(['main']);
    });

    it('on: a plain same-page hash link glides locally and focuses at scrollend', async () => {
      addFilter();
      click('hash-contact');
      expect(prevented).toEqual([true]);
      expect(window.location.search).toBe('?category=web-design');
      expect(window.location.hash).toBe('#contact');
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      expect(html().style.scrollBehavior).toBe('');
      expect(focus).not.toHaveBeenCalled();
      window.dispatchEvent(new Event('scrollend'));
      await flush();
      expect(focusedIds()).toEqual(['contact']);
    });

    it('reduced: a plain same-page hash link jumps instantly', async () => {
      setMotion('reduced');
      addFilter();
      click('hash-contact');
      expect(prevented).toEqual([true]);
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' });
      await wait(100);
      expect(focusedIds()).toEqual(['contact']);
    });

    it('without the filter marker the native fragment path stays', async () => {
      click('skip');
      expect(prevented).toEqual([false]);
      expect(replaceState).not.toHaveBeenCalled();
      expect(scrollIntoView).not.toHaveBeenCalled();
      await wait(100);
      expect(focusedIds()).toEqual(['main']);
    });

    it('with the filter marker but an empty search the native fragment path stays', () => {
      addFilter();
      window.history.replaceState(window.history.state, '', '/');
      replaceState.mockClear();
      click('skip');
      expect(prevented).toEqual([false]);
      expect(replaceState).not.toHaveBeenCalled();
    });
  });

  it('unbind removes the hook', async () => {
    unbind();
    click('to-contact');
    expect(html().style.scrollBehavior).toBe('');
    window.dispatchEvent(new Event('scrollend'));
    await wait(100);
    expect(focus).not.toHaveBeenCalled();
  });
});

// 07-11 WR-03: focus targets are made focusable, and focus never stays on body.
describe('ensureFocusable / focusWithFallback', () => {
  beforeEach(() => {
    page(
      `${PAGE}<div id="note">n</div><span id="kept" tabindex="0">k</span><button id="btn">b</button>`,
    );
    (document.activeElement as HTMLElement | null)?.blur();
  });

  it('adds tabindex=-1 to a plain element', () => {
    const note = document.getElementById('note');
    if (!note) throw new Error('#note missing');
    expect(ensureFocusable(note)).toBe(note);
    expect(note.getAttribute('tabindex')).toBe('-1');
  });

  it('keeps an existing tabindex and leaves native controls alone', () => {
    const kept = document.getElementById('kept');
    const btn = document.getElementById('btn');
    if (!kept || !btn) throw new Error('fixture missing');
    ensureFocusable(kept);
    ensureFocusable(btn);
    expect(kept.getAttribute('tabindex')).toBe('0');
    expect(btn.hasAttribute('tabindex')).toBe(false);
  });

  it('focuses a plain div after making it focusable', () => {
    const note = document.getElementById('note');
    focusWithFallback(document, note);
    expect(document.activeElement).toBe(note);
  });

  it('falls through to main h1, then #main, never body', () => {
    const note = document.getElementById('note');
    if (!note) throw new Error('#note missing');
    Object.defineProperty(note, 'focus', { value: () => undefined });
    focusWithFallback(document, note);
    expect(document.activeElement).toBe(document.querySelector('main h1'));

    page('<main id="main" tabindex="-1"><div id="note">n</div></main>');
    const bare = document.getElementById('note');
    if (!bare) throw new Error('#note missing');
    Object.defineProperty(bare, 'focus', { value: () => undefined });
    focusWithFallback(document, bare);
    expect(document.activeElement).toBe(document.getElementById('main'));
    expect(document.activeElement).not.toBe(document.body);
  });

  it('uses the fallback chain when there is no primary', () => {
    focusWithFallback(document, null);
    expect(document.activeElement).toBe(document.querySelector('main h1'));
  });
});
