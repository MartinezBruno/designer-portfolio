// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dispatchMotionChange } from '../../src/lib/motion/events';
import { createHeroPlayed } from '../../src/lib/motion/hero';

const FIXTURE = `
<section data-hero aria-labelledby="hero-title">
  <h1 id="hero-title">
    <span class="block" data-hero-line><span class="block" data-hero-line-inner>Hi, I'm</span></span>
    <span class="block" data-hero-line><span class="block" data-hero-line-inner>Martina.</span></span>
  </h1>
  <p data-hero-lead>Lead</p>
  <div data-hero-cta><a href="#contact">Contact</a></div>
  <picture data-hero-portrait><img alt="" src="data:," /></picture>
</section>`;

function hero(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-hero]');
  if (!el) throw new Error('fixture hero missing');
  return el;
}

function cta(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-hero-cta]');
  if (!el) throw new Error('fixture cta missing');
  return el;
}

function setMotion(state: string): void {
  document.documentElement.dataset['motion'] = state;
}

function fireAnimationEnd(target: Element, type = 'animationend'): void {
  target.dispatchEvent(new Event(type, { bubbles: true }));
}

/** happy-dom runs no CSS animations: stub each element's own animation state. */
function animating(...selectors: string[]): void {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`fixture ${selector} missing`);
    el.getAnimations = () => [{ pending: false, playState: 'running' } as Animation];
  }
}

describe('createHeroPlayed', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete document.documentElement.dataset['motion'];
  });

  it('returns undefined when there is no hero', () => {
    document.body.innerHTML = '';
    setMotion('on');
    expect(createHeroPlayed()(document)).toBeUndefined();
  });

  it.each(['reduced', 'off'])('marks the hero played at once under %s', (state) => {
    setMotion(state);
    createHeroPlayed()(document);
    expect(hero().hasAttribute('data-hero-played')).toBe(true);
  });

  it('marks the hero played at once when its animations already ended under on', () => {
    setMotion('on');
    const finished = [{ pending: false, playState: 'finished' } as Animation];
    cta().getAnimations = () => finished;
    createHeroPlayed()(document);
    expect(hero().hasAttribute('data-hero-played')).toBe(true);
  });

  it('waits only for the elements still animating at mount', () => {
    setMotion('on');
    animating('[data-hero-cta]');
    const cleanup = createHeroPlayed()(document);
    expect(hero().hasAttribute('data-hero-played')).toBe(false);
    fireAnimationEnd(cta());
    expect(hero().hasAttribute('data-hero-played')).toBe(true);
    cleanup?.();
  });

  it('counts a pending animation (not yet started) as still to run', () => {
    setMotion('on');
    cta().getAnimations = () => [{ pending: true, playState: 'idle' } as Animation];
    const cleanup = createHeroPlayed()(document);
    expect(hero().hasAttribute('data-hero-played')).toBe(false);
    cleanup?.();
  });

  it('treats animationcancel like animationend', () => {
    setMotion('on');
    animating('[data-hero-cta]', '[data-hero-portrait]');
    const cleanup = createHeroPlayed()(document);
    fireAnimationEnd(cta(), 'animationcancel');
    const portrait = document.querySelector('[data-hero-portrait]');
    if (portrait) fireAnimationEnd(portrait, 'animationcancel');
    expect(hero().hasAttribute('data-hero-played')).toBe(true);
    cleanup?.();
  });

  it('waits for the CTA animationend when it mounts early under on', () => {
    setMotion('on');
    document.querySelector('[data-hero-portrait]')?.remove();
    animating('[data-hero-cta]');
    const cleanup = createHeroPlayed()(document);
    expect(hero().hasAttribute('data-hero-played')).toBe(false);

    // Another hero element finishing does not end the sequence.
    const lead = document.querySelector('[data-hero-lead]');
    if (lead) fireAnimationEnd(lead);
    expect(hero().hasAttribute('data-hero-played')).toBe(false);

    fireAnimationEnd(cta());
    expect(hero().hasAttribute('data-hero-played')).toBe(true);
    cleanup?.();
  });

  it('also waits for the portrait, which finishes last (960ms), before marking played', () => {
    setMotion('on');
    animating('[data-hero-cta]', '[data-hero-portrait]');
    const cleanup = createHeroPlayed()(document);
    fireAnimationEnd(cta());
    expect(hero().hasAttribute('data-hero-played')).toBe(false);

    const portrait = document.querySelector('[data-hero-portrait]');
    // The img's scale animation bubbles up; only the picture's own shutter counts.
    const img = portrait?.querySelector('img');
    if (img) fireAnimationEnd(img);
    expect(hero().hasAttribute('data-hero-played')).toBe(false);

    if (portrait) fireAnimationEnd(portrait);
    expect(hero().hasAttribute('data-hero-played')).toBe(true);
    cleanup?.();
  });

  it('ignores an animationend that bubbles up from inside the CTA row', () => {
    setMotion('on');
    animating('[data-hero-cta]');
    const cleanup = createHeroPlayed()(document);
    const link = cta().querySelector('a');
    if (link) fireAnimationEnd(link);
    expect(hero().hasAttribute('data-hero-played')).toBe(false);
    cleanup?.();
  });

  it('marks the hero played on any motion:change while waiting', () => {
    setMotion('on');
    animating('[data-hero-cta]');
    const cleanup = createHeroPlayed()(document);
    dispatchMotionChange(document, 'reduced');
    expect(hero().hasAttribute('data-hero-played')).toBe(true);
    cleanup?.();
  });

  it('cleanup removes listeners and keeps data-hero-played', () => {
    setMotion('on');
    animating('[data-hero-cta]');
    const cleanup = createHeroPlayed()(document);
    cleanup?.();
    fireAnimationEnd(cta());
    dispatchMotionChange(document, 'reduced');
    expect(hero().hasAttribute('data-hero-played')).toBe(false);

    hero().setAttribute('data-hero-played', '');
    const again = createHeroPlayed()(document);
    again?.();
    expect(hero().hasAttribute('data-hero-played')).toBe(true);
  });
});
