// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableJavaScriptFileLoading":true,"disableJavaScriptEvaluation":true}}
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { interpolate } from '../../src/i18n/interpolate';
import { resolveContactStrings } from '../../src/lib/contact/strings';
import { createLifecycle } from '../../src/lib/motion/lifecycle';
import {
  createContactForm,
  loadTurnstileScript,
  type ContactFormDeps,
  type SendResult,
} from '../../src/lib/ui/contact-form';
import type { TurnstileApi, TurnstileRenderOptions } from '../../src/types/turnstile';

const strings = resolveContactStrings('es', 'x@y.z');
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function attr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// Mirrors ContactSection + ContactForm hooks.
function fixture(): string {
  const radios = ['graphic-design', 'web-design', 'branding', 'social-media', 'other']
    .map(
      (id) =>
        `<div><input type="radio" name="service" id="contact-service-${id}" value="${id}"${id === 'other' ? ' checked' : ''}><label for="contact-service-${id}">${id}</label></div>`,
    )
    .join('');
  return `<section id="contact">
    <div data-contact-column>
      <div data-contact-nojs><a href="mailto:x@y.z">Email me</a></div>
      <form data-contact-form hidden novalidate data-locale="es" data-contact-strings="${attr(JSON.stringify(strings))}">
        <fieldset><legend>Service</legend>${radios}</fieldset>
        <label for="contact-name">Name</label><input id="contact-name" name="name" type="text">
        <label for="contact-email">Email</label><input id="contact-email" name="email" type="email">
        <label for="contact-message">Message</label><textarea id="contact-message" name="message"></textarea>
        <input id="contact-extra" name="extra_info" type="text" tabindex="-1">
        <input type="hidden" name="locale" value="es">
        <div data-turnstile><p>loading</p></div>
        <button type="submit" data-contact-submit><span data-contact-submit-label>${strings['contact.submit']}</span><svg data-icon-ready class="size-5"></svg><svg data-icon-sending class="hidden size-5"></svg></button>
        <p data-turnstile-note hidden class="text-ink-muted"><svg data-turnstile-note-icon class="hidden"></svg><span data-turnstile-note-text></span></p>
      </form>
      <div data-contact-success hidden>
        <h3 tabindex="-1" data-contact-success-heading>Sent</h3>
        <p data-contact-success-body></p>
        <button type="button" data-contact-again>Again</button>
      </div>
    </div>
    <p role="status" data-contact-status></p>
  </section>`;
}

function el<T extends Element = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`fixture: ${selector} missing`);
  return found;
}

const form = (): HTMLFormElement => el<HTMLFormElement>('[data-contact-form]');
const submitButton = (): HTMLButtonElement => el<HTMLButtonElement>('[data-contact-submit]');
const status = (): HTMLElement => el('[data-contact-status]');
const note = (): HTMLElement => el('[data-turnstile-note]');
const noteText = (): string => el('[data-turnstile-note-text]').textContent;

function fakeTurnstile(initialToken = 'tok') {
  let token: string | undefined = initialToken;
  const rendered: { el: HTMLElement; options: TurnstileRenderOptions }[] = [];
  const reset: string[] = [];
  const removed: string[] = [];
  const api: TurnstileApi = {
    render(target, options) {
      rendered.push({ el: target, options });
      return 'widget-1';
    },
    reset(id) {
      reset.push(id);
    },
    remove(id) {
      removed.push(id);
    },
    getResponse() {
      return token;
    },
  };
  return {
    api,
    rendered,
    reset,
    removed,
    setToken(value: string | undefined) {
      token = value;
    },
  };
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolveFn: (value: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolveFn = res;
  });
  return { promise, resolve: resolveFn };
}

function setup(token = 'tok') {
  const turnstile = fakeTurnstile(token);
  const send = vi.fn<(data: FormData) => Promise<SendResult>>(() =>
    Promise.resolve({ kind: 'ok' }),
  );
  const loadTurnstile = vi.fn<(doc: Document) => Promise<TurnstileApi>>(() =>
    Promise.resolve(turnstile.api),
  );
  const deps: ContactFormDeps = { send, siteKey: 'site-key', loadTurnstile };
  return { turnstile, send, loadTurnstile, deps };
}

