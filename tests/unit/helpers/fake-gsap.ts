import { vi } from 'vitest';
import type { GsapModules } from '../../../src/lib/motion/load-gsap';

/** Records what a from-tween was asked to do; `progress(1)` runs onComplete like GSAP does. */
export interface FakeTween {
  targets: unknown;
  vars: Record<string, unknown>;
  progress: ReturnType<typeof vi.fn>;
}

type SplitVars = Record<string, unknown> & { onSplit?: (self: FakeSplitText) => unknown };

/**
 * Stand-in for GSAP SplitText: `create()` wraps the target's content in one mask span holding one
 * line span (inline `overflow: clip`, like the real masks), then calls `onSplit` synchronously.
 * `revert()` restores the original innerHTML and counts calls.
 */
export class FakeSplitText {
  static created: FakeSplitText[] = [];

  readonly target: HTMLElement;
  readonly vars: SplitVars;
  readonly lines: HTMLElement[] = [];
  readonly masks: HTMLElement[] = [];
  readonly original: string;
  onSplitResult: unknown;
  reverted = 0;

  constructor(target: HTMLElement, vars: SplitVars) {
    this.target = target;
    this.vars = vars;
    this.original = target.innerHTML;
    const doc = target.ownerDocument;
    const mask = doc.createElement('span');
    mask.className = 'split-line-mask';
    mask.style.overflow = 'clip';
    const line = doc.createElement('span');
    line.className = 'split-line';
    line.innerHTML = target.innerHTML;
    mask.append(line);
    target.replaceChildren(mask);
    this.lines.push(line);
    this.masks.push(mask);
    FakeSplitText.created.push(this);
    this.onSplitResult = vars.onSplit?.(this);
  }

  static create(target: HTMLElement, vars: SplitVars): FakeSplitText {
    return new FakeSplitText(target, vars);
  }

  revert(): void {
    this.reverted += 1;
    this.target.innerHTML = this.original;
  }

  static reset(): void {
    FakeSplitText.created = [];
  }
}

export interface GsapFake {
  modules: GsapModules;
  tweens: FakeTween[];
  from: ReturnType<typeof vi.fn>;
  context: ReturnType<typeof vi.fn>;
  revert: ReturnType<typeof vi.fn>;
}

export function makeGsapFake(): GsapFake {
  const tweens: FakeTween[] = [];
  const from = vi.fn((targets: unknown, vars: Record<string, unknown>) => {
    const tween: FakeTween = {
      targets,
      vars,
      progress: vi.fn((value?: number) => {
        if (value === 1) (vars['onComplete'] as (() => void) | undefined)?.();
        return tween;
      }),
    };
    tweens.push(tween);
    return tween;
  });
  const revert = vi.fn();
  const context = vi.fn(() => ({
    add(fn: () => unknown) {
      return fn();
    },
    revert,
  }));
  return {
    modules: { gsap: { from, context }, SplitText: FakeSplitText } as unknown as GsapModules,
    tweens,
    from,
    context,
    revert,
  };
}
