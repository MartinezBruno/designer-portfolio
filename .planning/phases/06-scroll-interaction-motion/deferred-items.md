# Phase 06 deferred items

## From 06-08 (out of scope, pre-existing)

- **16 e2e failures from the 06-07 magnetic shell/face split.** `tests/e2e/home-story.spec.ts:268` ("accent: hero CTA uses the client primary color", `/` and `/es/`) and `tests/e2e/project-detail.spec.ts:161` ("ends with the contact band…", all 14 detail pages) select `a.bg-accent` / `button.bg-accent`. Since 06-07 the fill class sits on the inner `span[data-magnetic-face]` (`src/lib/ui/button-classes.ts:14`), so those locators match 0 elements. 06-08 touches neither file. Fix: point the locators at `[data-magnetic-face].bg-accent`, or at the shell plus its face.