const flush = (): Promise<void> => new Promise((res) => setTimeout(res, 0));
const nextFrame = (): Promise<void> =>
  new Promise((res) => {
    requestAnimationFrame(() => {
      res();
    });
  });

function fill(name = 'Ana López'): void {
  el<HTMLInputElement>('#contact-name').value = name;
  el<HTMLInputElement>('#contact-email').value = 'ana@example.com';
  el<HTMLTextAreaElement>('#contact-message').value = 'Necesito una identidad visual.';
}

function submit(): void {
  form().dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('createContactForm', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/#contact');
    document.body.innerHTML = fixture();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    history.replaceState(null, '', '/');
  });

  it('returns undefined when there is no form', () => {
    document.body.innerHTML = '<p>nothing</p>';
    expect(createContactForm(setup().deps)(document)).toBeUndefined();
  });

  it('reveals the form and hides the no-JS block', () => {
    const cleanup = createContactForm(setup().deps)(document);
    expect(form().hidden).toBe(false);
    expect(el('[data-contact-nojs]').hidden).toBe(true);
    cleanup?.();
  });

  it('loads Turnstile at once on #contact and renders it explicitly, once', async () => {
    const { deps, loadTurnstile, turnstile } = setup();
    const cleanup = createContactForm(deps)(document);
    expect(loadTurnstile).toHaveBeenCalledTimes(1);
    await flush();
    expect(turnstile.rendered).toHaveLength(1);
    const [first] = turnstile.rendered;
    expect(first?.el).toBe(el('[data-turnstile]'));
    expect(first?.options).toMatchObject({
      sitekey: 'site-key',
      size: 'compact',
      theme: 'light',
      language: 'es',
      action: 'contact',
    });
    // The loading note was replaced by the widget.
    expect(el('[data-turnstile]').querySelector('p')).toBeNull();

    el('#contact-name').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await flush();
    expect(loadTurnstile).toHaveBeenCalledTimes(1);
    expect(turnstile.rendered).toHaveLength(1);
    cleanup?.();
  });

  it('loads at once when ?service= is present', () => {
    history.replaceState(null, '', '/?service=branding');
    const { deps, loadTurnstile } = setup();
    const cleanup = createContactForm(deps)(document);
    expect(loadTurnstile).toHaveBeenCalledTimes(1);
    cleanup?.();
  });

  it('otherwise waits for the first focusin inside the form', async () => {
    history.replaceState(null, '', '/');
    const { deps, loadTurnstile, turnstile } = setup();
    const cleanup = createContactForm(deps)(document);
    expect(loadTurnstile).not.toHaveBeenCalled();

    el('#contact-name').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    el('#contact-email').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await flush();
    expect(loadTurnstile).toHaveBeenCalledTimes(1);
    expect(turnstile.rendered).toHaveLength(1);
    cleanup?.();
  });

  it('does not send before a token exists and shows the wait note', async () => {
    const { deps, send } = setup('');
    const cleanup = createContactForm(deps)(document);
    await flush();
    fill();
    submit();
    expect(send).not.toHaveBeenCalled();
    expect(note().hidden).toBe(false);
    expect(noteText()).toBe(strings['contact.turnstile.wait']);
    expect(note().classList.contains('text-danger')).toBe(false);
    await nextFrame();
    expect(status().textContent).toBe(strings['contact.turnstile.wait']);
    cleanup?.();
  });

  it('shows the danger load-error note on error-callback', async () => {
    const { deps, turnstile } = setup();
    const cleanup = createContactForm(deps)(document);
    await flush();
    turnstile.rendered[0]?.options['error-callback']?.('110200');
    expect(note().hidden).toBe(false);
    expect(noteText()).toBe(strings['contact.turnstile.error']);
    expect(noteText()).toContain('x@y.z');
    expect(note().classList.contains('text-danger')).toBe(true);
    expect(el('[data-turnstile-note-icon]').classList.contains('hidden')).toBe(false);
    await nextFrame();
    expect(status().textContent).toBe(strings['contact.turnstile.error']);
    cleanup?.();
  });

  it('shows the load-error note when the script fails to load', async () => {
    const { deps, loadTurnstile } = setup();
    loadTurnstile.mockImplementation(() => Promise.reject(new Error('blocked')));
    const cleanup = createContactForm(deps)(document);
    await flush();
    expect(note().hidden).toBe(false);
    expect(noteText()).toBe(strings['contact.turnstile.error']);
    cleanup?.();
  });

  it('enters the sending state and ignores a second submit while pending', async () => {
    const { deps, send } = setup();
    const pending = deferred<SendResult>();
    send.mockImplementation(() => pending.promise);
    const cleanup = createContactForm(deps)(document);
    await flush();
    fill();
    submit();

    expect(send).toHaveBeenCalledTimes(1);
    const button = submitButton();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(el('[data-contact-submit-label]').textContent).toBe(strings['contact.sending']);
    expect(el('[data-icon-sending]').classList.contains('hidden')).toBe(false);
    expect(el('[data-icon-ready]').classList.contains('hidden')).toBe(true);
    await nextFrame();
    expect(status().textContent).toBe(strings['contact.status.sending']);

    submit();
    expect(send).toHaveBeenCalledTimes(1);

    pending.resolve({ kind: 'ok' });
    await flush();
    cleanup?.();
  });

  it('posts the form data, including the service and locale', async () => {
    const { deps, send } = setup();
    const cleanup = createContactForm(deps)(document);
    await flush();
    fill();
    submit();
    const data = send.mock.calls[0]?.[0];
    expect(data?.get('name')).toBe('Ana López');
    expect(data?.get('service')).toBe('other');
    expect(data?.get('locale')).toBe('es');
    await flush();
    cleanup?.();
  });

  it('replaces the form with the success panel and focuses its heading', async () => {
    const { deps, turnstile } = setup();
    const cleanup = createContactForm(deps)(document);
    await flush();
    fill('  <b>Ana</b>  ');
    submit();
    await flush();

    const body = interpolate(strings['contact.success.body'], { name: '<b>Ana</b>' });
    expect(form().hidden).toBe(true);
    expect(el('[data-contact-success]').hidden).toBe(false);
    const bodyEl = el('[data-contact-success-body]');
    expect(bodyEl.textContent).toBe(body);
    expect(bodyEl.querySelector('b')).toBeNull();
    expect(document.activeElement).toBe(el('[data-contact-success-heading]'));
    expect(turnstile.reset).toEqual(['widget-1']);
    await nextFrame();
    expect(status().textContent).toBe(body);
    cleanup?.();
  });

  it.each([
    { kind: 'failed' } as const,
    { kind: 'input', fields: { email: ['contact.error.emailInvalid'] } } as const,
  ])('keeps every value and restores the button on $kind', async (result) => {
    const { deps, send, turnstile } = setup();
    send.mockImplementation(() => Promise.resolve(result));
    const cleanup = createContactForm(deps)(document);
    await flush();
    fill();
    el<HTMLInputElement>('#contact-service-branding').checked = true;
    submit();
    await flush();

    expect(form().hidden).toBe(false);
    expect(el('[data-contact-success]').hidden).toBe(true);
    expect(el<HTMLInputElement>('#contact-name').value).toBe('Ana López');
    expect(el<HTMLInputElement>('#contact-email').value).toBe('ana@example.com');
    expect(el<HTMLTextAreaElement>('#contact-message').value).toBe(
      'Necesito una identidad visual.',
    );
    expect(el<HTMLInputElement>('#contact-service-branding').checked).toBe(true);
    expect(el('[data-contact-submit-label]').textContent).toBe(strings['contact.submit']);
    expect(submitButton().hasAttribute('aria-disabled')).toBe(false);
    expect(el('[data-icon-sending]').classList.contains('hidden')).toBe(true);
    expect(turnstile.reset).toEqual(['widget-1']);
    cleanup?.();
  });

  it('treats a throwing send as a failed send', async () => {
    const { deps, send } = setup();
    send.mockImplementation(() => Promise.reject(new Error('offline')));
    const cleanup = createContactForm(deps)(document);
    await flush();
    fill();
    submit();
    await flush();
    expect(form().hidden).toBe(false);
    expect(submitButton().hasAttribute('aria-disabled')).toBe(false);
    cleanup?.();
  });

  it('"Send another message" restores an empty form', async () => {
    const { deps, turnstile } = setup();
    const cleanup = createContactForm(deps)(document);
    await flush();
    fill();
    el<HTMLInputElement>('#contact-service-branding').checked = true;
    submit();
    await flush();
    await nextFrame();

    el<HTMLButtonElement>('[data-contact-again]').click();
    expect(form().hidden).toBe(false);
    expect(el('[data-contact-success]').hidden).toBe(true);
    expect(el<HTMLInputElement>('#contact-name').value).toBe('');
    expect(el<HTMLInputElement>('#contact-email').value).toBe('');
    expect(el<HTMLTextAreaElement>('#contact-message').value).toBe('');
    expect(el<HTMLInputElement>('#contact-service-other').checked).toBe(true);
    expect(document.activeElement).toBe(el('#contact-name'));
    expect(turnstile.reset).toEqual(['widget-1', 'widget-1']);
    expect(status().textContent).toBe('');
    cleanup?.();
  });

  it('removes the widget and stops reacting after cleanup', async () => {
    const { deps, send, turnstile } = setup();
    const cleanup = createContactForm(deps)(document);
    await flush();
    cleanup?.();
    expect(turnstile.removed).toEqual(['widget-1']);

    fill();
    submit();
    await flush();
    expect(send).not.toHaveBeenCalled();
  });

  it('binds once across 10 lifecycle unmount/mount cycles', async () => {
    const { deps, send } = setup();
    const lifecycle = createLifecycle(document);
    lifecycle.register(createContactForm(deps));
    lifecycle.mount();
    for (let i = 0; i < 10; i += 1) {
      lifecycle.unmount();
      lifecycle.mount();
    }
    expect(lifecycle.activeCleanups).toBe(1);
    await flush();
    fill();
    submit();
    expect(send).toHaveBeenCalledTimes(1);
    await flush();
    lifecycle.unmount();
  });
});

