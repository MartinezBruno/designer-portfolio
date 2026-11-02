import { describe, expect, it, vi } from 'vitest';
import { createLenisLoader, type LenisCtor } from '../../src/lib/motion/load-lenis.ts';

// The loader never constructs anything, so any unique function stands in for the constructor.
const fakeCtor = vi.fn() as unknown as LenisCtor;

describe('createLenisLoader', () => {
  it('memoises the load: two calls share one promise and one import', async () => {
    const importer = vi.fn(() => Promise.resolve(fakeCtor));
    const load = createLenisLoader(importer);

    const first = load();
    const second = load();

    expect(second).toBe(first);
    await expect(first).resolves.toBe(fakeCtor);
    expect(load()).toBe(first);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('rejects on a failed import and retries on the next call', async () => {
    const importer = vi
      .fn<() => Promise<LenisCtor>>()
      .mockRejectedValueOnce(new Error('chunk 404'))
      .mockResolvedValueOnce(fakeCtor);
    const load = createLenisLoader(importer);

    await expect(load()).rejects.toThrow('chunk 404');
    await expect(load()).resolves.toBe(fakeCtor);
    expect(importer).toHaveBeenCalledTimes(2);
  });
});
