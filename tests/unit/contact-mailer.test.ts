import { describe, expect, it } from 'vitest';
import { createConsoleMailer } from '../../src/lib/contact/mailer/console';
import {
  CONSOLE_PLACEHOLDER_TO,
  createMailer,
  type ContactEmail,
} from '../../src/lib/contact/mailer/index';
import {
  CONTACT_FROM,
  buildResendBody,
  createResendMailer,
} from '../../src/lib/contact/mailer/resend';

interface Recorded {
  url: string;
  init: RequestInit | undefined;
}

function fakeFetch(statuses: number[] = []): {
  fetchFn: typeof globalThis.fetch;
  calls: Recorded[];
} {
  const calls: Recorded[] = [];
  const queue = [...statuses];
  const fn = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    const status = queue.shift();
    if (status === undefined) throw new Error('unexpected fetch');
    return new Response(status === 200 ? '{"id":"x"}' : '{"message":"nope"}', { status });
  };
  return { fetchFn: fn as typeof globalThis.fetch, calls };
}

const email: ContactEmail = {
  to: 'a@b.co',
  replyTo: 'ana@example.com',
  subject: 'Nuevo mensaje web — Branding — Ana López',
  text: 'Nombre: Ana López\n\nMensaje:\nHola',
};

describe('createMailer', () => {
  it('defaults to the console mailer with the placeholder recipient', () => {
    const { fetchFn } = fakeFetch();
    const mailer = createMailer(
      { MAILER: 'console', CONTACT_TO: undefined, RESEND_API_KEY: undefined },
      fetchFn,
    );
    expect(mailer.name).toBe('console');
    expect(mailer.to).toBe('inbox@example.invalid');
    expect(CONSOLE_PLACEHOLDER_TO).toBe('inbox@example.invalid');
  });

  it('console mailer uses CONTACT_TO when set', () => {
    const { fetchFn } = fakeFetch();
    const mailer = createMailer(
      { MAILER: 'console', CONTACT_TO: 'a@b.co', RESEND_API_KEY: undefined },
      fetchFn,
    );
    expect(mailer.to).toBe('a@b.co');
  });

  it.each([undefined, ''])('MAILER=resend with RESEND_API_KEY=%j throws', (key) => {
    const { fetchFn } = fakeFetch();
    expect(() =>
      createMailer({ MAILER: 'resend', CONTACT_TO: 'a@b.co', RESEND_API_KEY: key }, fetchFn),
    ).toThrow(new Error('MAILER=resend requires RESEND_API_KEY'));
  });

  it.each([undefined, ''])('MAILER=resend with CONTACT_TO=%j throws', (to) => {
    const { fetchFn } = fakeFetch();
    expect(() =>
      createMailer({ MAILER: 'resend', CONTACT_TO: to, RESEND_API_KEY: 're_test' }, fetchFn),
    ).toThrow(new Error('MAILER=resend requires CONTACT_TO'));
  });

  it('MAILER=resend with both values returns the resend mailer', () => {
    const { fetchFn } = fakeFetch();
    const mailer = createMailer(
      { MAILER: 'resend', CONTACT_TO: 'a@b.co', RESEND_API_KEY: 're_test' },
      fetchFn,
    );
    expect(mailer.name).toBe('resend');
    expect(mailer.to).toBe('a@b.co');
  });
});

describe('console mailer', () => {
  it('logs exactly the Resend payload once and never fetches', async () => {
    const { fetchFn, calls } = fakeFetch();
    const logs: [string, string][] = [];
    const mailer = createConsoleMailer('a@b.co', (label, payload) => {
      logs.push([label, payload]);
    });
    await mailer.send(email);
    expect(logs).toHaveLength(1);
    const [label, payload] = logs[0] ?? ['', ''];
    expect(label).toBe('[contact] email');
    expect(payload).toBe(JSON.stringify(buildResendBody(email), null, 2));
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(['from', 'reply_to', 'subject', 'text', 'to']);
    expect(parsed['to']).toEqual(['a@b.co']);
    expect(calls).toHaveLength(0);
    expect(fetchFn).toBeTypeOf('function');
  });
});

describe('buildResendBody', () => {
  it('maps to the snake_case REST body with no html', () => {
    const body = buildResendBody(email);
    expect(body).toEqual({
      from: CONTACT_FROM,
      to: ['a@b.co'],
      reply_to: 'ana@example.com',
      subject: email.subject,
      text: email.text,
    });
    expect('html' in body).toBe(false);
    expect(CONTACT_FROM).toBe('Web Martina Fernandez <onboarding@resend.dev>');
  });
});

describe('resend mailer', () => {
  it('POSTs the payload once with auth, JSON and idempotency headers', async () => {
    const { fetchFn, calls } = fakeFetch([200]);
    const mailer = createResendMailer({
      apiKey: 're_test',
      to: 'a@b.co',
      fetchFn,
      idempotencyKey: () => 'fixed-key',
    });
    await mailer.send(email);
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call?.url).toBe('https://api.resend.com/emails');
    expect(call?.init?.method).toBe('POST');
    const headers = new Headers(call?.init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer re_test');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Idempotency-Key')).toBe('fixed-key');
    const body = JSON.parse(String(call?.init?.body)) as Record<string, unknown>;
    expect(body).toEqual(buildResendBody(email));
    expect('html' in body).toBe(false);
    expect(call?.init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('generates an idempotency key by default', async () => {
    const { fetchFn, calls } = fakeFetch([200]);
    await createResendMailer({ apiKey: 're_test', to: 'a@b.co', fetchFn }).send(email);
    expect(new Headers(calls[0]?.init?.headers).get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects with the status only on a non-2xx reply', async () => {
    const { fetchFn } = fakeFetch([403]);
    const mailer = createResendMailer({ apiKey: 're_test', to: 'a@b.co', fetchFn });
    await expect(mailer.send(email)).rejects.toThrow(new Error('resend 403'));
  });
});
