// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchMotionChange } from '../../src/lib/motion/events';
import { createLifecycle } from '../../src/lib/motion/lifecycle';
import type { GsapModules } from '../../src/lib/motion/load-gsap';
import { createReveal, revealDelay, type RevealDeps } from '../../src/lib/motion/reveal';
import { FakeSplitText, makeGsapFake, type GsapFake } from './helpers/fake-gsap';
import { FakeIntersectionObserver } from './helpers/fake-io';

const FIXTURE = `
  <h2 id="h" data-reveal="lines">Heading</h2>
  <ul id="list" data-reveal-stagger="70">
    <li id="a" data-reveal="settle" data-reveal-delay="140"><a id="a-link" href="#">A</a></li>
    <li id="b" data-reveal="settle" data-reveal-delay="140">B</li>
    <li id="c" data-reveal="settle" data-reveal-delay="140">C</li>
  </ul>
  <ul id="grid" data-reveal-stagger="90">
    <li id="card1"><article>
      <div id="cover1" data-reveal="shutter"><picture></picture></div>
      <div id="text1" data-reveal="settle" data-reveal-delay="70"><h3><a id="card1-link" href="#">One</a></h3></div>
    </article></li>
    <li id="card2"><article>
      <div id="cover2" data-reveal="shutter"><picture></picture></div>
      <div id="text2" data-reveal="settle" data-reveal-delay="70">Two</div>
    </article></li>
  </ul>
`;

function el(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`fixture #${id} missing`);
  return found;
}

function all(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
}

function makeDeps(now = 100): RevealDeps {
  return {
    now: () => now,
    createObserver: (cb, init) => new FakeIntersectionObserver(cb, init),
  };
}

function setMotion(state: string): void {
  document.documentElement.dataset['motion'] = state;
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

describe('revealDelay', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses the authored base when there is no stagger root', () => {
    expect(revealDelay(el('h'), [el('h')])).toBe(0);
    el('h').dataset['revealDelay'] = '210';
    expect(revealDelay(el('h'), [el('h')])).toBe(210);
  });

  it('clamps the base to 0..600 and treats junk as 0', () => {
    const h = el('h');
    h.dataset['revealDelay'] = '9000';
    expect(revealDelay(h, [h])).toBe(600);
    h.dataset['revealDelay'] = '-50';
    expect(revealDelay(h, [h])).toBe(0);
    h.dataset['revealDelay'] = 'nope';
    expect(revealDelay(h, [h])).toBe(0);
    h.dataset['revealDelay'] = '1e3';
    expect(revealDelay(h, [h])).toBe(0);
  });

  it('adds the stagger step per DOM-order index within the batch', () => {
    const batch = [el('a'), el('b'), el('c')];
    expect(revealDelay(el('a'), batch)).toBe(140);
    expect(revealDelay(el('b'), batch)).toBe(210);
    expect(revealDelay(el('c'), batch)).toBe(280);
    // Index is relative to the batch, not to the list.
    expect(revealDelay(el('c'), [el('c')])).toBe(140);
  });

  it('shares an index between elements under the same stagger child (card cover + text)', () => {
    const batch = [el('cover1'), el('text1'), el('cover2'), el('text2')];
    expect(revealDelay(el('cover1'), batch)).toBe(0);
    expect(revealDelay(el('text1'), batch)).toBe(70);
    expect(revealDelay(el('cover2'), batch)).toBe(90);
    expect(revealDelay(el('text2'), batch)).toBe(160);
  });

  it('caps the index at 4 (the 5th item)', () => {
    const list = el('list');
    for (let i = 0; i < 4; i += 1) {
      const li = document.createElement('li');
      li.dataset['reveal'] = 'settle';
      li.id = `extra${String(i)}`;
      list.append(li);
    }
    const batch = [...list.querySelectorAll('[data-reveal]')];
    expect(batch).toHaveLength(7);
    // a, b, c carry a 140ms base; the four extras have none.
    expect(revealDelay(batch[3] as Element, batch)).toBe(3 * 70);
    expect(revealDelay(batch[4] as Element, batch)).toBe(4 * 70);
    expect(revealDelay(batch[6] as Element, batch)).toBe(4 * 70);
  });

  it('clamps the step to 0..90 and defaults to 70 when the value is invalid', () => {
    const batch = [el('a'), el('b')];
    el('list').dataset['revealStagger'] = '500';
    expect(revealDelay(el('b'), batch)).toBe(140 + 90);
    el('list').dataset['revealStagger'] = '';
    expect(revealDelay(el('b'), batch)).toBe(140 + 70);
    el('list').dataset['revealStagger'] = 'x';
    expect(revealDelay(el('b'), batch)).toBe(140 + 70);
  });
});

