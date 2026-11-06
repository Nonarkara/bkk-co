# Release · 6 November 2026

**Commit:** 8fa6fc3 · **Worker version:** 3d4a4df1-f694-49f7-b0e7-432b9b6eaceb
**Origin:** https://co.nonarkara.org · **Observed:** 2026-11-06

## What shipped

**MSH became a measurement, not an assertion.** `scripts/audit-msh.mjs` measures the shipped
interface at 390 / 1024 / 1440 and reports the five things the law asks for: chrome cost, task
visibility, geometry failures (void, inflated box, orphan column, horizontal bleed, map
obstruction), hierarchy, and preservation of the real journeys. `--planted` injects a known
defect and fails when the gate does not catch it. Both run as CI jobs.

**A live defect, found by the instrument on first contact with the public site.** Chrome
natively clears a search field on Escape; that fires `input`, which re-opened the results panel
over the filter chips. Escape did not dismiss the results and the Food chip could not be
clicked at all. `public/app.js` now prevents the native clear and dismisses the panel while
keeping the query.

**`public/styles/plub-street.json` removed.** The manga lens replaced it, nothing referenced
it, and it was still being shipped.

**Law recorded:** AGENTS.md names the instrument and the byte-verification; STYLE.md registers
the manga lens as a chosen register (a lens, not a second map; never a declared height);
context.md records the fix and the local-DB seeding step.

## Measurements — the live origin

| Viewport | Chrome | Map share | Void | Hierarchy | Verdict |
|---|---|---|---|---|---|
| 390 × 844 | 49 px (6%) | 89% | 0.17% | 15.39× | PASS |
| 1024 × 900 | 49 px (5%) | 65% | 2.8% | 2.05× | PASS |
| 1440 × 900 | 49 px (5%) | 75% | 3.7% | 3.33× | PASS |

Journeys, read-only, zero API writes: search 9 hits · filter chip works · café hop plans 5
stops · shared hop feed loads · manga lens installs, replaces the basemap and hands it back ·
notebook opens.

Before the fix the same run against the live origin reported four failures, including
"the search results panel covers the filter chips" and "a filter chip changes nothing".

## Gate proof

`node scripts/audit-msh.mjs --planted` against the live origin: 4 failures reported — the
instrument caught a 430 px panel covering 48–57% of the map at every width, and the hierarchy
break it caused at 1024 px. The gate can fail.

## Bytes

`node scripts/verify-live-bytes.mjs https://co.nonarkara.org docs/continuation-2026-11-05/live-bytes.json`
→ **228 / 228 matched, 0 mismatched, 0 missing, 0 orphans still served.** The count fell from
229 because `styles/plub-street.json` is gone from both the repo and the edge. The old domain
still redirects: `bkkco.nonarkara.org` → 301 → `co.nonarkara.org`.

## Not verified

- Enlarged text at 200% and keyboard-only traversal of the new surfaces were not measured by
  this instrument; the street-world browser test covers enlarged text for the sketch only.
- The instrument measures the current interface, not the hop publishing flow with a signed-in
  account; it checks the feed, not a write.
