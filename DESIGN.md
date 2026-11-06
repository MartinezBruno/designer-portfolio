---
name: Martina Fernandez Portfolio
description: A confident white page, a giant grotesk name, and her work given the space, in client blue.
colors:
  accent: '#0f70b7'
  accent-hover: 'color-mix(in oklab, #0f70b7 88%, #111111)'
  accent-ink: '#ffffff'
  ink: '#111111'
  ink-muted: '#565b61'
  surface: '#ffffff'
  surface-alt: '#f2f3f5'
  danger: '#b42318'
  success: '#1f7a4d'
typography:
  display:
    fontFamily: 'Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif'
    fontSize: 'clamp(3.75rem, 0.5rem + 11.5vw, 10.5rem)'
    fontWeight: 600
    lineHeight: 0.86
    letterSpacing: '-0.04em'
  headline:
    fontFamily: 'Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif'
    fontSize: 'clamp(2.5rem, 1.25rem + 4.6vw, 5.5rem)'
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: '-0.035em'
  title-lg:
    fontFamily: 'Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif'
    fontSize: '3rem'
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: '-0.025em'
  title:
    fontFamily: 'Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif'
    fontSize: '2.25rem'
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: '-0.025em'
  title-sm:
    fontFamily: 'Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '-0.025em'
  lead:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: 'clamp(1.125rem, 1rem + 0.5vw, 1.25rem)'
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 600
    lineHeight: 1.4
rounded:
  none: '0px'
  tip: '8px'
  pill: '9999px'
spacing:
  gutter-sm: '16px'
  gutter-md: '32px'
  gutter-lg: '48px'
  column-gap: '32px'
  section-sm: '128px'
  section-lg: '176px'
  container: '88rem'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-ink}'
    typography: '{typography.body}'
    rounded: '{rounded.pill}'
    padding: '0 28px'
    height: '56px'
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
    textColor: '{colors.accent-ink}'
  button-ink:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.surface}'
    typography: '{typography.label}'
    rounded: '{rounded.pill}'
    padding: '0 24px'
    height: '48px'
  chip:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.pill}'
    padding: '8px 16px'
    height: '44px'
  chip-selected:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.surface}'
  input-field:
    backgroundColor: '{colors.surface-alt}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.none}'
    padding: '12px 16px'
    height: '48px'
  tool-item:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.lead}'
    rounded: '{rounded.pill}'
    size: '56px'
  tooltip:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.surface}'
    typography: '{typography.label}'
    rounded: '{rounded.tip}'
    padding: '4px 8px'
  roles-band:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-ink}'
    typography: '{typography.title-sm}'
    padding: '24px 0'
---

# Design System: Martina Fernandez Portfolio

## Overview

**Creative North Star: "The Gallery Wall in Client Blue"**

The category standard played straight, at Awwwards Site-of-the-Day craft. A pure white page carries a giant Bricolage Grotesque name, a strict 12-column grid gives the work the space, and the client blue arrives at page scale: the roles band under the hero, the footer block, link underlines, the cursor dot, the text selection. Everything else is ink on white with one tone step to a cool grey.

Density is low and confident. Sections are separated by large vertical space (128px, 176px on desktop) and a tone step to the cool grey surface, never by lines or boxes. Project imagery sits flush on the page with square corners and no frame; the type and the work do the talking. Headings rise line by line, covers open like shutters, and pages change under a flat ink wipe, all behind a three-state motion gate that falls back to fades or to stillness.

The world rejects the soft beige card-grid portfolio: rounded grey tiles, small headings, outlined boxes, shadows, gradients and tracked uppercase labels are not part of it.

**Key Characteristics:**

- White ground, near-black ink, client blue at page scale; one cool grey tone step for section changes and image wells.
- Bricolage Grotesque display at very large sizes with tight negative tracking; Inter for all running text.
- Strict 12-column grid inside an 88rem container with 16 / 32 / 48px gutters.
- Square media, pill controls, no card boxes, no shadows at rest.
- Motion is a system, not decoration: reveal kinds (settle, lines, shutter), a hero load sequence, ink-wipe navigation, magnetic pills and a custom cursor, every one gated on/reduced/off.

## Colors

A three-voice palette: white paper, near-black ink, and one saturated client blue that is used in large fields, not sprinkled.

