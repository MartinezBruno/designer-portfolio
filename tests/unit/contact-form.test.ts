// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableJavaScriptFileLoading":true,"disableJavaScriptEvaluation":true}}
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { interpolate } from '../../src/i18n/interpolate';
import { buildPrefilledMailto } from '../../src/lib/contact/mailto';
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
const CHIP_LABELS: Readonly<Record<string, string>> = {
  'graphic-design': 'Diseño gráfico',
  'web-design': 'Diseño web',
  branding: 'Branding & identidad',
  'social-media': 'Redes sociales',
  other: 'Otro',
};

const errorSlot = (field: string): string =>
  `<p id="contact-${field}-error" hidden><svg aria-hidden="true"></svg><span data-error-text></span></p>`;

function fixture(): string {
  const radios = Object.entries(CHIP_LABELS)
    .map(
      ([id, label]) =>
        `<div><input type="radio" name="service" id="contact-service-${id}" value="${id}"${id === 'other' ? ' checked' : ''}><label for="contact-service-${id}">
          <svg aria-hidden="true"></svg>
          ${label.replace('&', '&amp;')}
        </label></div>`,
    )
    .join('');
  return `<section id="contact">
    <div data-contact-column>
      <div data-contact-nojs><a href="mailto:x@y.z">Email me</a></div>
      <form data-contact-form hidden novalidate data-locale="es" data-email="x@y.z" data-contact-strings="${attr(JSON.stringify(strings))}">
        <div data-contact-summary hidden><p id="contact-summary-title">${strings['contact.summary.title']}</p><ul data-contact-summary-list aria-labelledby="contact-summary-title"></ul></div>
        <fieldset><legend>Service</legend>${radios}</fieldset>
        <label for="contact-name">Name</label><input id="contact-name" name="name" type="text">${errorSlot('name')}
        <label for="contact-email">Email</label><input id="contact-email" name="email" type="email">${errorSlot('email')}
        <label for="contact-message">Message</label><p id="contact-message-hint">hint</p><textarea id="contact-message" name="message" aria-describedby="contact-message-hint"></textarea>${errorSlot('message')}
        <input id="contact-extra" name="extra_info" type="text" tabindex="-1">
        <input type="hidden" name="locale" value="es">
        <div data-turnstile><p>loading</p></div>
        <button type="submit" data-contact-submit><span data-contact-submit-label>${strings['contact.submit']}</span><svg data-icon-ready class="size-5"></svg><svg data-icon-sending class="hidden size-5"></svg></button>
        <p data-turnstile-note hidden class="text-ink-muted"><svg data-turnstile-note-icon class="hidden"></svg><span data-turnstile-note-text></span></p>
        <div data-contact-failure hidden><p>${strings['contact.failure.title']}</p><p>${strings['contact.failure.body']}</p><p><a data-contact-failure-mailto href="mailto:x@y.z">${strings['contact.failure.mailto']}</a></p></div>
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
    expect(el('[data-contact-submit-label]').textContent).toBe(
      strings[result.kind === 'failed' ? 'contact.retry' : 'contact.submit'],
    );
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

describe('createContactForm validation and failure (05-06)', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/#contact');
    document.body.innerHTML = fixture();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    history.replaceState(null, '', '/');
  });

  const summary = (): HTMLElement => el('[data-contact-summary]');
  const summaryLinks = (): HTMLAnchorElement[] => [
    ...document.querySelectorAll<HTMLAnchorElement>('[data-contact-summary-list] a'),
  ];
  const errorText = (field: string): string =>
    el(`#contact-${field}-error [data-error-text]`).textContent;
  const typeInto = (selector: string, value: string): void => {
    const control = el<HTMLInputElement | HTMLTextAreaElement>(selector);
    control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
  };

  async function mounted(result?: SendResult) {
    const ctx = setup();
    if (result) ctx.send.mockImplementation(() => Promise.resolve(result));
    const cleanup = createContactForm(ctx.deps)(document);
    await flush();
    return { ...ctx, cleanup };
  }

  it('shows the summary and field errors on an invalid submit and sends nothing', async () => {
    const { send, cleanup } = await mounted();
    el<HTMLInputElement>('#contact-email').value = 'a@b';
    submit();

    expect(send).not.toHaveBeenCalled();
    expect(summary().hidden).toBe(false);
    expect(summaryLinks().map((link) => [link.getAttribute('href'), link.textContent])).toEqual([
      ['#contact-name', strings['contact.error.nameRequired']],
      ['#contact-email', strings['contact.error.emailInvalid']],
      ['#contact-message', strings['contact.error.messageRequired']],
    ]);
    for (const field of ['name', 'email', 'message']) {
      const control = el(`#contact-${field}`);
      expect(control.getAttribute('aria-invalid')).toBe('true');
      expect(control.getAttribute('aria-describedby')?.split(' ')).toContain(
        `contact-${field}-error`,
      );
      expect(el(`#contact-${field}-error`).hidden).toBe(false);
    }
    expect(el('#contact-message').getAttribute('aria-describedby')).toBe(
      'contact-message-hint contact-message-error',
    );
    expect(errorText('email')).toBe(strings['contact.error.emailInvalid']);
    expect(document.activeElement).toBe(el('#contact-name'));
    // Not a live region: focus carries the message.
    expect(summary().hasAttribute('role')).toBe(false);
    expect(summary().hasAttribute('aria-live')).toBe(false);
    expect(status().textContent).toBe('');
    cleanup?.();
  });

  it('focuses the first invalid field in form order', async () => {
    const { cleanup } = await mounted();
    fill();
    el<HTMLTextAreaElement>('#contact-message').value = 'corto';
    submit();
    expect(summaryLinks()).toHaveLength(1);
    expect(errorText('message')).toBe(strings['contact.error.messageShort']);
    expect(document.activeElement).toBe(el('#contact-message'));
    cleanup?.();
  });

  it('re-validates a corrected field live without moving focus', async () => {
    const { cleanup } = await mounted();
    submit();
    el<HTMLInputElement>('#contact-email').focus();
    typeInto('#contact-name', 'Ana');

    expect(el('#contact-name').hasAttribute('aria-invalid')).toBe(false);
    expect(el('#contact-name').hasAttribute('aria-describedby')).toBe(false);
    expect(el('#contact-name-error').hidden).toBe(true);
    expect(summaryLinks().map((link) => link.getAttribute('href'))).toEqual([
      '#contact-email',
      '#contact-message',
    ]);
    expect(document.activeElement).toBe(el('#contact-email'));

    typeInto('#contact-email', 'ana@example.com');
    typeInto('#contact-message', 'Necesito una identidad visual.');
    expect(summary().hidden).toBe(true);
    expect(el('#contact-message').getAttribute('aria-describedby')).toBe('contact-message-hint');
    cleanup?.();
  });

  it('a field that breaks again after the first submit shows its error again', async () => {
    const { cleanup } = await mounted();
    fill();
    el<HTMLInputElement>('#contact-name').value = '';
    submit();
    typeInto('#contact-name', 'Ana');
    expect(summary().hidden).toBe(true);
    typeInto('#contact-email', 'nope');
    expect(errorText('email')).toBe(strings['contact.error.emailInvalid']);
    expect(summaryLinks()).toHaveLength(1);
    cleanup?.();
  });

  it('changes nothing on input before the first submit', async () => {
    const { cleanup } = await mounted();
    typeInto('#contact-email', 'x');
    expect(el('#contact-email').hasAttribute('aria-invalid')).toBe(false);
    expect(el('#contact-email-error').hidden).toBe(true);
    expect(summary().hidden).toBe(true);
    cleanup?.();
  });

  it('a summary link focuses its field', async () => {
    const { cleanup } = await mounted();
    submit();
    const link = summaryLinks()[1];
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link?.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(el('#contact-email'));
    cleanup?.();
  });

  it('shows the server input errors with the same messages and focuses the field', async () => {
    const { cleanup } = await mounted({
      kind: 'input',
      fields: {
        email: ['contact.error.emailInvalid'],
        name: ['<img src=x onerror=alert(1)>'],
        locale: ['contact.error.nameRequired'],
      },
    });
    fill();
    submit();
    await flush();

    expect(errorText('email')).toBe(strings['contact.error.emailInvalid']);
    expect(el('#contact-email').getAttribute('aria-invalid')).toBe('true');
    expect(el('#contact-name').hasAttribute('aria-invalid')).toBe(false);
    expect(summaryLinks()).toHaveLength(1);
    expect(document.querySelector('img')).toBeNull();
    expect(document.activeElement).toBe(el('#contact-email'));
    expect(el('[data-contact-failure]').hidden).toBe(true);
    cleanup?.();
  });

  it('shows the failure block when an input error names no known field', async () => {
    const { cleanup } = await mounted({ kind: 'input', fields: { locale: ['bad'] } });
    fill();
    submit();
    await flush();
    expect(el('[data-contact-failure]').hidden).toBe(false);
    expect(summary().hidden).toBe(true);
    cleanup?.();
  });

  it('shows the failure block with a prefilled mailto and keeps every value', async () => {
    const { cleanup } = await mounted({ kind: 'failed' });
    fill();
    el<HTMLTextAreaElement>('#contact-message').value = 'Línea uno\nLínea dos';
    el<HTMLInputElement>('#contact-service-branding').checked = true;
    el<HTMLInputElement>('#contact-name').focus();
    submit();
    await flush();

    expect(el('[data-contact-failure]').hidden).toBe(false);
    const expected = buildPrefilledMailto({
      to: 'x@y.z',
      subject: interpolate(strings['contact.mailto.subject'], {
        service: 'Branding & identidad',
        name: 'Ana López',
      }),
      body: 'Línea uno\nLínea dos',
    });
    expect(el<HTMLAnchorElement>('[data-contact-failure-mailto]').getAttribute('href')).toBe(
      expected,
    );
    expect(el('[data-contact-submit-label]').textContent).toBe(strings['contact.retry']);
    expect(document.activeElement).toBe(el('#contact-name'));
    expect(el<HTMLInputElement>('#contact-name').value).toBe('Ana López');
    expect(el<HTMLTextAreaElement>('#contact-message').value).toBe('Línea uno\nLínea dos');
    expect(el<HTMLInputElement>('#contact-service-branding').checked).toBe(true);
    await nextFrame();
    expect(status().textContent).toBe(
      `${strings['contact.failure.title']} ${strings['contact.failure.body']}`,
    );
    cleanup?.();
  });

  it('uses the no-service subject when "other" is checked', async () => {
    const { cleanup } = await mounted({ kind: 'failed' });
    fill();
    submit();
    await flush();
    const href = el<HTMLAnchorElement>('[data-contact-failure-mailto]').getAttribute('href') ?? '';
    const subject = interpolate(strings['contact.mailto.subjectNoService'], { name: 'Ana López' });
    expect(href).toContain(`subject=${encodeURIComponent(subject)}&`);
    cleanup?.();
  });

  it('hides the failure block while a new send runs', async () => {
    const { send, cleanup } = await mounted({ kind: 'failed' });
    fill();
    submit();
    await flush();
    expect(el('[data-contact-failure]').hidden).toBe(false);

    const pending = deferred<SendResult>();
    send.mockImplementation(() => pending.promise);
    submit();
    expect(el('[data-contact-failure]').hidden).toBe(true);
    expect(el('[data-contact-submit-label]').textContent).toBe(strings['contact.sending']);
    pending.resolve({ kind: 'ok' });
    await flush();
    cleanup?.();
  });

  it('"Send another message" clears errors and the failure block', async () => {
    const { send, cleanup } = await mounted();
    submit();
    fill();
    typeInto('#contact-name', 'Ana');
    submit();
    await flush();
    expect(send).toHaveBeenCalledTimes(1);
    el<HTMLButtonElement>('[data-contact-again]').click();
    expect(summary().hidden).toBe(true);
    expect(el('[data-contact-failure]').hidden).toBe(true);
    // A fresh form: no errors until the next submit.
    typeInto('#contact-email', 'x');
    expect(el('#contact-email').hasAttribute('aria-invalid')).toBe(false);
    cleanup?.();
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

  // happy-dom never fetches here (file loading is disabled): it fires `error` synchronously on
  // insertion, or `load` when handleDisabledFileLoadingAsSuccess is on.
  const settings = (
    window as unknown as { happyDOM: { settings: { handleDisabledFileLoadingAsSuccess: boolean } } }
  ).happyDOM.settings;

  afterEach(() => {
    settings.handleDisabledFileLoadingAsSuccess = false;
  });

  // A script already injected by an earlier call and still loading.
  function pendingScript(): HTMLScriptElement {
    const script = document.createElement('script');
    script.id = 'cf-turnstile-api';
    script.src = SCRIPT_URL;
    script.dataset['state'] = 'loading';
    document.head.append(script);
    return script;
  }

  it('injects the explicit-render script once and resolves after it loads', async () => {
    const { api } = fakeTurnstile();
    settings.handleDisabledFileLoadingAsSuccess = true;
    // Like the real script: window.turnstile exists once the script has run.
    Object.defineProperty(window, 'turnstile', {
      configurable: true,
      get: () => (document.getElementById('cf-turnstile-api') ? api : undefined),
    });

    await expect(loadTurnstileScript(document)).resolves.toBe(api);
    await expect(loadTurnstileScript(document)).resolves.toBe(api);
    expect(scripts()).toHaveLength(1);
    expect(scripts()[0]?.id).toBe('cf-turnstile-api');
  });

  it('reuses a script that is still loading; every caller resolves on load', async () => {
    const { api } = fakeTurnstile();
    const script = pendingScript();
    const first = loadTurnstileScript(document);
    const second = loadTurnstileScript(document);
    expect(scripts()).toHaveLength(1);

    window.turnstile = api;
    script.dispatchEvent(new Event('load'));
    await expect(first).resolves.toBe(api);
    await expect(second).resolves.toBe(api);
  });

  it('rejects on the error event', async () => {
    const script = pendingScript();
    const pending = loadTurnstileScript(document);
    script.dispatchEvent(new Event('error'));
    await expect(pending).rejects.toThrow();
  });

  it('rejects when a fresh injection fails to load', async () => {
    await expect(loadTurnstileScript(document)).rejects.toThrow();
    expect(scripts()).toHaveLength(1);
    // A later call settles from the recorded state instead of hanging.
    await expect(loadTurnstileScript(document)).rejects.toThrow();
    expect(scripts()).toHaveLength(1);
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
