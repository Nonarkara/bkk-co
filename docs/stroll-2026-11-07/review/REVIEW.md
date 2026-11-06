---
updated: 2026-11-07
drafted_by: codex/gpt-6.1
reviewed: false
---

# Independent UI review

**Verdict: PASS for the reviewed preview scope. No remaining material finding.** Auditor: photograph-collection agent, independent of the frontend/world/preferences builders. Preview: http://localhost:43828. Audited actual Chrome pixels and interactions at390×844,1024×900 and1440×900, plus30px body text. This is preview verification; live deployment is not covered.

## Material finding fixed and independently retested

Fresh direct selection of actual catalogue venue `n735122008` before opening the finder throws `TypeError: Cannot read properties of undefined (reading 'n735122008')` in `journeys.js` `sourceFacts`, from `placePanel → renderSheet → select`. The cold context has `raw.evidence={}` without a `sources` registry; `context.raw.evidence.sources[id]` throws for its real mapped Wi-Fi source before lazy warmPlace can run. Reproduced390 and1440 against stable file hashes. The builder guarded the source-registry lookup and retained its existing OSM-ID link fallback. A fresh final pass at all three widths now opens this venue directly and shows “✓ Air conditioning · documented” without first opening the finder. Product-file hashes stayed stable through that pass. `cold-place-before.json` retains the original failure; `final.json` records the repair. A browser-only negative control reinstated the original unsafe expression while deliberately delaying evidence: it reproduced the exact failure. No source file was mutated by the control. Evidence: `negative-control.json`.

## Passed paths and geometry

- Real manga/map pixels loaded. On-load map share89.3% phone,64.8% tablet,75% desktop; compact chrome90px on phone. No horizontal document bleed. Map is the visual entry; edge instruments use the existing column arrangement, with first place fact and directions together.
- Source-lane forward button and W keyboard advanced exactly8m; mapped junction menu exposed source directions; chosen connected café stroll progressed0→8m and explicitly said the source line ended25m from the pin, entrance unverified. No claim of a verified walking entrance or route was introduced.
- Explicit playback stopped on map pointer input and task change and remained stopped after a wait. Reduced-motion disabled Play and stepped without continued camera animation. Escape exited. The genuine freeze/thaw experiment never produced document.hidden; it is not hidden-tab proof. A separately labelled visibility-event fault injection stopped playback. Native background-tab hiding remains unverified on this local Chrome automation surface.
- At30px, first fact+directions remained together. The1024 panel originally overflowed348→364px; after the builder's h2 repair a fresh screenshot and measurement show348/348px with document1024px. Phone enlarged movement controls continue through ordinary panel scrolling. No content was deleted to pass.
- Photo area filtering returned Ari's actual12/15 images; pagination produced15/15. Full-image modal retained title, creator, source, license, conversion notice and neighborhood-only wording; Escape restored the opener focus. Enlarged modal had no horizontal overflow. A503 response showed a useful error and retry; retry recovered. Delayed manifest response after switching to notebook did not overwrite the later task. Place photo captions said neighborhood reference, not the selected venue.
- Preferences start collapsed; change/save/reload/clear worked in each viewport, with explicit device-only feedback. Unknown Wi-Fi/outlets/AC remained '? unknown'; no atmosphere or speed was invented. Substantive preference-model tests passed storage denial/corruption, exact tag provenance, visitor Fast qualification, unknowns, ranking and safe rendering. The duplicate 'Current preferences' prefix was reported and repaired by the builder.
- Initial audit had zero page errors and zero API writes. Two external map-tile requests were cancelled with ERR_ABORTED during navigation, not missing/error map tiles. The later cold-place regression above was separately caught, repaired and retested; the original failure evidence remains preserved.

## Final negative and enlarged-state checks

At390/1024/1440, an unproven Cozy preference left five non-strict rows explicitly marked0/1 documented and1 unknown. Enabling known-only produced zero rows with a useful explanation and “Include check-first places”; missing evidence was not described as absence. At30px, preferences sheet scrollWidth equalled clientWidth390/359/359; street panel368/348/348; documents390/1024/1440. The duplicate summary prefix was absent. These final screenshots were actually viewed.

## Spatial qualification

When the stroll tool is explicitly opened, its panel leaves approximately49.5% exposed map on phone and50.8% at1024, compared with the passing on-load shares above. This is a disclosed, content-bearing task panel with facts/actions/movement, not initial chrome or an empty region. Screenshots preserve this cost rather than claiming the original on-load map-share figure for the opened tool state.

Evidence: `audit.json`, `edges.json`, `cold-place-before.json`, `final.json`, `negative-control.json`; base/world/stroll/gallery/photo/preferences screenshots and final fixed1024 enlarged capture. Audit scripts are retained alongside the evidence. No product files were edited by this auditor.
