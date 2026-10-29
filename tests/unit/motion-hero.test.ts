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

function fireAnimationEnd(target: Element): void {
  target.dispatchEvent(new Event('animationend', { bubbles: true }));
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
    expect(createHeroPlayed({ now: () => 0 })(document)).toBeUndefined();
  });

  it.each(['reduced', 'off'])('marks the hero played at once under %s', (state) => {
    setMotion(state);
    createHeroPlayed({ now: () => 0 })(document);
    expect(hero().hasAttribute('data-hero-played')).toBe(true);
  });

  it('marks the hero played at once when it mounts after 1000ms under on', () => {
    setMotion('on');
    createHeroPlayed({ now: () => 1000 })(document);
    expect(hero().hasAttribute('data-hero-played')).toBe(true);
  });

  it('waits for the CTA animationend when it mounts early under on', () => {
    setMotion('on');
    document.querySelector('[data-hero-portrait]')?.remove();
    const cleanup = createHeroPlayed({ now: () => 120 })(document);
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
    const cleanup = createHeroPlayed({ now: () => 120 })(document);
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
    const cleanup = createHeroPlayed({ now: () => 0 })(document);
    const link = cta().querySelector('a');
    if (link) fireAnimationEnd(link);
    expect(hero().hasAttribute('data-hero-played')).toBe(false);
    cleanup?.();
  });

  it('marks the hero played on any motion:change while waiting', () => {
    setMotion('on');
    const cleanup = createHeroPlayed({ now: () => 0 })(document);
    dispatchMotionChange(document, 'reduced');
    expect(hero().hasAttribute('data-hero-played')).toBe(true);
    cleanup?.();
  });

  it('cleanup removes listeners and keeps data-hero-played', () => {
    setMotion('on');
    const cleanup = createHeroPlayed({ now: () => 0 })(document);
    cleanup?.();
    fireAnimationEnd(cta());
    dispatchMotionChange(document, 'reduced');
    expect(hero().hasAttribute('data-hero-played')).toBe(false);

    hero().setAttribute('data-hero-played', '');
    const again = createHeroPlayed({ now: () => 0 })(document);
    again?.();
    expect(hero().hasAttribute('data-hero-played')).toBe(true);
  });
});
