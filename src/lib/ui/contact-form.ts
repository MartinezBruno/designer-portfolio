import { interpolate } from '../../i18n/interpolate';
import { CONTACT_ERRORS, type ContactErrorKey } from '../contact/errors';
import { FIELD_NAMES, type FieldName } from '../contact/fields';
import { buildPrefilledMailto } from '../contact/mailto';
import type { ContactStrings, ContactUIKey } from '../contact/strings';
import { validateContact, type ContactValues, type FieldErrors } from '../contact/validate';
import type { Cleanup, PageInit } from '../motion/lifecycle';
import type { TurnstileApi } from '../../types/turnstile';

export type { TurnstileApi } from '../../types/turnstile';

/** What a send attempt came back with. `input` carries the server's field errors (05-06). */
export type SendResult =
  | { kind: 'ok' }
  | { kind: 'input'; fields: Readonly<Record<string, readonly string[] | undefined>> }
  | { kind: 'failed' };

/**
 * Everything the controller needs from outside the DOM, injected so this module never imports the
 * Action client, the env module or the dictionaries (bundle boundary in eslint.config.js) and so
 * the unit tests can drive it with fakes.
 */
export interface ContactFormDeps {
  send(data: FormData): Promise<SendResult>;
  siteKey: string;
  loadTurnstile(doc: Document): Promise<TurnstileApi>;
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TURNSTILE_SCRIPT_ID = 'cf-turnstile-api';

/**
 * Injects Cloudflare's explicit-render script once and resolves with `window.turnstile`. A second
 * call (or a later ClientRouter navigation) reuses the same element; its load state is kept on
 * the element so a late caller still settles.
 */
export function loadTurnstileScript(doc: Document): Promise<TurnstileApi> {
  const win = doc.defaultView;
  if (win?.turnstile) return Promise.resolve(win.turnstile);

  return new Promise<TurnstileApi>((resolve, reject) => {
    const settle = (): void => {
      const api = doc.defaultView?.turnstile;
      if (api) resolve(api);
      else reject(new Error('turnstile: script loaded without window.turnstile'));
    };
    const fail = (): void => {
      reject(new Error('turnstile: script failed to load'));
    };

    const existing = doc.getElementById(TURNSTILE_SCRIPT_ID);
    if (existing instanceof HTMLScriptElement) {
      const state = existing.dataset['state'];
      if (state === 'loaded') settle();
      else if (state === 'error') fail();
      else {
        existing.addEventListener('load', settle, { once: true });
        existing.addEventListener('error', fail, { once: true });
      }
      return;
    }

    const script = doc.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.dataset['state'] = 'loading';
    script.addEventListener(
      'load',
      () => {
        script.dataset['state'] = 'loaded';
        settle();
      },
      { once: true },
    );
    script.addEventListener(
      'error',
      () => {
        script.dataset['state'] = 'error';
        fail();
      },
      { once: true },
    );
    doc.head.append(script);
  });
}

function parseStrings(raw: string | undefined): Partial<ContactStrings> {
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    // Server-rendered by resolveContactStrings (ContactForm.astro); trusted shape.
    return typeof parsed === 'object' && parsed !== null ? (parsed as Partial<ContactStrings>) : {};
  } catch {
    return {};
  }
}

const isLocalTrigger = (loc: Location | undefined): boolean =>
  loc !== undefined && (loc.hash === '#contact' || new URLSearchParams(loc.search).has('service'));

// Summary links sit in a list of messages, so they are underlined at rest (UI-SPEC "Error summary").
// Kept as a literal under src/ so Tailwind's scanner sees every class.
const SUMMARY_LINK =
  'text-ink underline underline-offset-4 decoration-1 hover:decoration-accent hover:decoration-2 focus-visible:decoration-accent focus-visible:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const ERROR_KEYS: readonly string[] = Object.values(CONTACT_ERRORS);

const isErrorKey = (value: string): value is ContactErrorKey => ERROR_KEYS.includes(value);

const isFieldName = (value: string): value is FieldName =>
  FIELD_NAMES.some((field) => field === value);

/**
 * Maps the server's input errors onto the local keys (D-10: the server verdict is final). Only
 * values that are known CONTACT_ERRORS keys count; anything else from the network is ignored.
 */
export function serverFieldErrors(
  fields: Readonly<Record<string, readonly string[] | undefined>>,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of FIELD_NAMES) {
    const key = fields[field]?.find(isErrorKey);
    if (key !== undefined) errors[field] = key;
  }
  return errors;
}