describe('createReveal', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
    FakeIntersectionObserver.reset();
    setMotion('on');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    setMotion('off');
    vi.restoreAllMocks();
  });

  it("does nothing under 'off'", () => {
    setMotion('off');
    expect(createReveal(makeDeps())(document)).toBeUndefined();
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    for (const node of all()) {
      expect(node.hasAttribute('data-reveal-armed')).toBe(false);
      expect(node.hasAttribute('data-revealed')).toBe(false);
    }
  });

  it.each(['on', 'reduced'])("arms and observes every element once under '%s'", (state) => {
    setMotion(state);
    const cleanup = createReveal(makeDeps())(document);
    const io = FakeIntersectionObserver.last();
    expect(io.init.rootMargin).toBe('0px 0px -12% 0px');
    expect(io.init.threshold).toBe(0);
    for (const node of all()) {
      expect(node.hasAttribute('data-reveal-armed')).toBe(true);
      expect(io.observed.has(node)).toBe(true);
    }
    expect(io.observed.size).toBe(all().length);
    cleanup?.();
  });

  it('reveals intersecting entries once, in DOM order, with delays, and unobserves them', () => {
    const cleanup = createReveal(makeDeps())(document);
    const io = FakeIntersectionObserver.last();
    // Out of DOM order on purpose.
    io.trigger([el('c'), el('a'), el('b')]);
    expect(el('a').hasAttribute('data-revealed')).toBe(true);
    expect(el('a').style.getPropertyValue('--reveal-delay')).toBe('140ms');
    expect(el('b').style.getPropertyValue('--reveal-delay')).toBe('210ms');
    expect(el('c').style.getPropertyValue('--reveal-delay')).toBe('280ms');
    expect(io.observed.has(el('a'))).toBe(false);
    expect(io.unobserved).toEqual(expect.arrayContaining([el('a'), el('b'), el('c')]));
    expect(el('h').hasAttribute('data-revealed')).toBe(false);
    cleanup?.();
  });

  // 06-10 review decision 10: card tops inside the first screen but within the -12% band stayed
  // blank until the first scroll. A one-shot observer with no margin reveals them at mount.
  describe('mount-time viewport pass', () => {
    function mountObserver(): FakeIntersectionObserver {
      const io = FakeIntersectionObserver.instances.find((o) => o.init.rootMargin === '0px');
      if (!io) throw new Error('no mount observer');
      return io;
    }

    it('observes every armed element with no margin, beside the -12% trigger', () => {
      const cleanup = createReveal(makeDeps())(document);
      const mount = mountObserver();
      expect(mount.init.threshold).toBe(0);
      expect(FakeIntersectionObserver.last().init.rootMargin).toBe('0px 0px -12% 0px');
      for (const node of all()) {
        if (node.dataset['reveal'] === 'lines') continue; // lines wait for GSAP under 'on'
        expect(mount.observed.has(node)).toBe(true);
      }
      cleanup?.();
    });

    it('reveals what is already in the viewport as one staggered batch, then disconnects', () => {
      const cleanup = createReveal(makeDeps())(document);
      const mount = mountObserver();
      const main = FakeIntersectionObserver.last();
      mount.trigger([el('cover2'), el('cover1'), el('text1'), el('text2')]);
      expect(el('cover1').hasAttribute('data-revealed')).toBe(true);
      expect(el('cover1').hasAttribute('data-reveal-instant')).toBe(false);
      expect(el('cover1').style.getPropertyValue('--reveal-delay')).toBe('0ms');
      expect(el('text1').style.getPropertyValue('--reveal-delay')).toBe('70ms');
      expect(el('cover2').style.getPropertyValue('--reveal-delay')).toBe('90ms');
      expect(el('text2').style.getPropertyValue('--reveal-delay')).toBe('160ms');
      expect(main.observed.has(el('cover1'))).toBe(false);
      expect(mount.disconnected).toBe(true);
      cleanup?.();
    });

    it('leaves elements outside the viewport armed for the scroll trigger', () => {
      const cleanup = createReveal(makeDeps())(document);
      const mount = mountObserver();
      const main = FakeIntersectionObserver.last();
      mount.trigger([el('a')]);
      mount.trigger([el('b')]); // ignored: the pass runs once
      expect(el('a').hasAttribute('data-revealed')).toBe(true);
      expect(el('b').hasAttribute('data-revealed')).toBe(false);
      expect(el('b').hasAttribute('data-reveal-armed')).toBe(true);
      expect(main.observed.has(el('b'))).toBe(true);
      main.trigger([el('b')]);
      expect(el('b').hasAttribute('data-revealed')).toBe(true);
      cleanup?.();
    });

    it('does not reveal twice when both observers report the same element', () => {
      const cleanup = createReveal(makeDeps())(document);
      const mount = mountObserver();
      const main = FakeIntersectionObserver.last();
      main.trigger([el('a')]);
      const delay = el('a').style.getPropertyValue('--reveal-delay');
      mount.trigger([el('a'), el('b')]);
      expect(el('a').style.getPropertyValue('--reveal-delay')).toBe(delay);
      expect(el('b').hasAttribute('data-revealed')).toBe(true);
      cleanup?.();
    });

    it('cleanup disconnects the mount observer', () => {
      const cleanup = createReveal(makeDeps())(document);
      const mount = mountObserver();
      cleanup?.();
      expect(mount.disconnected).toBe(true);
    });
  });

  it('ignores non-intersecting entries', () => {
    const cleanup = createReveal(makeDeps())(document);
    const io = FakeIntersectionObserver.last();
    io.trigger([el('h')], false);
    expect(el('h').hasAttribute('data-revealed')).toBe(false);
    expect(io.observed.has(el('h'))).toBe(true);
    cleanup?.();
  });

  it('late mount reveals in-view elements instantly and arms the ones below', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    const below = new Set(['card1', 'card2', 'cover1', 'text1', 'cover2', 'text2']);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const inGrid = below.has(this.id) || this.closest('#grid') !== null;
      const top = inGrid ? 1200 : 100;
      return { top, bottom: top + 50, left: 0, right: 100, width: 100, height: 50 } as DOMRect;
    });
    const cleanup = createReveal(makeDeps(4000))(document);
    const io = FakeIntersectionObserver.last();
    for (const id of ['h', 'a', 'b', 'c']) {
      expect(el(id).hasAttribute('data-revealed')).toBe(true);
      expect(el(id).hasAttribute('data-reveal-instant')).toBe(true);
      expect(io.observed.has(el(id))).toBe(false);
    }
    for (const id of ['cover1', 'text1', 'cover2', 'text2']) {
      expect(el(id).hasAttribute('data-revealed')).toBe(false);
      expect(el(id).hasAttribute('data-reveal-armed')).toBe(true);
      expect(io.observed.has(el(id))).toBe(true);
    }
    cleanup?.();
  });

  it('focus inside an unrevealed element reveals it instantly', () => {
    const cleanup = createReveal(makeDeps())(document);
    el('a-link').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(el('a').hasAttribute('data-revealed')).toBe(true);
    expect(el('a').hasAttribute('data-reveal-instant')).toBe(true);
    expect(el('b').hasAttribute('data-revealed')).toBe(false);
    cleanup?.();
  });

  it('focus inside an article reveals every element of that card', () => {
    const cleanup = createReveal(makeDeps())(document);
    el('card1-link').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(el('text1').hasAttribute('data-revealed')).toBe(true);
    expect(el('cover1').hasAttribute('data-revealed')).toBe(true);
    expect(el('cover1').hasAttribute('data-reveal-instant')).toBe(true);
    expect(el('cover2').hasAttribute('data-revealed')).toBe(false);
    const io = FakeIntersectionObserver.last();
    expect(io.observed.has(el('cover1'))).toBe(false);
    cleanup?.();
  });

  it('scrollend at the bottom reveals everything still pending', () => {
    const cleanup = createReveal(makeDeps())(document);
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(1000);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    const scrollHeight = vi
      .spyOn(document.documentElement, 'scrollHeight', 'get')
      .mockReturnValue(5000);
    window.dispatchEvent(new Event('scrollend'));
    expect(el('c').hasAttribute('data-revealed')).toBe(false);

    scrollHeight.mockReturnValue(1801);
    window.dispatchEvent(new Event('scrollend'));
    for (const node of all()) expect(node.hasAttribute('data-revealed')).toBe(true);
    cleanup?.();
  });

  it('cleanup disconnects, removes listeners and delays, and keeps data-revealed', () => {
    const cleanup = createReveal(makeDeps())(document);
    const io = FakeIntersectionObserver.last();
    io.trigger([el('a')]);
    expect(cleanup).toBeTypeOf('function');
    cleanup?.();
    expect(io.disconnected).toBe(true);
    expect(el('a').hasAttribute('data-revealed')).toBe(true);
    expect(el('a').style.getPropertyValue('--reveal-delay')).toBe('');

    el('card1-link').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(el('text1').hasAttribute('data-revealed')).toBe(false);
  });

  it('stays idempotent across 10 lifecycle unmount/mount cycles', () => {
    const lifecycle = createLifecycle(document);
    lifecycle.register(createReveal(makeDeps()));
    lifecycle.mount();
    for (let i = 0; i < 10; i += 1) {
      lifecycle.unmount();
      lifecycle.mount();
    }
    expect(lifecycle.activeCleanups).toBe(1);
    const live = FakeIntersectionObserver.instances.filter((io) => !io.disconnected);
    expect(live).toHaveLength(1);
    lifecycle.unmount();
  });
});

