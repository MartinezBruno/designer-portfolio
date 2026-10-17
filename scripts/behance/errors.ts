// Named sync failure. Erasable TypeScript only (Node type stripping runs it).
// `gate` names the failed check (G1 profile, G2 challenge, G3 project, G4 cover, G4m module
// images, G6 body sanity, G7 commit). `committed` is true when the failure happened after the new snapshot replaced the
// previous one, so the CLI must not claim the previous snapshot was left untouched.

export class SyncError extends Error {
  readonly gate: string;
  readonly committed: boolean;

  constructor(gate: string, message: string, options: { committed?: boolean } = {}) {
    super(`[${gate}] ${message}`);
    this.name = 'SyncError';
    this.gate = gate;
    this.committed = options.committed ?? false;
  }
}

/** A failure after the atomic snapshot rename: the new snapshot is already live. */
export function postCommitError(error: Error | string): SyncError {
  if (error instanceof SyncError && error.committed) return error;
  const message = error instanceof Error ? error.message : error;
  return new SyncError('G7', `snapshot was written, but a post-commit step failed: ${message}`, {
    committed: true,
  });
}

export const UNTOUCHED = 'The previous snapshot was left untouched.';
export const COMMITTED =
  'The new snapshot was already written: review the diff (src/data/behance, src/assets/projects, src/assets/projects/modules) before committing it, or restore it from git.';

/** The CLI's failure message, true to whether the previous snapshot was replaced. */
export function failureMessage(error: Error | string): string {
  const message = error instanceof Error ? error.message : error;
  const committed = error instanceof SyncError && error.committed;
  return `sync:behance: ${message}. ${committed ? COMMITTED : UNTOUCHED}`;
}
