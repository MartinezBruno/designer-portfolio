/** One outgoing contact email. `to` always comes from server config, never from visitor input. */
export interface ContactEmail {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}

/** Mailer port (CONT-04): console in v1 and local dev, Resend ready for deploy. */
export interface Mailer {
  readonly name: 'console' | 'resend';
  readonly to: string;
  send(email: ContactEmail): Promise<void>;
}