### Primary

- **Client Blue** (`accent`): the binding brand colour. Fills the roles marquee band, the footer block, the primary pill CTA, the cursor dot and "View" pill, `::selection`, and `accent-color`/`caret-color`. As a line it is the 2px underline decoration on text links and the 2px focus outline on every interactive control.
- **Deep Client Blue** (`accent-hover`): the primary pill's hover fill, mixed 12% toward ink in OKLab. It darkens, never lightens, so white 16px text keeps at least 4.5:1.
- **Blue-Field White** (`accent-ink`): text and icons set on Client Blue; icons on the band drop to 70% of it.

### Neutral

- **Gallery White** (`surface`): the page ground, header background, the tool-mark circles, and text on ink.
- **Cool Grey Step** (`surface-alt`): the only second surface. The Tools section band, the project contact band, image wells behind covers, text-field fills and the Turnstile placeholder.
- **Near-Black Ink** (`ink`): all headings and body copy, the ink pill, selected chips, the motion toggle tooltip and the navigation wipe panel.
- **Graphite** (`ink-muted`): secondary meta (card category and tools, detail-page `dt` labels, field hints), the field bottom border and unselected chip outline.

### Tertiary

- **Signal Red** (`danger`): form error text, error summary and invalid field border only.
- **Signal Green** (`success`): the 8px availability dot only.

### Named Rules

**The Page-Scale Blue Rule.** Client Blue is either a full-bleed field (band, footer) or a 2px line (underline, focus ring). Do not tint cards, chips or backgrounds with it at partial opacity.

**The One Step Rule.** Section changes use space or the single tone step from white to cool grey. There is no third surface and no divider line.

## Typography

**Display Font:** Bricolage Grotesque (variable 200 to 800, self-hosted; falls back to ui-sans-serif, system-ui)
**Body Font:** Inter (variable 100 to 900, self-hosted; same fallbacks)

**Character:** A characterful grotesk shouting her name at poster scale over a neutral, highly legible text face. The display face does all the personality; Inter stays out of the way.

### Hierarchy

- **Display** (600, fluid 60px to 168px, line-height 0.86, tracking -0.04em): the hero name ("Hi, I'm / Martina."), the Projects page h1 and the 404 numeral. Optically nudged left by 0.05em so the cap stem aligns with the grid edge.
- **Headline** (600, fluid 40px to 88px, line-height 0.95, tracking -0.035em): section headings (Latest work, What I can do for you, Tools I work with, Next project, the footer "Let's talk") and the project-detail h1 from the sm breakpoint. Capped at 16ch on Home and balanced.
- **Title Large** (600, 48px, line-height 1.1): service names on desktop, contact and project-band headings on sm and up, the 404 h1.
- **Title** (600, 36px, line-height 1.1): full project card titles, the next-project title, service names at sm, mobile detail h1.
- **Title Small** (600, 24px, line-height 1.3): compact card titles, the header wordmark, the roles band at mobile (stepping to 30px at xl and 40px at 2xl), success heading.
- **Lead** (400, fluid 18px to 20px, line-height 1.5): hero intro, section intros, service item lists, card summaries, "See all projects". Capped at 46ch for intros, 60ch for summaries.
- **Body** (400, 16px, line-height 1.5): running text, nav links and button labels (600), card meta.
- **Label** (600, 14px, line-height 1.4): chips, the motion toggle tooltip, the cursor "View" pill and ink pill labels. Sentence case, no added tracking.

The footer wordmark (her full name at 10.4vw, capped at 9.4rem, line-height 0.82, tracking -0.045em) is a single signature use of the display face, not a reusable step.

### Named Rules

**The Two-Line Ceiling Rule.** Every headline wraps to at most two lines at every width; balance or cap its measure rather than letting it run to three.

**The Sentence Case Rule.** All meta, labels and buttons are sentence case at their natural tracking. Negative tracking belongs to display sizes only.

## Layout

