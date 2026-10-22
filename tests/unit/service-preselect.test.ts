// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLifecycle } from '../../src/lib/motion/lifecycle';
import { initServicePreselect } from '../../src/lib/ui/service-preselect';

const CHOICES = ['graphic-design', 'web-design', 'branding', 'social-media', 'other'];

function fixture(): string {
  const radios = CHOICES.map(
    (id) =>
      `<input type="radio" name="service" id="contact-service-${id}" value="${id}"${id === 'other' ? ' checked' : ''}><label for="contact-service-${id}">${id}</label>`,
  ).join('');
  return `<section id="contact"><a href="mailto:x@example.com" id="mail">x</a><form data-contact-form><fieldset>${radios}</fieldset><input name="name" id="name"></form></section>`;
}

function setSearch(search: string): void {
  window.happyDOM.setURL(`http://localhost:4400/${search}#contact`);
}

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`fixture #${id} missing`);
  return el;
}

function checkedId(): string | undefined {
  return document.querySelector<HTMLInputElement>('input[name="service"]:checked')?.value;
}

describe('initServicePreselect', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    window.happyDOM.setURL('http://localhost:4400/');
  });

  it('returns undefined when there are no service radios', () => {
    document.body.innerHTML = '<p>nothing</p>';
    setSearch('?service=branding');
    expect(initServicePreselect(document)).toBeUndefined();
  });

  it('checks the chip named by ?service= and leaves the others unchecked', () => {
    document.body.innerHTML = fixture();
    setSearch('?service=social-media');
    expect(initServicePreselect(document)).toBeUndefined();
    expect(checkedId()).toBe('social-media');
    expect(document.querySelectorAll('input[name="service"]:checked')).toHaveLength(1);
  });

  it('falls back to other for an unknown value', () => {
    document.body.innerHTML = fixture();
    const branding = byId('contact-service-branding');
    if (!(branding instanceof HTMLInputElement)) throw new Error('not an input');
    branding.checked = true;
    setSearch('?service=nope');
    initServicePreselect(document);
    expect(checkedId()).toBe('other');
  });

  it('never moves focus', () => {
    document.body.innerHTML = fixture();
    const mail = byId('mail');
    mail.focus();
    setSearch('?service=branding');
    initServicePreselect(document);
    expect(document.activeElement).toBe(mail);
  });

  it('survives 10 lifecycle unmount/mount cycles', () => {
    document.body.innerHTML = fixture();
    setSearch('?service=web-design');
    const lifecycle = createLifecycle(document, (err) => {
      throw err;
    });
    lifecycle.register(initServicePreselect);
    expect(() => {
      lifecycle.mount();
      for (let i = 0; i < 10; i += 1) {
        lifecycle.unmount();
        lifecycle.mount();
      }
    }).not.toThrow();
    expect(checkedId()).toBe('web-design');
    expect(lifecycle.activeCleanups).toBe(0);
  });

  it('imports no zod, astro:env or dictionaries', () => {
    const source = readFileSync(resolve('src/lib/ui/service-preselect.ts'), 'utf8');
    expect(source).not.toMatch(/zod|astro:env|ui\.en|ui\.es|i18n\/t/);
  });
});