describe('loadTurnstileScript', () => {
  afterEach(() => {
    document.getElementById('cf-turnstile-api')?.remove();
    delete window.turnstile;
  });

  const scripts = (): HTMLScriptElement[] => [
    ...document.querySelectorAll<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`),
  ];

  it('injects one explicit-render script and resolves after load', async () => {
    const { api } = fakeTurnstile();
    const first = loadTurnstileScript(document);
    const second = loadTurnstileScript(document);
    expect(scripts()).toHaveLength(1);

    window.turnstile = api;
    scripts()[0]?.dispatchEvent(new Event('load'));
    await expect(first).resolves.toBe(api);
    await expect(second).resolves.toBe(api);
    expect(scripts()).toHaveLength(1);
  });

  it('rejects on the error event', async () => {
    const pending = loadTurnstileScript(document);
    scripts()[0]?.dispatchEvent(new Event('error'));
    await expect(pending).rejects.toThrow();
  });

  it('resolves at once when window.turnstile already exists', async () => {
    const { api } = fakeTurnstile();
    window.turnstile = api;
    await expect(loadTurnstileScript(document)).resolves.toBe(api);
    expect(scripts()).toHaveLength(0);
  });
});

describe('contact-form source', () => {
  // happy-dom rewrites import.meta.url to http:, so resolve from the project root.
  const source = readFileSync(resolve(process.cwd(), 'src/lib/ui/contact-form.ts'), 'utf8');

  it('has no innerHTML', () => {
    expect(source).not.toContain('innerHTML');
  });

  it('imports nothing that ships zod, env, actions or the dictionaries', () => {
    for (const banned of ['astro/zod', 'astro:env', 'astro:actions', "'../../i18n/t'"]) {
      expect(source).not.toContain(banned);
    }
  });
});
