/** One outgoing contact email. `to` always comes from server config, never from visitor input. */
export interface ContactEmail {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}

/** Mailer port (CONT-04): console for local dev and e2e, Cloudflare Email (primary) or Resend for deploy. */
export interface Mailer {
  readonly name: 'console' | 'resend' | 'cloudflare';
  readonly to: string;
  send(email: ContactEmail): Promise<void>;
}