describe('createReveal lines driver (SplitText)', () => {
  let fake: GsapFake;

  beforeEach(() => {
    document.body.innerHTML = `${FIXTURE}<h2 id="h2" data-reveal="lines">Second</h2>`;
    FakeIntersectionObserver.reset();
    FakeSplitText.reset();
    fake = makeGsapFake();
    setMotion('on');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    setMotion('off');
    vi.restoreAllMocks();
  });

  function withGsap(
    load: () => Promise<GsapModules> = () => Promise.resolve(fake.modules),
  ): RevealDeps & { loadGsap: ReturnType<typeof vi.fn> } {
    return { ...makeDeps(), loadGsap: vi.fn(load) };
  }

  function switchTo(state: 'on' | 'reduced'): void {
    setMotion(state);
    dispatchMotionChange(document, state);
  }

  it("under 'on' arms lines only after GSAP loads, then splits them on intersection", async () => {
    const deps = withGsap();
    const cleanup = createReveal(deps)(document);
    const io = FakeIntersectionObserver.last();
    expect(deps.loadGsap).toHaveBeenCalledTimes(1);
    expect(el('h').hasAttribute('data-reveal-armed')).toBe(false);
    expect(io.observed.has(el('h'))).toBe(false);
    // CSS-driven kinds arm at mount.
    expect(el('a').hasAttribute('data-reveal-armed')).toBe(true);

    await flush();
    expect(el('h').hasAttribute('data-reveal-armed')).toBe(true);
    expect(io.observed.has(el('h'))).toBe(true);

    io.trigger([el('h')]);
    expect(FakeSplitText.created).toHaveLength(1);
    expect(FakeSplitText.created[0]?.target).toBe(el('h'));
    expect(el('h').hasAttribute('data-revealed')).toBe(true);
    expect(el('h').style.getPropertyValue('--reveal-delay')).toBe('');
    expect(io.observed.has(el('h'))).toBe(false);
    cleanup?.();
  });

  it('a lines heading that wraps a link falls back to the CSS reveal', async () => {
    el('h').innerHTML = '<a href="#">Linked</a>';
    const cleanup = createReveal(withGsap())(document);
    await flush();
    FakeIntersectionObserver.last().trigger([el('h')]);
    expect(FakeSplitText.created).toHaveLength(0);
    expect(el('h').hasAttribute('data-revealed')).toBe(true);
    cleanup?.();
  });

  it('shows every unrevealed lines heading instantly when GSAP fails to load', async () => {
    const cleanup = createReveal(withGsap(() => Promise.reject(new Error('chunk 404'))))(document);
    await flush();
    for (const id of ['h', 'h2']) {
      expect(el(id).hasAttribute('data-revealed')).toBe(true);
      expect(el(id).hasAttribute('data-reveal-instant')).toBe(true);
    }
    expect(FakeSplitText.created).toHaveLength(0);
    cleanup?.();
  });

  it("under 'reduced' arms lines at mount, fades them and never loads GSAP", () => {
    setMotion('reduced');
    const deps = withGsap();
    const cleanup = createReveal(deps)(document);
    const io = FakeIntersectionObserver.last();
    expect(el('h').hasAttribute('data-reveal-armed')).toBe(true);
    io.trigger([el('h')]);
    expect(el('h').hasAttribute('data-revealed')).toBe(true);
    expect(deps.loadGsap).not.toHaveBeenCalled();
    expect(FakeSplitText.created).toHaveLength(0);
    cleanup?.();
  });

  it("switching to 'reduced' mid-rise finishes and reverts the split; waiting lines fade", async () => {
    const cleanup = createReveal(withGsap())(document);
    await flush();
    const io = FakeIntersectionObserver.last();
    io.trigger([el('h')]);
    const split = FakeSplitText.created[0];
    switchTo('reduced');
    expect(fake.tweens[0]?.progress).toHaveBeenCalledWith(1);
    expect(split?.reverted).toBe(1);
    expect(el('h').querySelector('.split-line-mask')).toBeNull();

    io.trigger([el('h2')]);
    expect(el('h2').hasAttribute('data-revealed')).toBe(true);
    expect(FakeSplitText.created).toHaveLength(1);
    cleanup?.();
  });

  it("switching to 'reduced' while GSAP loads arms the waiting lines for the fade", () => {
    const cleanup = createReveal(withGsap(() => new Promise(() => undefined)))(document);
    const io = FakeIntersectionObserver.last();
    expect(el('h').hasAttribute('data-reveal-armed')).toBe(false);
    switchTo('reduced');
    expect(el('h').hasAttribute('data-reveal-armed')).toBe(true);
    expect(io.observed.has(el('h'))).toBe(true);
    io.trigger([el('h')]);
    expect(el('h').hasAttribute('data-revealed')).toBe(true);
    expect(FakeSplitText.created).toHaveLength(0);
    cleanup?.();
  });

  it("switching to 'on' loads GSAP once for waiting lines and leaves revealed ones alone", async () => {
    setMotion('reduced');
    const deps = withGsap();
    const cleanup = createReveal(deps)(document);
    const io = FakeIntersectionObserver.last();
    io.trigger([el('h'), el('a')]);
    const before = el('h').outerHTML;

    switchTo('on');
    switchTo('on');
    expect(deps.loadGsap).toHaveBeenCalledTimes(1);
    await flush();
    expect(el('h').outerHTML).toBe(before);

    io.trigger([el('h2')]);
    expect(FakeSplitText.created).toHaveLength(1);
    expect(FakeSplitText.created[0]?.target).toBe(el('h2'));
    cleanup?.();
  });

  it('cleanup reverts the GSAP context (splits restored)', async () => {
    const cleanup = createReveal(withGsap())(document);
    await flush();
    FakeIntersectionObserver.last().trigger([el('h')]);
    cleanup?.();
    expect(fake.revert).toHaveBeenCalledTimes(1);
  });

  it('a load that resolves after cleanup arms nothing', async () => {
    const cleanup = createReveal(withGsap())(document);
    cleanup?.();
    await flush();
    expect(el('h').hasAttribute('data-reveal-armed')).toBe(false);
    expect(fake.context).not.toHaveBeenCalled();
  });
});
