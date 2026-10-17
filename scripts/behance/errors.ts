// Named sync failure. Erasable TypeScript only (Node type stripping runs it).
// `gate` names the failed check (G1 profile, G2 challenge, G3 project, G4 cover, G6 body sanity).

export class SyncError extends Error {
  readonly gate: string;

  constructor(gate: string, message: string) {
    super(`[${gate}] ${message}`);
    this.name = 'SyncError';
    this.gate = gate;
  }
}
