import { describe, expect, it } from 'vitest';
import services from '../../src/data/services.json';
import { buildContactEmail } from '../../src/lib/contact/email';
import type { ContactEmail, Mailer } from '../../src/lib/contact/mailer/index';
import type { ContactInput } from '../../src/lib/contact/schema';
import {
  serviceTitlesEs,
  submitContact,
  type SubmitDeps,
  type SubmitReason,
} from '../../src/lib/contact/submit';
import type { TurnstileResult } from '../../src/lib/contact/turnstile';

const titles = {
  'graphic-design': 'Diseño gráfico',
  'web-design': 'Diseño web',
  branding: 'Branding',
  'social-media': 'Social media',
  photography: 'Fotografía',
} as const;

const input: ContactInput = {
  name: 'Zebulon Quixote',
  email: 'zebulon.unique@example.com',
  message: 'A very distinctive message about marmalade logos.',
  service: 'branding',
  locale: 'es',
  extra_info: null,
  'cf-turnstile-response': 'tok',
};

interface Harness {
  deps: SubmitDeps;
  verifyCalls: (string | null | undefined)[];
  mailerCalls: number;
  sent: ContactEmail[];
  logs: [SubmitReason, string][];
}

function harness(
  options: {
    verify?: () => Promise<TurnstileResult>;
    mailer?: () => Mailer;
    send?: (email: ContactEmail) => Promise<void>;
  } = {},
): Harness {
  const h: Harness = {
    verifyCalls: [],
    mailerCalls: 0,
    sent: [],
    logs: [],
    deps: undefined as unknown as SubmitDeps,
  };
  const defaultMailer = (): Mailer => ({
    name: 'console',
    to: 'inbox@example.invalid',
    send:
      options.send ??
      (async (email) => {
        h.sent.push(email);
      }),
  });
  h.deps = {
    verify: async (token) => {
      h.verifyCalls.push(token);
      return options.verify ? options.verify() : { ok: true };
    },
    mailer: () => {
      h.mailerCalls += 1;
      return (options.mailer ?? defaultMailer)();
    },
    serviceTitlesEs: titles,
    logError: (reason, detail) => {
      h.logs.push([reason, detail]);
    },
  };
  return h;
}

describe('submitContact', () => {
  it.each(['x', '  x '])('rejects a filled honeypot %j before any network', async (value) => {
    const h = harness();
    expect(await submitContact({ ...input, extra_info: value }, h.deps)).toEqual({
      ok: false,
      reason: 'honeypot',
    });
    expect(h.verifyCalls).toHaveLength(0);
    expect(h.mailerCalls).toBe(0);
  });

  it.each([null, undefined, '', '   '])('lets an empty honeypot %j through', async (value) => {
    const h = harness();
    expect(await submitContact({ ...input, extra_info: value }, h.deps)).toEqual({ ok: true });
    expect(h.verifyCalls).toEqual(['tok']);
  });

  it('rejects a failing Turnstile check without creating a mailer', async () => {
    const h = harness({
      verify: async () => ({ ok: false, codes: ['invalid-input-response'] }),
    });
    expect(await submitContact(input, h.deps)).toEqual({ ok: false, reason: 'turnstile' });
    expect(h.mailerCalls).toBe(0);
    expect(h.logs).toEqual([['turnstile', 'invalid-input-response']]);
  });

  it('maps a throwing Turnstile check to turnstile_error', async () => {
    const h = harness({
      verify: async () => {
        throw new Error('TURNSTILE_SECRET_KEY is not set');
      },
    });
    expect(await submitContact(input, h.deps)).toEqual({ ok: false, reason: 'turnstile_error' });
    expect(h.mailerCalls).toBe(0);
  });

  it('maps a mailer config error to mailer_config', async () => {
    const h = harness({
      mailer: () => {
        throw new Error('MAILER=resend requires RESEND_API_KEY');
      },
    });
    expect(await submitContact(input, h.deps)).toEqual({ ok: false, reason: 'mailer_config' });
    expect(h.logs).toEqual([['mailer_config', 'MAILER=resend requires RESEND_API_KEY']]);
  });

  it('maps a failed send to send_failed', async () => {
    const h = harness({
      send: async () => {
        throw new Error('resend 500');
      },
    });
    expect(await submitContact(input, h.deps)).toEqual({ ok: false, reason: 'send_failed' });
    expect(h.logs).toEqual([['send_failed', 'resend 500']]);
  });

  it('sends the Spanish email once on the happy path', async () => {
    const h = harness();
    expect(await submitContact(input, h.deps)).toEqual({ ok: true });
    expect(h.sent).toEqual([
      buildContactEmail(input, { to: 'inbox@example.invalid', serviceTitlesEs: titles }),
    ]);
  });

  it('never logs the visitor name, email or message', async () => {
    const scenarios: Harness[] = [
      harness({ verify: async () => ({ ok: false, codes: ['invalid-input-response'] }) }),
      harness({
        verify: async () => {
          throw new Error('boom');
        },
      }),
      harness({
        mailer: () => {
          throw new Error('MAILER=resend requires CONTACT_TO');
        },
      }),
      harness({
        send: async () => {
          throw new Error('resend 422');
        },
      }),
    ];
    for (const h of scenarios) {
      await submitContact(input, h.deps);
      expect(h.logs.length).toBeGreaterThan(0);
      for (const [, detail] of h.logs) {
        expect(detail).not.toContain('Zebulon');
        expect(detail).not.toContain('zebulon.unique');
        expect(detail).not.toContain('marmalade');
      }
    }
  });
});

describe('serviceTitlesEs', () => {
  it('maps every service id to its Spanish title', () => {
    expect(serviceTitlesEs(services)).toEqual(titles);
  });

  it('throws when an id is missing', () => {
    const partial = services.filter((entry) => entry.id !== 'branding');
    expect(() => serviceTitlesEs(partial)).toThrow(
      'services: missing id branding in src/data/services.json',
    );
  });
});
