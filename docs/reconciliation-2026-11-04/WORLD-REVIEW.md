---
updated: 2026-11-04
drafted_by: codex/gpt-6
reviewed: false
---
# Independent integrated review

Auditor: `/root/world_audit_nov4`, separate from builders. Local URL `http://localhost:43827`. Final local review status **PASS** after independent browser retesting and visual inspection. Production deployment still requires the parent release verification.

## Confirmed preservation and boundaries

The one MapLibre canvas remains. Existing place symbols/lenses and aliases remain present. Native height layer filters `render3D=true` and reads the separately baked explicit metre height, not tile `render_height`; unknown heights stay flat. Ramkhamhaeng has 0 documented heights and 0 rendered volumes in actual browser source. Data contract tests retain original catalogue hashes and exact source node topology. Direct source-height tags remain reference data, not a claim of a physical survey or current operation.

Global `/Users/nonarkara/.codex/AGENTS.md` and project `AGENTS.md` persist MSH, glance/grid rules, source-truth and motion/lifecycle review requirements. Current quiet 32px chip register, handwriting and Wada choices remain protected.

PR7 media adaptation keeps name-search/branch uncertainty adjacent to titles; no automatic thumbnail/player contact, explicit Load YouTube player action and attributed title/channel/date. PR8 remains an optional catalogue-density lens, not live popularity. Its new point-count/pan/zoom and keyboard/tap branch-list tests are present. Original catalogue cleanup/aliases have not been reverted.

## Initial findings

1. **Low view loses the purpose.** On default Samyan street, source look-ahead clamps to the nearby end. Native camera returned zoom 22 / pitch 49; actual phone image is mostly a blank magnified road with no café pins and Show matches. Keep a bounded overview/low oblique composition where useful source pins/buildings remain visible rather than claiming eye height. Evidence independent-world-low-390.png.
2. **Enlarged phone action falls out of the panel.** At 30px body text, phone panel max 44dvh ends 828px but first nearby Directions lands 893–935px; controls and junction details consume the viewport before the actual cafe/action. Regroup secondary area/street controls or give the primary cafe/action priority; density cannot come from clipping or smaller body text. Evidence independent-world-large-390.png.
3. **Escape does not dismiss.** The active sketch is not #sheet, so existing global Escape leaves it active. Add scoped Escape exit on panel/canvas, preserving normal sheet behavior.
4. **Responsive camera padding stays stale.** Resize 390→1024 retains 379.8px bottom padding instead of desktop 35px. Recompute/pause on actual map/panel geometry changes; never resume autoplay on resize.
5. **Branch labels missing in new nearby rows.** `window.branchOf` is not the current label helper. Use the current catalogue's actual label contract so repeated chains are distinguishable.
6. **Zero-height area should state its visual mode immediately.** Ramkhamhaeng appropriately renders flat; surface this near the primary status rather than leaving the reason only in the source disclosure.

## Actual first pass measurements

Normal 14px body: panel 358.375px at all 3 widths; phone first 20m action ends634.625px and first Directions 747px. Desktop Directions 799px. No page/sheet bleed, zero pageerrors/consoleerrors. Exit restores maxZoom 19 / maxPitch 60 and hides sketch height layer while retaining place-icons. Actual overview/low/Ram/30pxcaptures at390/1024/1440 and raw measurements: independent-world.json.

Lifecycle tests PASS: explicit Play starts on a suitable source run; pointer input pauses it; hidden-page event pauses and does not resume; reduced-motion disables Play and camera snaps; a held world-data response cannot replace a newer Notebook. Source fixtures and outputs: independent-world-edges.mjs/json.

## Final recheck

All six initial findings are fixed and independently retested. No production write or synthetic recommendation occurred. Physical Android/iPhone hardware, assistive-device user study, actual pedestrian access and live venue conditions are outside this browser review.

### Recheck before rail steering