/**
 * Contact form controller (CONT-01, CONT-03; D-10, D-11, D-13, D-14, D-15). Reveals the form over
 * the no-JS block, loads Turnstile lazily (near the section, on #contact or ?service=, or on the
 * first focus inside the form), validates with the browser mirror of the schema, sends through
 * `deps.send`, and swaps in the success panel. Input errors (client or server) show the summary and
 * the per-field errors; any other failure shows the failure block with Retry and a prefilled
 * mailto, keeping every typed value. User text only ever reaches the DOM through textContent.
 */
export function createContactForm(deps: ContactFormDeps): PageInit {
  return (doc: Document): Cleanup | undefined => {
    const form = doc.querySelector<HTMLFormElement>('[data-contact-form]');
    if (!form) return undefined;

    const q = <T extends Element>(selector: string): T | null => doc.querySelector<T>(selector);
    const nojs = q<HTMLElement>('[data-contact-nojs]');
    const slot = form.querySelector<HTMLElement>('[data-turnstile]');
    const submit = form.querySelector<HTMLButtonElement>('[data-contact-submit]');
    const submitLabel = form.querySelector<HTMLElement>('[data-contact-submit-label]');
    const iconReady = form.querySelector('[data-icon-ready]');
    const iconSending = form.querySelector('[data-icon-sending]');
    const note = form.querySelector<HTMLElement>('[data-turnstile-note]');
    const noteIcon = form.querySelector('[data-turnstile-note-icon]');
    const noteText = form.querySelector<HTMLElement>('[data-turnstile-note-text]');
    const success = q<HTMLElement>('[data-contact-success]');
    const successHeading = q<HTMLElement>('[data-contact-success-heading]');
    const successBody = q<HTMLElement>('[data-contact-success-body]');
    const again = q<HTMLButtonElement>('[data-contact-again]');
    const status = q<HTMLElement>('[data-contact-status]');
    const nameField = form.querySelector<HTMLInputElement>('#contact-name');
    const emailField = form.querySelector<HTMLInputElement>('#contact-email');
    const messageField = form.querySelector<HTMLTextAreaElement>('#contact-message');
    const summary = form.querySelector<HTMLElement>('[data-contact-summary]');
    const summaryList = form.querySelector<HTMLElement>('[data-contact-summary-list]');
    const failure = form.querySelector<HTMLElement>('[data-contact-failure]');
    const failureMailto = form.querySelector<HTMLAnchorElement>('[data-contact-failure-mailto]');
    if (
      !emailField ||
      !messageField ||
      !summary ||
      !summaryList ||
      !failure ||
      !failureMailto ||
      !slot ||
      !submit ||
      !submitLabel ||
      !note ||
      !noteText ||
      !success ||
      !successHeading ||
      !successBody ||
      !again ||
      !status ||
      !nameField
    ) {
      return undefined;
    }

    const strings = parseStrings(form.dataset['contactStrings']);
    const text = (key: ContactUIKey): string => strings[key] ?? '';
    const locale = form.dataset['locale'] ?? 'en';
    const win = doc.defaultView;

    const ac = new AbortController();
    const { signal } = ac;
    let disposed = false;
    let loadStarted = false;
    let widgetFailed = false;
    let pending = false;
    let api: TurnstileApi | null = null;
    let widgetId: string | null = null;
    let frame = 0;
    let observer: IntersectionObserver | null = null;

    // Clear, then set on the next frame, so a repeated message is announced again.
    const announce = (message: string): void => {
      if (win && frame !== 0) win.cancelAnimationFrame(frame);
      status.textContent = '';
      if (!win) {
        status.textContent = message;
        return;
      }
      frame = win.requestAnimationFrame(() => {
        frame = 0;
        status.textContent = message;
      });
    };

    const clearStatus = (): void => {
      if (win && frame !== 0) win.cancelAnimationFrame(frame);
      frame = 0;
      status.textContent = '';
    };

    const showNote = (message: string, tone: 'wait' | 'error'): void => {
      const danger = tone === 'error';
      note.classList.toggle('text-danger', danger);
      note.classList.toggle('text-ink-muted', !danger);
      noteIcon?.classList.toggle('hidden', !danger);
      noteText.textContent = message;
      note.hidden = false;
      announce(message);
    };

    const hideNote = (): void => {
      note.hidden = true;
      noteText.textContent = '';
    };

    const showWidgetError = (): void => {
      widgetFailed = true;
      showNote(text('contact.turnstile.error'), 'error');
    };

    const resetWidget = (): void => {
      if (api && widgetId !== null) api.reset(widgetId);
    };

    const ensureWidget = (): void => {
      if (loadStarted || disposed) return;
      loadStarted = true;
      observer?.disconnect();
      observer = null;
      deps
        .loadTurnstile(doc)
        .then((turnstile) => {
          if (disposed) return;
          api = turnstile;
          slot.replaceChildren();
          widgetId = turnstile.render(slot, {
            sitekey: deps.siteKey,
            size: 'compact',
            theme: 'light',
            language: locale,
            action: 'contact',
            callback: () => {
              // A token arrived: the "still running" note no longer applies.
              if (!widgetFailed) hideNote();
            },
            'error-callback': () => {
              showWidgetError();
              return true;
            },
            'expired-callback': () => {
              resetWidget();
            },
          });
        })
        .catch(() => {
          if (!disposed) showWidgetError();
        });
    };

    const setSending = (sending: boolean): void => {
      if (sending) submit.setAttribute('aria-disabled', 'true');
      else submit.removeAttribute('aria-disabled');
      submitLabel.textContent = text(sending ? 'contact.sending' : 'contact.submit');
      iconReady?.classList.toggle('hidden', sending);
      iconSending?.classList.toggle('hidden', !sending);
    };

    const showSuccess = (name: string): void => {
      setSending(false);
      const body = interpolate(text('contact.success.body'), { name });
      successBody.textContent = body;
      form.hidden = true;
      success.hidden = false;
      successHeading.focus();
      announce(body);
    };

    // --- Validation (CONT-01, D-10) -------------------------------------------------------------
    const controls: Readonly<Record<FieldName, HTMLInputElement | HTMLTextAreaElement>> = {
      name: nameField,
      email: emailField,
      message: messageField,
    };
    const errorSlots: Readonly<Record<FieldName, HTMLElement | null>> = {
      name: form.querySelector<HTMLElement>('#contact-name-error'),
      email: form.querySelector<HTMLElement>('#contact-email-error'),
      message: form.querySelector<HTMLElement>('#contact-message-error'),
    };
    // Nothing is flagged until the first submit; after it, fields re-validate as they change.
    let attempted = false;
    let errors: FieldErrors = {};

    const values = (): ContactValues => ({
      name: nameField.value,
      email: emailField.value,
      message: messageField.value,
    });

    const setDescribedBy = (control: Element, id: string, on: boolean): void => {
      const ids = (control.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter((token) => token !== '' && token !== id);
      if (on) ids.push(id);
      if (ids.length > 0) control.setAttribute('aria-describedby', ids.join(' '));
      else control.removeAttribute('aria-describedby');
    };

    const renderField = (field: FieldName): void => {
      const key = errors[field];
      const control = controls[field];
      const slotEl = errorSlots[field];
      const errorId = `contact-${field}-error`;
      if (key === undefined) control.removeAttribute('aria-invalid');
      else control.setAttribute('aria-invalid', 'true');
      setDescribedBy(control, errorId, key !== undefined);
      if (slotEl) {
        const textEl = slotEl.querySelector('[data-error-text]') ?? slotEl;
        textEl.textContent = key === undefined ? '' : text(key);
        slotEl.hidden = key === undefined;
      }
    };

    // Not a live region: focus goes to the first invalid field, which reads its own error.
    const renderSummary = (): void => {
      const items = FIELD_NAMES.flatMap((field) => {
        const key = errors[field];
        if (key === undefined) return [];
        const link = doc.createElement('a');
        link.href = `#contact-${field}`;
        link.className = SUMMARY_LINK;
        link.textContent = text(key);
        const item = doc.createElement('li');
        item.append(link);
        return [item];
      });
      summaryList.replaceChildren(...items);
      summary.hidden = items.length === 0;
    };

    const showErrors = (next: FieldErrors): boolean => {
      errors = next;
      for (const field of FIELD_NAMES) renderField(field);
      renderSummary();
      const first = FIELD_NAMES.find((field) => errors[field] !== undefined);
      if (first === undefined) return false;
      controls[first].focus();
      return true;
    };

    const clearErrors = (): void => {
      attempted = false;
      errors = {};
      for (const field of FIELD_NAMES) renderField(field);
      renderSummary();
    };

    // --- Failure block (CONT-03, D-14) ----------------------------------------------------------
    const prefilledMailto = (): string => {
      const name = nameField.value.trim();
      const checked = form.querySelector<HTMLInputElement>('input[name="service"]:checked');
      const service =
        checked && checked.value !== 'other'
          ? (form.querySelector(`label[for="${checked.id}"]`)?.textContent.trim() ?? '')
          : '';
      const subject =
        service === ''
          ? interpolate(text('contact.mailto.subjectNoService'), { name })
          : interpolate(text('contact.mailto.subject'), { service, name });
      return buildPrefilledMailto({
        to: form.dataset['email'] ?? '',
        subject,
        body: messageField.value,
      });
    };

    const showFailure = (): void => {
      failureMailto.href = prefilledMailto();
      failure.hidden = false;
      submitLabel.textContent = text('contact.retry');
      // Focus stays where the visitor is; the status region reads the message once.
      announce(`${text('contact.failure.title')} ${text('contact.failure.body')}`);
    };

    const hideFailure = (): void => {
      failure.hidden = true;
    };

    // Non-success results keep every typed value and the checked chip (D-14): never reset.
    const handleNonSuccess = (result: Exclude<SendResult, { kind: 'ok' }>): void => {
      setSending(false);
      clearStatus();
      form.dataset['contactResult'] = result.kind;
      if (result.kind === 'input') {
        attempted = true;
        // An input error with no field we can name still needs feedback: the generic failure.
        if (showErrors(serverFieldErrors(result.fields))) return;
      }
      showFailure();
    };

    const finish = (result: SendResult, name: string): void => {
      pending = false;
      if (disposed) return;
      // Tokens are single-use: every attempt, failed or not, needs a fresh one.
      resetWidget();
      if (result.kind === 'ok') showSuccess(name);
      else handleNonSuccess(result);
    };

    // Reveal: the script runs, so the no-JS block steps aside (D-12).
    form.hidden = false;
    if (nojs) nojs.hidden = true;

    form.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        if (pending) return;
        // Validate first: an invalid form never waits on (or spends) a Turnstile token.
        attempted = true;
        if (showErrors(validateContact(values()))) return;
        if (widgetFailed) {
          showNote(text('contact.turnstile.error'), 'error');
          return;
        }
        const token = api && widgetId !== null ? (api.getResponse(widgetId) ?? '') : '';
        if (token === '') {
          ensureWidget();
          showNote(text('contact.turnstile.wait'), 'wait');
          return;
        }

        hideNote();
        hideFailure();
        delete form.dataset['contactResult'];
        const data = new FormData(form);
        const nameValue = data.get('name');
        const name = typeof nameValue === 'string' ? nameValue.trim() : '';
        pending = true;
        setSending(true);
        announce(text('contact.status.sending'));
        deps.send(data).then(
          (result) => {
            finish(result, name);
          },
          () => {
            finish({ kind: 'failed' }, name);
          },
        );
      },
      { signal },
    );

    form.addEventListener('focusin', ensureWidget, { signal });

    // Live re-validation after the first submit: only the changed field, focus never moves.
    form.addEventListener(
      'input',
      (event) => {
        if (!attempted) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const field = target.getAttribute('name') ?? '';
        if (!isFieldName(field) || controls[field] !== target) return;
        // Only this field is re-checked; the others keep their current (client or server) error.
        const fresh = validateContact(values());
        const next: FieldErrors = {};
        for (const name of FIELD_NAMES) {
          const key = name === field ? fresh[name] : errors[name];
          if (key !== undefined) next[name] = key;
        }
        errors = next;
        renderField(field);
        renderSummary();
      },
      { signal },
    );

    // A summary link moves focus to its field (no hash change, no scroll jump past the label).
    summaryList.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        const link = target instanceof Element ? target.closest('a') : null;
        if (!link) return;
        const field = (link.getAttribute('href') ?? '').replace('#contact-', '');
        if (!isFieldName(field)) return;
        event.preventDefault();
        controls[field].focus();
      },
      { signal },
    );

    again.addEventListener(
      'click',
      () => {
        form.reset();
        const other = form.querySelector<HTMLInputElement>('input[name="service"][value="other"]');
        if (other) other.checked = true;
        delete form.dataset['contactResult'];
        hideNote();
        hideFailure();
        clearErrors();
        setSending(false);
        success.hidden = true;
        form.hidden = false;
        resetWidget();
        clearStatus();
        nameField.focus();
      },
      { signal },
    );

    if (isLocalTrigger(win?.location)) {
      ensureWidget();
    } else if (win && typeof win.IntersectionObserver === 'function') {
      const target = doc.getElementById('contact') ?? form;
      observer = new win.IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) ensureWidget();
        },
        { rootMargin: '600px' },
      );
      observer.observe(target);
    }

    return () => {
      disposed = true;
      ac.abort();
      observer?.disconnect();
      observer = null;
      if (win && frame !== 0) win.cancelAnimationFrame(frame);
      if (api && widgetId !== null) api.remove(widgetId);
    };
  };
}
