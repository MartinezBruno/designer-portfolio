# Phase 2: Homepage Story - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log preserves the alternatives considered.

**Date:** 2026-10-16
**Phase:** 02-homepage-story
**Areas discussed:** Real content vs drafts, Availability badge behavior, Tool logos vs text-only, Marquee band color / primary color

---

## Real content vs drafts

| Option | Description | Selected |
|--------|-------------|----------|
| Ship drafts | UI-SPEC drafts marked TODO(martina) | |
| I'll paste real content | User supplies real lists | ✓ |
| Mix | Some confirmed, rest drafts | |

**User's choice:** Pasted a mockup screenshot (saved as `02-client-mockup.png`) containing roles, 4 services with bullet lists, and 5 apps.

| Option | Description | Selected |
|--------|-------------|----------|
| Title + bullet list | Her deliverables as `<ul>`; amends UI-SPEC | ✓ |
| Title + short sentence | Condense to 1–2 sentences per UI-SPEC | |
| Sentence + bullets | Summary line plus bullets | |

| Option | Description | Selected |
|--------|-------------|----------|
| Mockup order | Gráfico, Web, Branding, Social media | ✓ |
| Match marquee order | Web, Branding, Social, Gráfico | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fix typos only | merchandasing, en gral | |
| Verbatim | Exactly as written | |
| Polish freely | Tighten and parallelize; still for her review | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Optional intro line | `intro` field above the list | |
| Fold into the title | "Branding e identidad visual" | |
| Drop it | Bullets only | |

**User's choice (free text):** "identidad visual should also be a bullet"

---

## Availability badge behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Show closed state | Hollow ring plus "Not taking new projects right now" | |
| Hide the badge | Disappears when unavailable; amends SC3 | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Available | true | ✓ |
| Not available | false | |
| Unknown, default true | TODO(martina) | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep in hero | Pill above the greeting | ✓ |
| Near the hero CTA | Beside "Let's work together" | |

| Option | Description | Selected |
|--------|-------------|----------|
| Available for projects | ES: Disponible para proyectos | |
| Open to new projects | ES: Abierta a nuevos proyectos | ✓ |
| Taking freelance work | ES: Disponible para trabajos freelance | |

---

## Tool logos vs text-only

| Option | Description | Selected |
|--------|-------------|----------|
| Tabler icon + name | Uniform line icons; Lightroom uses generic brand-adobe | ✓ |
| Lettered monogram tiles | Ai/Id/Ps/Lr squares like the mockup | |
| Text-only tiles | Names only | |

| Option | Description | Selected |
|--------|-------------|----------|
| Visible names | Name is the visible and accessible label | |
| Icon-only, name on hover + sr-only | Matches mockup | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Names visible on small screens | Tooltip on desktop, captions on touch | |
| Focusable tooltip everywhere | Hover/focus/tap tooltip at all sizes; adds 5 tab stops and a little JS | ✓ |
| sr-only only, accept the gap | Touch users never see names | |

---

## Marquee band color / primary color

User free text: "site primary color must be #0F70B7 as client request". Measured: white on #0F70B7 5.22:1; on surface 4.89:1; on surface-alt 4.33:1.

| Option | Description | Selected |
|--------|-------------|----------|
| Replace accent token | `--color-accent` → #0F70B7 everywhere | ✓ |
| Add a separate brand token | Keep purple accent, blue for brand surfaces | |

| Option | Description | Selected |
|--------|-------------|----------|
| Blue band, white text | Matches mockup; white focus ring on band | ✓ |
| Keep beige band | Current spec | |

---

## Claude's Discretion

- Separator and pause button styling on the blue band; tooltip visuals; bullet marker style; whether 4 roles fill the marquee track at wide viewports.
- Content file format (not discussed, so the research default JSON applies).

## Deferred Ideas

- Mockup card style (bordered/shadowed, centered serif titles) and short headings ("Servicios"/"Apps"): offered, not taken up.
