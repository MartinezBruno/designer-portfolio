---
version: 1
slug: "src-components-views-homeview-astro"
primary_target: "src/components/views/HomeView.astro"
related_targets: ["src/components/views/ProjectsView.astro","src/components/views/ProjectDetailView.astro","src/components/views/NotFoundView.astro"]
---

## Scope

Whole site redesign: Home (`src/pages/index.astro`, `/es/`), Projects index, project detail, 404. Visitor mode: Experience (portfolio). Code-led build.

## Audience and job

Direct clients (small brands) and agencies, equally weighted, arriving in EN or ES. They meet Martina first, judge her taste, browse her real Behance work, and contact her.

## Constraints

Keep every `data-*` motion and test hook, semantics, the reduced-motion and three-state motion gate, the no-JS contact fallback, and the even 3-tile Latest Work row. Client blue #0F70B7 and the portrait are binding. The portrait asset is 321x324 px, so it must not render much larger than about 320 CSS px.

## Direction contract

THESIS: The category standard played straight at Awwwards Site-of-the-Day craft. A confident white page, a giant grotesk name, and a strict 12-column grid where her work gets the space. It refuses the soft beige card-grid portfolio with rounded grey tiles and small headings.

OWN-WORLD: Pure white ground, near-black ink #111, client blue #0F70B7 used at page scale (the roles band, the contact block, link underlines). Bricolage Grotesque display set very large with tight tracking, Inter for text. Sections are separated by space and a tone step (white to #F2F3F5), never lines. There are no card boxes and no shadows and square image corners. Meta text is sentence case.

STORY: The visitor meets Martina (huge greeting, portrait, one-line role) and sees she covers brand, web, social and print. Her work is presented large. They scan her services as an index, see her tools, and hit a full-bleed blue contact block that makes reaching out the obvious next step.

FIRST VIEWPORT: The header is a thin row: name left, nav, language and motion toggle right. A display headline "Hi, I'm / Martina." spans columns 1–9, bottom-aligned, at clamp(4rem, 13vw, 12.5rem). The portrait (about 280–320px, square corners) sits in columns 10–12, top-aligned with the first line. Under the headline is a three-column meta strip: the role and description lead (columns 1–6), availability (columns 7–9), and the primary blue pill CTA "Let's work together" (columns 10–12, right-aligned). The blue roles marquee starts at the bottom edge.

FORM: Category standard (canon), chosen by the user over the rolled directions; Awwwards-tier personal portfolios as the bar. Signature interaction: project tiles reveal an index number and category on hover while the image scales slightly; section headings rise line by line (motion on only). seed: seed:514005971fb57e71

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
