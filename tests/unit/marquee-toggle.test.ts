// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLifecycle } from '../../src/lib/motion/lifecycle';
import { initMarqueeToggles } from '../../src/lib/motion/marquee';

const FIXTURE = `<section data-marquee><button type="button" data-marquee-toggle aria-pressed="false" aria-label="Pause roles animation"></button></section>`;

function getButton(): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>('[data-marquee-toggle]');
  expect(button).not.toBeNull();
  if (!button) throw new Error('fixture button missing');
  return button;
}

function getSection(): HTMLElement {
  const section = document.querySelector<HTMLElement>('[data-marquee]');
  expect(section).not.toBeNull();
  if (!section) throw new Error('fixture section missing');
  return section;
}

describe('initMarqueeToggles', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns undefined when there is no toggle', () => {
    document.body.innerHTML = '';
    expect(initMarqueeToggles(document)).toBeUndefined();
  });

  it('toggles aria-pressed and data-paused on each click', () => {
    const cleanup = initMarqueeToggles(document);
    const button = getButton();
    const section = getSection();

    button.click();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(section.hasAttribute('data-paused')).toBe(true);

    button.click();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(section.hasAttribute('data-paused')).toBe(false);

    cleanup?.();
  });

  it('marks an explicit resume with data-playing, exclusive with data-paused', () => {
    const cleanup = initMarqueeToggles(document);
    const button = getButton();
    const section = getSection();
    expect(section.hasAttribute('data-playing')).toBe(false);

    button.click();
    expect(section.hasAttribute('data-paused')).toBe(true);
    expect(section.hasAttribute('data-playing')).toBe(false);

    button.click();
    expect(section.hasAttribute('data-paused')).toBe(false);
    expect(section.hasAttribute('data-playing')).toBe(true);

    cleanup?.();
  });

  it('keeps a fixed aria-label across clicks', () => {
    const cleanup = initMarqueeToggles(document);
    const button = getButton();

    button.click();
    expect(button.getAttribute('aria-label')).toBe('Pause roles animation');
    button.click();
    expect(button.getAttribute('aria-label')).toBe('Pause roles animation');

    cleanup?.();
  });

  it('stops reacting to clicks after cleanup', () => {
    const cleanup = initMarqueeToggles(document);
    expect(cleanup).toBeTypeOf('function');
    cleanup?.();

    const button = getButton();
    button.click();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(getSection().hasAttribute('data-paused')).toBe(false);
  });

  it('stays idempotent across 10 lifecycle unmount/mount cycles', () => {
    const lifecycle = createLifecycle(document);
    lifecycle.register(initMarqueeToggles);
    lifecycle.mount();

    for (let i = 0; i < 10; i += 1) {
      lifecycle.unmount();
      lifecycle.mount();
    }
    expect(lifecycle.activeCleanups).toBe(1);

    // A duplicated listener would toggle twice and leave "false".
    getButton().click();
    expect(getButton().getAttribute('aria-pressed')).toBe('true');
    expect(getSection().hasAttribute('data-paused')).toBe(true);

    lifecycle.unmount();
  });
});
