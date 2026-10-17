# Phase 4: Project Detail & Discovery - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-17
**Phase:** 04-project-detail-discovery
**Areas discussed:** Canvas fidelity, Images & the Figma embed, Page frame & metadata, Filters N/A & year

---

## Canvas fidelity

| Option | Description | Selected |
|--------|-------------|----------|
| Seamless stack | Edge-to-edge, honours fullBleed, ~1400px column | ✓ |
| Site-styled with gaps | Framed blocks, card language | |
| Hybrid | Seamless where fullBleed, gaps otherwise | |

| Option (text styling) | Description | Selected |
|--------|-------------|----------|
| Strip to site typography | Keep structure, drop colour/font/size | ✓ |
| Keep her inline styling | Needs per-project dark background | |
| Keep alignment only | Strip all except text-align | |

| Option (background) | Description | Selected |
|--------|-------------|----------|
| Site theme background | Light/dark token | ✓ |
| Per-project override colour | `canvasBg` override | |
| You decide | | |

| Option (motion) | Description | Selected |
|--------|-------------|----------|
| Static now, motion in Phase 7 | | ✓ |
| Simple reveal now | | |

**User's choice:** All recommended options.

---

## Images & the Figma embed

| Option (storage) | Description | Selected |
|--------|-------------|----------|
| Commit, re-encoded at sync | WebP/AVIF, offline build, modest repo | ✓ |
| Commit originals as-is | Large git growth | |
| Gitignored local cache | Breaks fresh-clone offline build | |

| Option (resolution) | Selected |
|--------|----------|
| 1400px | ✓ |
| 1920px | |

| Option (embed) | Selected |
|--------|----------|
| Click-to-load facade | ✓ |
| Live iframe, lazy-loaded | |
| Link out only | |

| Option (unknown modules) | Selected |
|--------|----------|
| Quiet "View on Behance" note | ✓ |
| Skip silently | |

| Option (alt text) | Selected |
|--------|----------|
| Optional per-image override, else derived | ✓ |
| Decorative (alt="") | |
| Draft all now | |

| Option (MediaCollection) | Selected |
|--------|----------|
| Responsive grid | ✓ |
| Flatten into the stack | |
| You decide | |

**User's choice:** All recommended options.

---

## Page frame & metadata

| Option (page top) | Selected |
|--------|----------|
| Title-first intro band | ✓ |
| Cover hero | |
| Sticky side panel | |

| Option (next/prev order) | Selected |
|--------|----------|
| Projects-page order, wraps around | ✓ |
| Projects-page order, no wrap | |

| Option (next/prev UI) | Selected |
|--------|----------|
| Big "Next project" teaser | ✓ |
| Two simple text links | |
| You decide | |

| Option (contact CTA) | Selected |
|--------|----------|
| Home #contact anchor | ✓ |
| mailto: her email | |

| Option (tools) | Selected |
|--------|----------|
| Reuse ToolIcon + name | ✓ |
| Text chips only | |

**User's choice:** All recommended options.

---

## Filters N/A & year

| Option | Selected |
|--------|----------|
| Record PROJ-04..07 N/A | ✓ |
| Build filters anyway | |

| Option (year filter) | Selected |
|--------|----------|
| Drop the year filter (amend PROJ-06) | ✓ |
| Keep it | |

**User's choice:** All recommended options.

---

## Claude's Discretion

- Image encoding format/quality and storage path; sanitizer library and allowlist; module-renderer component split; per-page SEO; fallback copy, facade poster, teaser visuals, collection grid columns (via UI-SPEC and the taste skill).

## Deferred Ideas

- Detail-page scroll motion → Phase 7
- Per-project `canvasBg` override (not chosen)
- Drafting all 154 module alts now (not chosen)
- Filters/search until ≥8 projects