One centred container (88rem max) with page gutters of 16px, 32px from sm (640px) and 48px from lg (1024px). Inside it a 12-column grid with a 32px column gap governs every section from lg (project grids from md). Composition examples observed in the build: the hero headline spans columns 1 to 9 bottom-aligned with the portrait in 10 to 12 top-aligned; the services heading sticks in columns 1 to 4 (fluid size, capped so EN and ES stay on two lines) beside the index in columns 5 to 12; Tools stacks its heading over a wrapping list of named tools; Contact splits 5/7; the project grid alternates 7/5 and 5/7 tiles with an occasional 8-wide tile from column 3, while the Home "Latest work" row is three even 4-column tiles.

Vertical rhythm on Home is a flex column with 128px between sections (176px from lg); full-bleed bands (roles marquee, Tools, footer) break out of the container edge to edge and carry their own 80 to 112px block padding. Below lg everything collapses to a single column, the portrait moves above the headline and shrinks (128px, 176px at sm, 256px at lg, 304px at 1400px; the asset is 321px, so it never renders larger), and the header wraps its nav to a second row.

Breakpoints are Tailwind's defaults (640 / 768 / 1024 / 1280 / 1536px) plus a 1400px step for the portrait.

## Elevation & Depth

The system is flat. No element casts a shadow at rest or on hover, and there are no gradients. Depth comes from three things only: the single tone step to cool grey, full-bleed colour fields, and motion layering (the sticky white header sits above the content; during navigation the ink wipe panel passes over the page, with the header and morphing project title stacked above it).

### Named Rules

**The Flat Paper Rule.** Surfaces never lift. State is shown by fill change (blue to deep blue, white to ink), underline, or the card image's inset clip, never by shadow.

## Shapes

Two corner values carry the whole system, plus one small exception.

- **Square** (0px): every image, cover, image well, detail-page module, text field, band and section. Media corners are never rounded.
- **Pill / circle** (fully rounded): every button (primary, ink), selection chip, tool-mark circle, the cursor dot and "View" pill, the availability dot, and the hero portrait, which is a binding circular-crop asset.
- **Soft tip** (8px): the motion toggle hint tooltip only.

Borders exist only where accessibility needs a boundary: a 2px bottom border on text fields and a 2px outline on unselected chips. There are no 1px rules and no outlined boxes. Images can be clipped dynamically: the shutter reveal opens a square frame from the bottom edge, and on hover the card mat insets 12px.

## Components

### Buttons

Confident, filled, and the only thing that moves toward the pointer.

- **Shape:** full pill.
- **Primary:** Client Blue fill, white 16px semibold label with a trailing 20px arrow, 56px tall with 28px side padding. Built as a still shell (owns the 56px hit area and the focus ring) around a face that carries the fill and translates under the magnetic pull when motion is on.
- **Hover / Focus:** fill steps to Deep Client Blue over 150ms; press scales the face to 0.97 under motion on only; focus is a 2px Client Blue outline offset 2px.
- **Ink (secondary):** ink fill, white 14px semibold label, 48px tall, 24px padding; hover drops the ink to 90%. Never magnetic. Used for "load the embed" and "Send another message".

### Text links

The house link is ink text with a 2px Client Blue underline offset 4 to 6px, either always on (service "Ask about this", footer email) or appearing on hover and focus (card titles, "See all projects", back links). Arrow icons trail at 20px. Nav links go ink to Client Blue on hover.

### Chips

- **Style:** pill, 44px minimum height, 14px semibold label, 2px Graphite outline on white.
- **State:** hover darkens the outline to ink; selected fills ink with white text and reveals a check icon. Single-choice radio semantics.

### Cards / Containers

There are no card boxes. A project tile is a square-cornered cover in a cool-grey well (aspect 5:4, 7:8 or 4:5 by grid slot) with its title and meta directly on the page below, 16px apart. The title link is stretched over the whole tile, so each tile is one tab stop. Hover or keyboard focus (motion on only) insets the cover 12px over 400ms and scales the image to 1.05 over 700ms, and underlines the title in blue. Services are an open index: a large title with an "Ask about this" link on the baseline and a two-column lead-size item list, separated by 80 to 96px of space.

### Inputs / Fields

- **Style:** square, cool-grey fill, 2px Graphite bottom border only, 16px text, 48px tall (message area 160px minimum, vertically resizable). Labels sit above in 16px semibold ink; hints in 14px Graphite.
- **Focus:** 2px Client Blue outline offset 2px.
- **Error:** bottom border turns Signal Red; the error line below carries an alert icon in 14px red.

