import { describe, expect, it, vi } from 'vitest';
import { createGsapLoader, type GsapModules } from '../../src/lib/motion/load-gsap.ts';

function fakeModules(): { modules: GsapModules; registerPlugin: ReturnType<typeof vi.fn> } {
  const registerPlugin = vi.fn();
  const SplitText = { name: 'SplitText' };
  const modules = { gsap: { registerPlugin }, SplitText } as unknown as GsapModules;
  return { modules, registerPlugin };
}

describe('createGsapLoader', () => {
  it('memoises the load: two calls share one promise and one import', async () => {
    const { modules } = fakeModules();
    const importer = vi.fn(() => Promise.resolve(modules));
    const load = createGsapLoader(importer);

    const first = load();
    const second = load();

    expect(second).toBe(first);
    await expect(first).resolves.toBe(modules);
    expect(load()).toBe(first);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('registers SplitText exactly once', async () => {
    const { modules, registerPlugin } = fakeModules();
    const load = createGsapLoader(() => Promise.resolve(modules));

    await load();
    await load();

    expect(registerPlugin).toHaveBeenCalledTimes(1);
    expect(registerPlugin).toHaveBeenCalledWith(modules.SplitText);
  });

  it('rejects on a failed import and retries on the next call', async () => {
    const { modules } = fakeModules();
    const importer = vi
      .fn<() => Promise<GsapModules>>()
      .mockRejectedValueOnce(new Error('chunk 404'))
      .mockResolvedValueOnce(modules);
    const load = createGsapLoader(importer);

    await expect(load()).rejects.toThrow('chunk 404');
    await expect(load()).resolves.toBe(modules);
    expect(importer).toHaveBeenCalledTimes(2);
  });
});
