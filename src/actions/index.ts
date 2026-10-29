// Astro Actions entry. This module also makes Astro emit the on-demand Worker for /_actions/*,
// so the Cloudflare preview serves misses through Astro (localized 404s).
//
// The contact handler stays thin: submitContact does the work and never throws. Astro serializes
// the message of any non-ActionError thrown here to the client (RESEARCH Pitfall 8), so the
// handler only ever throws one generic ActionError and internal detail stays in server logs.
// Secrets come only from astro:env/server.
import { ActionError, defineAction } from 'astro:actions';
import { PUBLIC_TURNSTILE_SITE_KEY } from 'astro:env/client';
import {
  CONTACT_ALLOW_TEST_CONFIG,
  CONTACT_TO,
  MAILER,
  RESEND_API_KEY,
  TURNSTILE_SECRET_KEY,
} from 'astro:env/server';
import services from '../data/services.json';
import { contactConfigProblem } from '../lib/contact/deploy-guard';
import { TURNSTILE_ACTION } from '../lib/contact/fields';
import { createMailer } from '../lib/contact/mailer/index';
import { contactSchema } from '../lib/contact/schema';
import { serviceTitlesEs, submitContact } from '../lib/contact/submit';
import { site } from '../data/site';
import { verifyTurnstile, type TurnstileBinding } from '../lib/contact/turnstile';

// A real verdict must echo the widget's action and come from the host the site is served on
// (WR-03). A real secret with a stale site.url fails closed: update site.url before deploy.
const TURNSTILE_BINDING: TurnstileBinding = {
  action: TURNSTILE_ACTION,
  hostnames: [new URL(site.url).hostname],
};

function sendFailed(): ActionError {
  return new ActionError({ code: 'BAD_REQUEST', message: 'send_failed' });
}

export const server = {
  contact: defineAction({
    accept: 'form',
    input: contactSchema,
    handler: async (input, ctx) => {
      let titles: ReturnType<typeof serviceTitlesEs>;
      try {
        titles = serviceTitlesEs(services);
      } catch (error) {
        console.error('[contact] rejected: config', error instanceof Error ? error.message : '');
        throw sendFailed();
      }
      // Fail closed on local-only config outside local dev (WR-04): never a false "sent".
      const problem = contactConfigProblem({
        allowTestConfig: CONTACT_ALLOW_TEST_CONFIG,
        mailer: MAILER,
        turnstileSecret: TURNSTILE_SECRET_KEY,
        siteKey: PUBLIC_TURNSTILE_SITE_KEY,
      });
      if (problem !== undefined) {
        console.error('[contact] rejected: config', problem);
        throw sendFailed();
      }
      const outcome = await submitContact(input, {
        verify: (token) =>
          verifyTurnstile(
            fetch,
            TURNSTILE_SECRET_KEY,
            token,
            ctx.request.headers.get('CF-Connecting-IP'),
            TURNSTILE_BINDING,
          ),
        mailer: () => createMailer({ MAILER, CONTACT_TO, RESEND_API_KEY }, fetch),
        serviceTitlesEs: titles,
      });
      if (!outcome.ok) throw sendFailed();
      return { ok: true as const };
    },
  }),
};
