// Lazy chunk for the contact form controller (07-15). ContactForm.astro reaches this module only
// through createLazyContactForm's dynamic import(), so the Actions client, the Turnstile loader and
// the validation UI stay out of the eager bundle. Imports only the public site key, never server env.
import { actions, isInputError } from 'astro:actions';
import { PUBLIC_TURNSTILE_SITE_KEY } from 'astro:env/client';
import type { PageInit } from '../motion/lifecycle';
import {
  createContactForm,
  loadTurnstileScript,
  type ContactFormDeps,
  type SendResult,
} from './contact-form';

// Maps the Action result onto the controller's SendResult. A throw (network) is a failed send.
async function send(data: FormData): Promise<SendResult> {
  try {
    const { error } = await actions.contact(data);
    if (error === undefined) return { kind: 'ok' };
    if (isInputError(error)) return { kind: 'input', fields: error.fields };
    return { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  }
}

const deps: ContactFormDeps = {
  send,
  siteKey: PUBLIC_TURNSTILE_SITE_KEY,
  loadTurnstile: loadTurnstileScript,
};

export const contactFormInit: PageInit = createContactForm(deps);
