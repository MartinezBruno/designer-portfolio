/**
 * Contact submission orchestrator (CONT-02, CONT-04). Pure apart from its injected deps.
 * Order: honeypot (no network) → Turnstile siteverify → build the Spanish email → mailer.send.
 * It never throws: every failure returns a reason for server logs and tests. The reason never
 * goes over the wire; the Action maps every failure to one generic `send_failed`.
 * Log details carry reasons, codes and internal error messages only, never the visitor's
 * name, email or message (T-05-21).
 */
import { buildContactEmail } from './email';
import { SERVICE_IDS, type ServiceId } from './fields';
import type { Mailer } from './mailer/index';
import type { ContactInput } from './schema';
import type { TurnstileResult } from './turnstile';

export type SubmitReason =
  'honeypot' | 'turnstile' | 'turnstile_error' | 'mailer_config' | 'send_failed';

export type SubmitOutcome = { ok: true } | { ok: false; reason: SubmitReason };

export interface SubmitDeps {
  verify(token: string | null | undefined): Promise<TurnstileResult>;
  mailer(): Mailer;
  serviceTitlesEs: Readonly<Record<ServiceId, string>>;
  logError?: (reason: SubmitReason, detail: string) => void;
}

function defaultLogError(reason: SubmitReason, detail: string): void {
  console.error(`[contact] rejected: ${reason}`, detail);
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

export async function submitContact(input: ContactInput, deps: SubmitDeps): Promise<SubmitOutcome> {
  const log = deps.logError ?? defaultLogError;
  const fail = (reason: SubmitReason, detail: string): SubmitOutcome => {
    log(reason, detail);
    return { ok: false, reason };
  };

  if ((input.extra_info ?? '').trim() !== '') return fail('honeypot', 'honeypot filled');

  let verdict: TurnstileResult;
  try {
    verdict = await deps.verify(input['cf-turnstile-response']);
  } catch (error) {
    return fail('turnstile_error', errorDetail(error));
  }
  if (!verdict.ok) return fail('turnstile', verdict.codes.join(','));

  let mailer: Mailer;
  try {
    mailer = deps.mailer();
  } catch (error) {
    return fail('mailer_config', errorDetail(error));
  }

  try {
    const email = buildContactEmail(input, {
      to: mailer.to,
      serviceTitlesEs: deps.serviceTitlesEs,
    });
    await mailer.send(email);
  } catch (error) {
    return fail('send_failed', errorDetail(error));
  }
  return { ok: true };
}

interface ServiceEntry {
  id: string;
  title: { es: string };
}

/** Spanish service titles keyed by id. Fails loudly when services.json lacks an id. */
export function serviceTitlesEs(entries: readonly ServiceEntry[]): Record<ServiceId, string> {
  const pairs = SERVICE_IDS.map((id): [ServiceId, string] => {
    const entry = entries.find((candidate) => candidate.id === id);
    if (entry === undefined)
      throw new Error(`services: missing id ${id} in src/data/services.json`);
    return [id, entry.title.es];
  });
  return Object.fromEntries(pairs) as Record<ServiceId, string>;
}
