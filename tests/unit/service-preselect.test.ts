// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLifecycle } from '../../src/lib/motion/lifecycle';
import { applyServicePreselect, initServicePreselect } from '../../src/lib/ui/service-preselect';

const CHOICES = [
  'graphic-design',
  'web-design',
  'branding',
  'social-media',
  'photography',
  'other',
];

function fixture(): string {
  const radios = CHOICES.map(
    (id) =>
      `<input type="radio" name="service" id="contact-service-${id}" value="${id}"${id === 'other' ? ' checked' : ''}><label for="contact-service-${id}">${id}</label>`,
  ).join('');
  return `<section id="contact"><a href="mailto:x@example.com" id="mail">x</a><form data-contact-form><fieldset>${radios}</fieldset><input name="name" id="name"></form></section>`;
}

function setSearch(search: string): void {
  window.history.replaceState(null, '', `/${search}#contact`);
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
    window.history.replaceState(null, '', '/');
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

  it('checks photography from ?service=photography (D-08)', () => {
    document.body.innerHTML = fixture();
    setSearch('?service=photography');
    initServicePreselect(document);
    expect(checkedId()).toBe('photography');
    const photography = byId('contact-service-photography');
    if (!(photography instanceof HTMLInputElement)) throw new Error('not an input');
    expect(photography.checked).toBe(true);
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
    const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    expect(imports).toEqual(['../motion/lifecycle', '../contact/service-param']);
    expect(source).not.toContain('focus(');
  });
});

describe('applyServicePreselect', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('checks the chip named by the given search, not the current URL', () => {
    document.body.innerHTML = fixture();
    window.history.replaceState(null, '', '/');
    applyServicePreselect(document, '?service=branding');
    expect(checkedId()).toBe('branding');
  });

  it('allow-lists injection payloads: falls back to other and never throws', () => {
    document.body.innerHTML = fixture();
    for (const search of ['?service=x"],body', '?service=%22%5D%2Cbody', '?service=<img>']) {
      byId('contact-service-branding').click();
      expect(() => {
        applyServicePreselect(document, search);
      }).not.toThrow();
      expect(checkedId()).toBe('other');
    }
  });

  it('does nothing when there are no service radios', () => {
    document.body.innerHTML = '<p>nothing</p>';
    expect(() => {
      applyServicePreselect(document, '?service=branding');
    }).not.toThrow();
  });
});