The requested interaction repairs pass: Escape exits, resize resets desktop padding to 35px, Play now continues on a suitable source run and pauses on manual/hidden/reduced-motion/task changes. The initial ResizeObserver implementation briefly interrupted the camera; builder fixed idempotent/deferred reflow, and the actual 3-width camera now reaches 17.3 / 55. Low perspective is 18.6 / 72 with 7/32/74 rendered pins. Enlarged 30px phone first café Directions now ends 634.53px inside the panel ending 828px. Aliased private history independently passes with two notes under old+survivor IDs: one canonical place, two visits, latest 5 stars, ThongLo stamp, original retired ID still stored, zero API writes/errors.

**Intermediate low-view visual issue (subsequently fixed):** reading the actual phone screenshot, the default Samyan low camera is behind/inside a known building volume; most of the map is a flat grey face and pins are pushed under upper chrome. A nonzero rendered-pin count did not prove a usable view. Keep real building geometry; use a clear-view camera/start direction or an explicit usable-overview fallback when blocked. `independent-world-final-low-390.png` is the conviction image. The final default reverses onto the longer source run, giving a clear view of real streets and cafe symbols. Parent also added a source-volume obstruction fallback, without altering heights. Final 390/1024/1440 screenshots replace the intermediate captures above.


### Final frozen-source evidence

- World: `independent-world-final.mjs/json` and normal/low/Ram/enlarged screenshots at 390/1024/1440. One canvas, no bleed or browser errors. Overview completes at zoom 17.3 / pitch 55. Low view 18.6 / 72 shows actual cafe symbols away from chrome (2 / 49 / 38 rendered features respectively; screenshots, rather than this count alone, determine visual clearance). First Directions ends at 630.63px on phone, inside the panel ending 828px. At 30px body text it ends at 634.53px. Ramkhamhaeng correctly has zero explicit heights and zero rendered volumes, stated immediately. Exit restores maximum zoom 19 / pitch 60 and the normal map.
- Motion: `independent-world-edges-final.json` passes Play, manual-input pause, hidden-page pause without automatic resume, reduced-motion, desktop padding 35px after resize, Escape, and cancellation of a held world response after Notebook supersedes it. One concurrent browser attempt hit a 30-second navigation timeout; the sequential repeat passes. This is recorded as a runner attempt, not erased or counted as an application regression.
- Obstruction falsifier: `independent-world-obstruction.mjs/json/png` recreates the original blocked direction at the exact source point. The real projected-building guard switches to zoom 16.8 / pitch 40, states the reason beside the controls, and retains all 174 explicit-height volumes. The resulting screenshot has useful streets and cafe symbols; geometry is not shrunk to evade the camera problem.
- Task boundaries: `independent-world-suspend.mjs/json` verifies old flags/mood clear on entry; opening Notebook hides height rendering and restores normal camera limits. Explicit resume restores the exact source street, distance and direction. Focusing nearby Directions pauses Play, preventing continuous list replacement while inspecting it.
- Rail: `independent-rail.mjs`, `independent-rail-before.json`, `independent-rail-after.json` and screenshots compare the actual public baseline with local final. Tools before the first result fall from 195px to 83px on phone, and 213.80px to 81px on desktop. All widths pass the content-specific 96px budget. The first native place button opens the exact record by keyboard; every native sort option updates state; active filter indication and all three work-finder journeys remain reachable. Enlarged 30px text retains the first useful result without horizontal bleed. Default Explore/Filters remain collapsed, preserving all options on demand.
- Falsifier: reopening the former always-expanded tool groups costs 415.39px on phone, correctly failing the same 96px budget (`independent-rail-falsifier-390.png`). The gate detects the original mechanism rather than merely a nearby overflow condition.
- Notebook history: `independent-alias-notebook.json` proves canonical aggregation and stamp while preserving stored snapshots. PR7/8 actual interaction proof is in `independent-prs.json`.

No production writes or fabricated recommendations were used. Public live release bytes, physical phone hardware, screen-reader user testing, actual access/entrances, live traffic and current venue operation remain outside this local clearance.
