/**
 * Typed mirror of the motion tokens in global.css (UI-SPEC "Motion Tokens") for GSAP tweens.
 * Durations are in seconds; tests/unit/motion-tokens.test.ts keeps them equal to the `--t-*`
 * custom properties. `--t-fade` and `--t-hero` are CSS-only and have no entry here.
 */
export const durations = {
  press: 0.14,
  hover: 0.18,
  ui: 0.24,
  settle: 0.56,
  line: 0.64,
  shutter: 0.72,
} as const;

/** Closest GSAP power curves to the `--ease-*` cubic-beziers (CustomEase is not loaded). */
export const eases = {
  reveal: 'power4.out',
  travel: 'power3.inOut',
  soft: 'power2.out',
} as const;
