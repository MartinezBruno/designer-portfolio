// Server contract for the contact Action (05-04): POST /_actions/contact against the workerd
// preview. The preview runs with the console mailer and the always-pass Turnstile test secret
// (scripts/e2e-preview-env.ts). Only the accept test reaches the live siteverify (@network);
// every rejection path is hermetic.
import { expect, test } from '@playwright/test';

const ENDPOINT = '/_actions/contact';

const base = {
  name: 'Ana López',
  email: 'ana@example.com',
  message: 'Necesito una identidad visual para mi café.',
  service: 'branding',
  locale: 'es',
  extra_info: '',
  'cf-turnstile-response': 'XXXX.DUMMY.TOKEN.XXXX',
} as const;

function originOf(baseURL: string | undefined): string {
  if (baseURL === undefined) throw new Error('baseURL is not configured');
  return new URL(baseURL).origin;
}

test.describe('contact action', () => {
  test('server accepts a valid submission @network', async ({ request, baseURL }) => {
    const res = await request.post(ENDPOINT, {
      headers: { Origin: originOf(baseURL) },
      multipart: { ...base },
    });
    expect(res.status()).toBe(200);
  });

  test('server rejects a filled honeypot', async ({ request, baseURL }) => {
    const res = await request.post(ENDPOINT, {
      headers: { Origin: originOf(baseURL) },
      multipart: { ...base, extra_info: 'https://spam.example' },
    });
    expect(res.status()).toBe(400);
    const text = await res.text();
    const json: unknown = JSON.parse(text);
    expect(json).toMatchObject({ type: 'AstroActionError', message: 'send_failed' });
    expect(text).not.toContain('extra_info');
    expect(text).not.toContain('honeypot');
  });

  test('server rejects an empty Turnstile token', async ({ request, baseURL }) => {
    const res = await request.post(ENDPOINT, {
      headers: { Origin: originOf(baseURL) },
      multipart: { ...base, 'cf-turnstile-response': '' },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toMatchObject({ message: 'send_failed' });
  });

  test('server rejects invalid input with dictionary keys', async ({ request, baseURL }) => {
    const res = await request.post(ENDPOINT, {
      headers: { Origin: originOf(baseURL) },
      multipart: { ...base, email: 'not-an-email', message: 'short', name: '' },
    });
    expect(res.status()).toBe(400);
    const json = (await res.json()) as {
      type: string;
      fields: Record<string, string[] | undefined>;
    };
    expect(json.type).toBe('AstroActionInputError');
    expect(json.fields['email']).toContain('contact.error.emailInvalid');
    expect(json.fields['message']).toContain('contact.error.messageShort');
    expect(json.fields['name']).toContain('contact.error.nameRequired');
    for (const messages of Object.values(json.fields)) {
      for (const message of messages ?? []) expect(message).not.toContain('Invalid input');
    }
  });

  test('server rejects a cross-origin post', async ({ request }) => {
    const res = await request.post(ENDPOINT, {
      headers: { Origin: 'https://evil.example' },
      multipart: { ...base },
    });
    expect(res.status()).toBe(403);
  });

  test('server rejects a JSON body', async ({ request, baseURL }) => {
    const res = await request.post(ENDPOINT, {
      headers: { Origin: originOf(baseURL), 'Content-Type': 'application/json' },
      data: JSON.stringify(base),
    });
    expect(res.status()).toBe(415);
  });
});
