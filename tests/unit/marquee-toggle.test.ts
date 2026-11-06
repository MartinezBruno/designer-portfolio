// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dispatchMotionChange } from '../../src/lib/motion/events';
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

function pointer(
  target: Element,
  type: 'pointerenter' | 'pointerleave',
  pointerType = 'mouse',
): void {
  target.dispatchEvent(new PointerEvent(type, { pointerType }));
}

/** aria-pressed and data-paused must always agree (WR-01). */
function expectPaused(paused: boolean): void {
  expect(getButton().getAttribute('aria-pressed')).toBe(String(paused));
  expect(getSection().hasAttribute('data-paused')).toBe(paused);
}

// happy-dom cannot evaluate :focus-visible, so the tests inject the check.
const alwaysFocusVisible = (): boolean => true;
const neverFocusVisible = (): boolean => false;

describe('initMarqueeToggles', () => {
  beforeEach(() => {
    document.documentElement.dataset['motion'] = 'on';
    document.body.innerHTML = FIXTURE;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete document.documentElement.dataset['motion'];
  });

  it('returns undefined when there is no toggle', () => {
    document.body.innerHTML = '';
    expect(initMarqueeToggles(document)).toBeUndefined();
  });

  it('toggles aria-pressed and data-paused on each click', () => {
    const cleanup = initMarqueeToggles(document);

    getButton().click();
    expectPaused(true);

    getButton().click();
    expectPaused(false);

    cleanup?.();
  });

  it('never sets data-playing (CSS pauses only through data-paused)', () => {
    const cleanup = initMarqueeToggles(document);
    getButton().click();
    getButton().click();
    expect(getSection().hasAttribute('data-playing')).toBe(false);
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

  it('mirrors a mouse hover pause in aria-pressed and data-paused', () => {
    const cleanup = initMarqueeToggles(document);
    expectPaused(false);

    pointer(getSection(), 'pointerenter');
    expectPaused(true);

    pointer(getSection(), 'pointerleave');
    expectPaused(false);

    cleanup?.();
  });

  it('ignores touch pointers, so a tap pauses on the first try', () => {
    const cleanup = initMarqueeToggles(document);

    pointer(getSection(), 'pointerenter', 'touch');
    expectPaused(false);
    getButton().click();
    pointer(getSection(), 'pointerleave', 'touch');
    expectPaused(true);

    cleanup?.();
  });

  it('lets an explicit click win over the hover pause', () => {
    const cleanup = initMarqueeToggles(document);
    const section = getSection();

    pointer(section, 'pointerenter');
    expectPaused(true);

    // Click while hovered resumes, matching what the user sees.
    getButton().click();
    expectPaused(false);
    pointer(section, 'pointerleave');
    expectPaused(false);

    // A second click is an explicit pause that survives leaving.
    pointer(section, 'pointerenter');
    expectPaused(false);
    getButton().click();
    expectPaused(true);
    pointer(section, 'pointerleave');
    expectPaused(true);

    cleanup?.();
  });

  it('pauses transiently on keyboard focus and resumes on blur', () => {
    const cleanup = initMarqueeToggles(document, alwaysFocusVisible);
    const button = getButton();

    button.dispatchEvent(new FocusEvent('focus'));
    expectPaused(true);

    button.dispatchEvent(new FocusEvent('blur'));
    expectPaused(false);

    cleanup?.();
  });

  it('does not pause on a focus that is not focus-visible (mouse focus)', () => {
    const cleanup = initMarqueeToggles(document, neverFocusVisible);
    getButton().dispatchEvent(new FocusEvent('focus'));
    expectPaused(false);
    cleanup?.();
  });

  it('lets Space/click while keyboard-focused resume, then keeps the choice after blur', () => {
    const cleanup = initMarqueeToggles(document, alwaysFocusVisible);
    const button = getButton();

    button.dispatchEvent(new FocusEvent('focus'));
    expectPaused(true);
    button.click();
    expectPaused(false);
    button.dispatchEvent(new FocusEvent('blur'));
    expectPaused(false);

    cleanup?.();
  });

  it('ignores hover and focus when motion is not on', () => {
    document.documentElement.dataset['motion'] = 'reduced';
    const cleanup = initMarqueeToggles(document, alwaysFocusVisible);

    pointer(getSection(), 'pointerenter');
    getButton().dispatchEvent(new FocusEvent('focus'));
    expectPaused(false);

    cleanup?.();
  });

  it('resets an explicit pause when motion leaves "on" and stays running when it returns', () => {
    const cleanup = initMarqueeToggles(document);

    getButton().click();
    expectPaused(true);

    document.documentElement.dataset['motion'] = 'reduced';
    dispatchMotionChange(document, 'reduced');
    expectPaused(false);

    document.documentElement.dataset['motion'] = 'on';
    dispatchMotionChange(document, 'on');
    expectPaused(false);

    // The explicit choice was cleared: the next click pauses again.
    getButton().click();
    expectPaused(true);

    cleanup?.();
  });

  it('clears a hover pause on motion change to "off"', () => {
    const cleanup = initMarqueeToggles(document);
    pointer(getSection(), 'pointerenter');
    expectPaused(true);

    document.documentElement.dataset['motion'] = 'off';
    dispatchMotionChange(document, 'off');
    expectPaused(false);

    cleanup?.();
  });

  it('blurs the toggle if it is focused when motion leaves "on"', () => {
    const cleanup = initMarqueeToggles(document);
    const button = getButton();
    button.focus();
    expect(document.activeElement).toBe(button);

    document.documentElement.dataset['motion'] = 'reduced';
    dispatchMotionChange(document, 'reduced');
    expect(document.activeElement).not.toBe(button);

    cleanup?.();
  });

  it('stops reacting to clicks, pointers and motion changes after cleanup', () => {
    const cleanup = initMarqueeToggles(document, alwaysFocusVisible);
    getButton().click();
    expectPaused(true);
    expect(cleanup).toBeTypeOf('function');
    cleanup?.();

    getButton().click();
    expectPaused(true);
    pointer(getSection(), 'pointerleave');
    pointer(getSection(), 'pointerenter');
    expectPaused(true);
    dispatchMotionChange(document, 'reduced');
    expectPaused(true);
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
    expectPaused(true);

    lifecycle.unmount();
  });
});
