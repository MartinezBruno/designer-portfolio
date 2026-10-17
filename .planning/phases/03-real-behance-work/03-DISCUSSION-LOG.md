# Phase 3: Real Behance Work - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log preserves the alternatives considered.

**Date:** 2026-10-16
**Phase:** 03-real-behance-work
**Areas discussed:** Consent & project count, URLs & slugs, Card content & language, Projects page & Home section, plus follow-ups (new-project handling, nav, image scope)

---

## Consent & project count

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, I have it in writing | Record date, wording, scope in repo | ✓ |
| Yes, verbally | Record as verbal, ask for written later | |
| Not yet, I'll ask her | Sync blocked; fixtures/UI first | |

| Option | Description | Selected |
|--------|-------------|----------|
| Quote + date + scope | docs/CONSENT.md with her words | |
| Date + scope only | Short note, no quote | |
| Screenshot in repo | Image of message in git | |

**User's choice:** Free text: "It's her project. she will provide the apikey as well. is really needed to have that?" After the explanation (DATA-01 / SC1 require it; Adobe ToS context), they chose "one-line note is fine".
**Notes:** Asked about the API key. User: "she forsure does not have an api key. of course that she has hers own credentials for the account." The scrape-based snapshot stays, and credentials are not used.

| Option | Description | Selected |
|--------|-------------|----------|
| Lock 7, sync re-checks | Count recorded; sync flags ≥8 | ✓ |
| Ask Martina first | Wait on her for drafts/private | |
| Lock 7, no re-check | Settle now | |

**Notes:** On 2026-10-16 the live profile returned 7 projects with `hasMore: false`.

---

## URLs & slugs

| Option | Description | Selected |
|--------|-------------|----------|
| /es/projects | Mirrors EN, reuses route helpers | ✓ |
| /es/proyectos | Translated segment, needs a map | |

| Option | Description | Selected |
|--------|-------------|----------|
| Clean lowercase slug | From Behance slug, overridable, dupes fail | ✓ |
| Behance slug as-is | Mixed case | |
| Id + slug | Unique but noisy | |

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal stub pages | Title + cover + Behance link until Phase 4 | |
| Link to Behance for now | Swap in Phase 4 | |
| Link to final URL, 404 meanwhile | Accept 404 in local build | ✓ |

---

## Card content & language

| Option | Description | Selected |
|--------|-------------|----------|
| Bilingual title overrides | {en, es}, fallback to Behance title | ✓ |
| Behance title as-is | No translation | |
| Cleaned Behance title | Tidy, untranslated | |

Card meta (multi-select): Category ✓, Year ✓, Tools ✓, Short summary ✓

| Option | Description | Selected |
|--------|-------------|----------|
| One primary category | One of 4 service ids | ✓ |
| Multiple categories | 1–3 chips | |
| Own category list | Separate bilingual list | |

| Option | Description | Selected |
|--------|-------------|----------|
| Same card everywhere | One full card | |
| Lighter card on Home | Compact variant on Home | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Bilingual override, title fallback | coverAlt {en, es} | ✓ |
| Decorative cover | alt="" | |

---

## Projects page & Home section

| Option | Description | Selected |
|--------|-------------|----------|
| Editorial list | Alternating large rows | |
| Uniform grid | 2–3 columns | |
| Asymmetric masonry | Mixed sizes | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed rhythm by position | CSS grid pattern, order preserved | ✓ |
| Driven by cover aspect ratio | True masonry, order can drift | |
| Override-controlled size | `size` field | |

| Option | Description | Selected |
|--------|-------------|----------|
| Heading + 3 cards + See all | Link to /projects | ✓ |
| Lead card + 2 smaller | Hierarchy | |
| 3 cards, no See all | Nav only | |

| Option | Description | Selected |
|--------|-------------|----------|
| Pins to Home | Featured first, then latest | ✓ |
| Visual emphasis only | Home strictly by date | |

**Notes:** The user approved recording this as [AMENDS HOME-06].

---

## Follow-ups (explore more)

| Option | Description | Selected |
|--------|-------------|----------|
| Publish with fallbacks + warn | Shows immediately, checklist printed | ✓ |
| Hidden until curated | Excluded until overrides exist | |
| Sync fails | Blocks refresh | |

| Option | Description | Selected |
|--------|-------------|----------|
| Add "Projects" to header nav | Projects · Contact | ✓ |
| Only via Home "See all" | Minimal header | |

| Option | Description | Selected |
|--------|-------------|----------|
| Covers only now | Module images in Phase 4 | ✓ |
| Everything now | ~150 images in git | |

**Notes:** Recorded as [AMENDS DATA-02 timing]. The full project JSON is still stored now.

---

## Claude's Discretion

- Snapshot/overrides file layout, loader shape, and adapter structure
- Failure-detection heuristics and the atomic snapshot swap
- Image storage path and optimization timing
- Whether to add sanitize-html now or in Phase 4
- Exact masonry rhythm and visuals (taste skill + UI-SPEC)

## Deferred Ideas

- Module images and detail content (Phase 4)
- Filters/search are N/A at 7 projects; revisit when the count reaches 8 or more
- Tool display-name normalization (Phase 4)
- Per-project masonry `size` override (not chosen)
