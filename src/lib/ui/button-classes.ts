// Shared pill button class strings, so links and buttons that look alike never drift apart.

// Accent pill, split for the magnetic pull (Phase 6 D-12, UI-SPEC "Magnetic Targets"): the shell
// (`a`/`button`, `data-magnetic="pill"`) owns the 48px hit area and the focus outline and never
// moves; the face (`span[data-magnetic-face]`) carries fill, padding, label and icon, and is the
// only part GSAP translates. Used by ButtonLink and the contact submit. At rest the pair renders
// exactly like the Phase 5 single-element pill.
export const primaryShell =
  'focus-visible:outline-accent inline-flex h-12 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2';

// One transition declaration for both the hover fill and the press scale; the press only applies
// under `data-motion="on"`. GSAP's x/y write `transform`, the press writes `scale`, so they never clash.
export const primaryFace =
  'bg-accent text-accent-ink hover:bg-accent/90 inline-flex h-full items-center gap-2 rounded-full px-6 text-sm font-semibold motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-on:active:scale-[0.97]';

// Ink pill: the secondary action (embed facade load, "Send another message"). Never magnetic.
export const inkButton =
  'bg-ink text-surface focus-visible:outline-accent hover:bg-ink/90 inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors motion-safe:duration-150';