### Navigation

A sticky 64px white header with no border: the wordmark in title-small display type left; Projects and Contact links, the EN / ES switcher and the motion toggle icon right. On mobile the links wrap to a second full-width row. The motion toggle carries an ink tooltip.

### Roles Marquee (signature)

A full-bleed Client Blue band directly under the hero listing her roles in display semibold white with 70%-white asterisk icons. Under motion on it scrolls as a 40s linear loop (duplicated copy, aria-hidden), pausing on hover and on its full-band toggle button; under reduced and off it is a centred wrapping row. The type size is identical in every motion state (24px, 30px at xl, 40px at 2xl), so toggling motion never changes the band height.

### Tool List

On the cool-grey band, each tool is a white 48px circle (56px from sm) holding its decorative SVG mark, followed by the tool's name as visible lead text (600). Nothing is interactive and nothing is a tab stop; the visible name is the accessible text, so touch users and anyone who doesn't know a brand mark can read it.

### Footer Block

A full-bleed Client Blue block: "Let's talk" headline, the email as a large underlined display link, and her full name as an edge-to-edge display wordmark above the copyright.

### Motion System (signature)

The motion layer is incumbent and part of the system.

- **Gate:** `data-motion` on `<html>` is `on`, `reduced` (OS setting or the header toggle) or absent (`off`, no JS). Hidden start states exist only under on/reduced, so off always shows everything. A 1.5s failsafe reveals anything no script armed; print gets every end state.
- **Reveal kinds:** `settle` (fade plus a 20px rise over 560ms), `lines` (section headings split into masked lines that rise; unsplit headings fade over 320ms), `shutter` (covers open from the bottom edge over 720ms while the picture scales from 1.08). Staggers of 70 to 90ms. Under reduced every kind is an opacity-only fade.
- **Hero load:** pure CSS; the two headline lines rise from 60% down their masks (720ms, second line +90ms), the portrait opens from 35% (840ms), lead and CTA settle at 200 and 280ms. It plays once and never under reduced or off.
- **Navigation:** under on, a flat ink panel wipes top to bottom over 560ms and the clicked card title morphs into the arriving h1; under reduced, a 320ms crossfade; the header never animates.
- **Ambient:** Lenis smooth scroll, a Client Blue cursor dot that grows over links and becomes a "View" pill over projects, magnetic pill CTAs, cover parallax (about 7.6% travel) and alternating side entrances on detail images, all on only.
- **Easings:** reveal `cubic-bezier(0.22, 1, 0.36, 1)`, travel `cubic-bezier(0.76, 0, 0.24, 1)`, soft `cubic-bezier(0.33, 1, 0.68, 1)`. Durations from 140ms (press) to 720ms (shutter, hero).

## Do's and Don'ts

### Do:

- **Do** use Client Blue as a full-bleed field or a 2px line (underline, focus ring), and white text on it.
- **Do** separate sections with space (128px, 176px from lg) or the single step to cool grey.
- **Do** set headings in Bricolage Grotesque semibold with negative tracking and keep every headline to two lines or fewer at every width.
- **Do** keep image corners square and controls fully round (pills, chips, tool-mark circles).
- **Do** place work on the 12-column grid inside the 88rem container with 16 / 32 / 48px gutters.
- **Do** gate every new motion behind `data-motion` with an opacity-only reduced variant and a visible off state; use the reveal kinds and easing tokens rather than new curves.
- **Do** keep the roles band at one font size across motion states.
- **Do** darken, never lighten, a blue fill on hover so white text keeps 4.5:1.

### Don't:

- **Don't** add eyebrows, kickers or tiny tracked uppercase labels above headings; meta is sentence case.
- **Don't** use 1px hairline rules, divider lines or outlined boxes; the only borders are the 2px field bottom edge and the 2px chip outline.
- **Don't** add shadows at rest, gradients, or card containers around projects or services.
- **Don't** number projects or services with index numerals.
- **Don't** round image or media corners; the circular portrait is a binding asset, not a pattern for other imagery.
- **Don't** render the portrait above roughly 320 CSS px.
- **Don't** use `motion-safe:` for new motion; it ignores the header toggle.
