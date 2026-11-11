import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CLOUDFLARE_FROM,
  buildCloudflareMessage,
  createCloudflareMailer,
  isSendEmailBinding,
  type CloudflareEmailMessage,
  type SendEmailBinding,
} from '../../src/lib/contact/mailer/cloudflare';
import { createMailer, type ContactEmail } from '../../src/lib/contact/mailer/index';

const VISITOR = {
  name: 'Ana Visitor',
  email: 'ana.visitor@example.com',
  message: 'Secret project brief text',
};

const email: ContactEmail = {
  to: 'inbox@example.invalid',
  replyTo: VISITOR.email,
  subject: `Nuevo mensaje web — Branding — ${VISITOR.name}`,
  text: `Nombre: ${VISITOR.name}\nEmail: ${VISITOR.email}\n\nMensaje:\n${VISITOR.message}`,
};

function fakeBinding(reject?: Error): {
  binding: SendEmailBinding;
  calls: CloudflareEmailMessage[];
} {
  const calls: CloudflareEmailMessage[] = [];
  return {
    calls,
    binding: {
      send(message) {
        calls.push(message);
        return reject === undefined ? Promise.resolve({ messageId: 'm1' }) : Promise.reject(reject);
      },
    },
  };
}

function noFetch(): { fetchFn: typeof globalThis.fetch; count: () => number } {
  let calls = 0;
  return {
    count: () => calls,
    fetchFn: () => {
      calls += 1;
      return Promise.reject(new Error('fetch must not be called'));
    },
  };
}

describe('buildCloudflareMessage', () => {
  it('maps the contact email to the builder form with the fixed sender and plain text only', () => {
    const message = buildCloudflareMessage(email);
    expect(message).toEqual({
      from: { email: 'web@martifernandez.com', name: 'Web Martina Fernandez' },
      to: email.to,
      replyTo: email.replyTo,
      subject: email.subject,
      text: email.text,
    });
    expect(Object.hasOwn(message, 'html')).toBe(false);
    expect(CLOUDFLARE_FROM).toEqual({
      name: 'Web Martina Fernandez',
      email: 'web@martifernandez.com',
    });
  });
});

describe('createCloudflareMailer', () => {
  it('sends exactly one message through the binding', async () => {
    const { binding, calls } = fakeBinding();
    const mailer = createCloudflareMailer({ binding, to: 'a@b.co' });
    expect(mailer.name).toBe('cloudflare');
    expect(mailer.to).toBe('a@b.co');
    await expect(mailer.send(email)).resolves.toBeUndefined();
    expect(calls).toEqual([buildCloudflareMessage(email)]);
  });

  it('rethrows a fixed message without visitor data when the binding rejects', async () => {
    const providerError = new Error(
      `email to ${VISITOR.email} not allowed: ${VISITOR.name} ${VISITOR.message} ${email.subject}`,
    );
    const { binding } = fakeBinding(providerError);
    const mailer = createCloudflareMailer({ binding, to: 'a@b.co' });
    const error: unknown = await mailer.send(email).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(Error);
    const message = error instanceof Error ? error.message : '';
    expect(message).toBe('cloudflare email send failed (Error)');
    for (const secret of [VISITOR.email, VISITOR.name, VISITOR.message, email.subject]) {
      expect(message).not.toContain(secret);
    }
  });
});

describe('isSendEmailBinding', () => {
  it('accepts an object with a send function', () => {
    expect(isSendEmailBinding({ send: () => Promise.resolve({ messageId: 'x' }) })).toBe(true);
  });

  it.each([undefined, null, {}, { send: 'x' }, 'binding'])('rejects %j', (value) => {
    expect(isSendEmailBinding(value)).toBe(false);
  });
});

describe('createMailer with MAILER=cloudflare', () => {
  it('returns the cloudflare mailer and never calls fetch', async () => {
    const { binding, calls } = fakeBinding();
    const { fetchFn, count } = noFetch();
    const mailer = createMailer(
      { MAILER: 'cloudflare', CONTACT_TO: 'a@b.co', RESEND_API_KEY: undefined },
      fetchFn,
      { emailBinding: binding },
    );
    expect(mailer.name).toBe('cloudflare');
    expect(mailer.to).toBe('a@b.co');
    await mailer.send({ ...email, to: mailer.to });
    expect(calls).toHaveLength(1);
    expect(count()).toBe(0);
  });

  it('throws when the EMAIL binding is missing', () => {
    const { fetchFn } = noFetch();
    expect(() =>
      createMailer(
        {
          MAILER: 'cloudflare',
          CONTACT_TO: 'private.inbox@example.com',
          RESEND_API_KEY: undefined,
        },
        fetchFn,
      ),
    ).toThrow('MAILER=cloudflare requires the EMAIL send_email binding');
    try {
      createMailer(
        {
          MAILER: 'cloudflare',
          CONTACT_TO: 'private.inbox@example.com',
          RESEND_API_KEY: undefined,
        },
        fetchFn,
        { emailBinding: undefined },
      );
    } catch (error) {
      expect(error instanceof Error ? error.message : '').not.toContain('private.inbox');
    }
  });

  it.each([undefined, ''])('throws when CONTACT_TO is %j', (to) => {
    const { binding } = fakeBinding();
    const { fetchFn } = noFetch();
    expect(() =>
      createMailer({ MAILER: 'cloudflare', CONTACT_TO: to, RESEND_API_KEY: undefined }, fetchFn, {
        emailBinding: binding,
      }),
    ).toThrow('MAILER=cloudflare requires CONTACT_TO');
  });
});

describe('wrangler.jsonc parity', () => {
  it('restricts the EMAIL binding to the CLOUDFLARE_FROM sender', () => {
    const raw = readFileSync('wrangler.jsonc', 'utf8');
    expect(raw).toContain('"name": "EMAIL"');
    const senders = /"allowed_sender_addresses":\s*\[([^\]]*)\]/.exec(raw)?.[1] ?? '';
    expect(senders).toContain(`"${CLOUDFLARE_FROM.email}"`);
  });
});
