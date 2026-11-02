# Phase 7: Page Transitions & Smooth Scroll - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log preserves the alternatives considered.

**Date:** 2026-11-02
**Phase:** 07-page-transitions-smooth-scroll
**Areas discussed:** Transition style, Smooth scroll feel, Parallax targets, Arrival & back nav

---

## Transition style

| Option | Description | Selected |
|--------|-------------|----------|
| Panel wipe | A solid panel sweeps across, then reveals the new page. Echoes the Phase 6 shutter | ✓ |
| Crossfade + lift | The old page fades out and the new one fades in with a slight rise | |
| Clip reveal of new page | The new page unmasks via a clip-path inset, with no panel colour | |
| You decide | UI-SPEC/taste picks | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, morph cover | Shared-element transition from card to detail | ✓ |
| No, same as others | One general transition | |

The detail page has no cover image (Phase 4 "no cover repeat"), so the morph target was asked as a follow-up:

| Option | Description | Selected |
|--------|-------------|----------|
| Title morphs to intro h1 | The card title grows into the detail heading, and the wipe covers the rest | ✓ |
| Cover → first stack image | Crops differ, the morph may jump, and it may land off-screen on mobile | |
| Cover expands then wipes | The cover fills the viewport as the panel | |

| Option | Description | Selected |
|--------|-------------|----------|
| Ink (dark) | A neutral, high-contrast sweep, with accent reserved for interaction | ✓ |
| Accent #0F70B7 | A brand-colour sweep | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same wipe (EN/ES switch) | Every same-site navigation animates | ✓ |
| No, instant swap | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Short opacity crossfade (reduced) | Matches the Phase 6 reduced = opacity-only rule | ✓ |
| Instant, no animation | | |

**User's choice:** Panel wipe in ink, title morph to the intro h1, the EN/ES switch animates, a crossfade under reduced motion.

---

## Smooth scroll feel

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle | Lenis lerp about 0.1 | ✓ |
| Pronounced | A heavier, buttery glide | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Desktop/fine pointer only | Touch keeps native momentum | ✓ |
| Everywhere incl. touch | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Glide, skip link instant | Anchors glide and move focus; the skip link jumps | ✓ |
| Everything glides | | |
| Everything jumps | | |

| Option | Description | Selected |
|--------|-------------|----------|
| You decide (embeds) | Research picks the iframe wheel fix | ✓ |
| Native scroll on detail pages | | |

**User's choice:** Subtle, desktop only, content anchors glide and the skip link is instant, embeds left to Claude's discretion.

---

## Parallax targets

| Option | Description | Selected |
|--------|-------------|----------|
| Hero portrait | | |
| Project card covers | | ✓ |
| Detail image stack | Per-image drift inside the frame | ✓ |
| Next-project teaser | | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Gentle | About 5–10% travel | ✓ |
| Strong | About 15–20%, more crop | |

| Option | Description | Selected |
|--------|-------------|----------|
| Accept, gentle only | Verify the seams visually and drop stack parallax if one breaks | ✓ |
| Whole-stack drift | | |
| Per-project opt-out | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, on native scroll (touch) | | ✓ |
| No, desktop only | | |

**User's choice:** Cards, stack and teaser (not the hero), gentle, seams verified visually, touch included.

---

## Arrival & back nav

| Option | Description | Selected |
|--------|-------------|----------|
| New page's h1 | tabindex=-1, announced immediately | ✓ |
| `<main>` landmark | | |
| Top of document | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Restore scroll position | The transition still plays | ✓ |
| Restore + no animation | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Header stays, content wipes | A persistent shell and cursor | ✓ |
| Full-viewport wipe | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, chained after wipe | The hero/split and above-fold reveals play after the wipe, ≤ about 1.2 s total | ✓ |
| Page arrives settled | | |

**User's choice:** Focus on the h1, Back restores the position with the transition, the header persists, entrance motion is chained.

---

## Claude's Discretion

- The router choice: ClientRouter vs native cross-document view transitions (research flag)
- The embed (iframe) wheel handling under smooth scroll
- The parallax engine (ScrollTrigger vs a custom driver vs CSS scroll timelines)
- Wipe direction, duration and easing, plus exact lerp and travel values (UI-SPEC with the taste skill)
- view-transition-name assignment and morph behaviour with the SplitText h1

## Deferred Ideas

None.
