---
sketch: 001
name: hero-portrait-shape
question: "Which shape should the hero portrait take now that the asset is a 3:4 background-removed cutout?"
winner: "synthesis C+D"
tags: [hero, portrait, imagery, phase-8-gap]
---

# Sketch 001: Hero portrait shape

## Design Question
The hero portrait ships as `aspect-square rounded-full object-contain` with stale `width={321} height={324}`.
The asset is now a 2310×3080 (3:4) cutout. Is a circle still right, or should the portrait take a vertical shape?

## How to View
open .planning/sketches/001-hero-portrait-shape/index.html

## Variants
- **A: Círculo (actual)**: what ships today. The cutout is letterboxed and clipped by the circle.
- **B: Rectángulo 4:5**: same ratio and radius as the work cards. Tinted ground stands in for the original photo background.
- **C: Arco**: semicircle top with a card-radius bottom. 3:4, shows shoulders and the koi print.
- **★ Síntesis (winner): arco C + azul D**: C's arch (3:4, semicircle top, 1.25rem bottom corners) on the accent-blue #0f70b7 ground from D, `object-position: 50% 6%`.
- **D: Recorte sobre bloque azul**: the figure rises out of an accent-blue block; only the bottom is clipped.

## What to Look For
- Weight against the 168px "Hola, soy / Martina." headline at desktop width
- Mobile (375): the portrait sits above the headline (order-first)
- Hair halo of the cutout on each background (toolbar → Fondo)
- The D-03 shutter entrance (toolbar → Repetir entrada) still reads on each shape

## Constraints for implementation (from Phase 6–8)
- D-03 portrait unmask must stay; first frame never blank (no JS-dependent hiding)
- D-09: no parallax on the hero portrait
- Real width/height for zero CLS; the hero lead is today's LCP element, and a larger portrait may become the LCP element, so re-measure (08-LIGHTHOUSE protocol)
- taste-skill gate (lint.mjs, inspect.mjs, screenshots) before done

## Decision
User picked C's arch with D's accent-blue background (2026-11-09). This ties the portrait to the roles band and the footer.
Prerequisite: clean the cutout's hair halo, because it shows on blue. Options are a re-exported cutout with a refined edge, or a 1–2px edge erode/defringe pass on the asset.
