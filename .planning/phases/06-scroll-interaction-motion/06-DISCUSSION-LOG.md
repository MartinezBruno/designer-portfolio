# Phase 6: Scroll & Interaction Motion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log preserves the alternatives considered.

**Date:** 2026-10-29
**Phase:** 06-scroll-interaction-motion
**Areas discussed:** Reveal & text-split feel, Project card hover effect, Cursor & magnetic buttons, Motion toggle

---

## Reveal & text-split feel

| Option | Description | Selected |
|--------|-------------|----------|
| Mask/clip wipes | Images unmask with clip-path wipes, text rises from a mask | |
| Soft fade-up | Opacity + small translateY, staggered | |
| Mixed by section | Bold wipes for imagery, soft fades for body sections | |
| You decide | Claude + taste skill pick per section | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Lines, masked | Each line slides up from behind a mask | ✓ |
| Words, staggered | Word-by-word rise | |
| Characters | Per-letter animation | |
| Hero chars, rest lines | Char flourish on hero only | |

| Option (detail-page conflict with Phase 4 D-04) | Description | Selected |
|--------|-------------|----------|
| Reveals here, parallax in P7 | Intro/text/teaser reveals; image stack static | ✓ |
| Reveal everything incl. images | Also reveal each module image | |
| Keep D-04: no detail motion | Amend SC1 to Home + Projects only | |

| Option (hero load) | Description | Selected |
|--------|-------------|----------|
| Short load sequence | Headline split + portrait unmask + CTA, under ~1 s | ✓ |
| No hero animation | Static hero | |
| You decide | UI-SPEC decides | |

| Option (replay) | Description | Selected |
|--------|-------------|----------|
| Play once | Reveal on first entry only | ✓ |
| Replay on re-entry | Reset and re-animate | |

| Option (reduced motion) | Description | Selected |
|--------|-------------|----------|
| Simple opacity fades | Opacity-only, no movement | ✓ |
| Nothing at all | Fully static | |

**User's choice:** Reveal vocabulary is Claude's call. Lines masked, detail reveals now with parallax in P7, short hero sequence, play once, fades under reduced motion.

---

## Project card hover effect

| Option | Description | Selected |
|--------|-------------|----------|
| Slow zoom + inset clip | Scale ~1.05 + inward clip (mat) | ✓ |
| Cursor-follow reveal | Tilt/shift toward pointer | |
| Duotone/colour wash | Accent tint revealing colour | |
| SVG displacement ripple | feDisplacementMap distortion | |

| Option (focus) | Description | Selected |
|--------|-------------|----------|
| Yes, same effect | focus-visible triggers it too | ✓ |
| Focus ring only | Pointer-only effect | |

| Option (scope) | Description | Selected |
|--------|-------------|----------|
| All project imagery links | Compact, full cards + Next-project teaser | ✓ |
| Project cards only | ProjectCard only | |

---

## Cursor & magnetic buttons

| Option | Description | Selected |
|--------|-------------|----------|
| Dot + contextual label | Accent dot, "View" pill over projects | ✓ |
| Dot + trailing ring | Dot + lagging ring | |
| Blend-mode blob | Difference-blend circle | |

| Option (native cursor) | Description | Selected |
|--------|-------------|----------|
| Keep native, add follower | Native stays, follower added | ✓ |
| Hide native cursor | cursor: none site-wide | |

| Option (magnetic) | Description | Selected |
|--------|-------------|----------|
| Primary CTAs + socials | Pill buttons + social icons | ✓ |
| Every button & icon link | Includes nav and toggles | |
| Primary CTAs only | Pill buttons only | |

| Option (labels) | Description | Selected |
|--------|-------------|----------|
| Only 'View' on projects | One label | ✓ |
| Add 'Open' for external links | Extra label | |
| You decide | UI-SPEC picks | |

---

## Motion toggle

| Option (placement) | Description | Selected |
|--------|-------------|----------|
| Header, next to EN/ES | Icon button on every page | ✓ |
| Footer | Text button in footer | |
| Both | Header + footer | |

| Option (off means) | Description | Selected |
|--------|-------------|----------|
| Fully static | No motion at all | |
| Same as reduced motion | Opacity fades kept | ✓ |

| Option (persist) | Description | Selected |
|--------|-------------|----------|
| localStorage, read by the gate | Before paint, across visits | ✓ |
| Session only | sessionStorage | |
| Not persisted | Resets each load | |

| Option (override OS) | Description | Selected |
|--------|-------------|----------|
| No, toggle only reduces | OS reduced motion always wins | ✓ |
| Yes, explicit opt-in | Toggle can force full motion | |

---

## Claude's Discretion

- Section reveal vocabulary (wipes vs fades vs mix), easing, durations, stagger
- GSAP vs CSS-first per effect within the research stack; lazy-loading; bundle measurement baseline
- Cursor pill animation and the dot's grow amount

## Deferred Ideas

- "Open ↗" cursor label on external links
- SVG/WebGL displacement hover (MOTN-10, v2)
- Detail image-stack reveals/parallax (Phase 7)
