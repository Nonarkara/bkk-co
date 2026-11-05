# Independent manga audit · 5 November 2026

Audited runtime initially at4d496db, diff6a0c741..4d496db. No runtime edits. Own static server43828, real headless Google Chrome via Playwright. Static server API404 expected; no API mutations. Skills: adversarial-review, browser-use. ReadAGENTS/context/CLAUDE/STYLE and durable MSH/glance/kinetic canon, get_context(project=bkk-co), Kit/README.

## Confirmed findings

1. **P2 · failure never recovers the control** — public/manga-lens.js installNow/ready/paint. Fulfill styles/plub-manga.json with503, load page, remove interception, await MangaLens.ready(). Returns true and installed=true while button.disabled remains true and title says unavailable. `failure` is never cleared after successful install. Repro `node /tmp/plub-manga-audit-nov5/recovery.mjs`; recovery.json.retry. Clear failure and repaint on successful installation; allow deliberate retry.
2. **P2 · street integration ignores failed lens prerequisite** — public/street-world.js load. With styles/plub-manga.json503, StreetWorld.open renders active3D street sketch on civic basemap, held=true/installed=false with disabled pressedtrue Manga button. Contract says sketch always line and tone. Repro probes.mjs; probes.json.failure; lens-fetch-failed-street.png. Treat false readiness as an error or provide explicit honest fallback and retry.
3. **P2 · wash fails manual/visibility/reduced-motion cancellation** — public/manga-lens.js apply and attach. Start toggle, dispatch canvas pointerdown, or emulate prefers-reduced-motion reduce mid-wash:16 later setPaintProperty writes still occur. Synthetic document.hidden=true + visibilitychange also leaves16 writes. Repro probes.mjs, probes.json.manual/reduceChange/hidden. Hidden test is controlled event injection; it is not OS background timing. Bind interruption events, clear queued work, settle once to final state with zero-duration transitions; don't start subsequent delayed groups. Task opening Street sketch calls hold(force) and can settle, but manual input does not.
4. **P2 · residential tone disappears only on ordinary toggle** — WASH lacks manga-town. apply sets every non-ground opacity0 then restores WASH ids only. After click and800ms town opacity0 vs style design.14; hold(true) restores.14. Repro probes.mjs; probes.json.omitted/forcedTown. Cover every style layer exactly once or restore ungrouped layers deterministically.
5. **P2 · route numbers are unreadable on source style colour change** — public/views.js59 text#20201d on circle#7d133a:1.576:1. openHop('samyan'), screenshot route-original.png; numbers are near-black on ink. Proposed white text yields10.364:1 and visibly readable route-white-text.png. This is a concrete before/after pixel falsifier for parent's proposedfix.

## Conditional recovery defect, no current UI entry identified

setStyle(map.getStyle(),{diff:false}) while active carries hidden basemap state into baseState; switching lensoff afterwards leaves basemap hidden. Existing manga ids skipped during install also don't populate targets, making townopacity1. recovery.mjs/recovery.json proves this API case; there is no identified product UI trigger yet. Reloading a pristine remote style is a separate case and was not claimed by this test.

## Spatial/interaction evidence

Screenshots at390×844,1024×900,1440×900: default, manga, street, enlarged body30px. Normal load map390×754(89.3% viewport),664×900(64.8%),1080×900(75%). Map remains visual entry, edge instruments use column grid, catalogue remains dominant ink over quiet source map. Lens44×44. No document or street-panel horizontal bleed at normal/enlarged text. Enlarged phone panel scrolls reading depth; primary place/directions/notes remain reachable. Existing enlarged header search text clips; this predates the delta and is not assigned to lens change. Space on focused Manga button toggles aria-pressed. Street holds button disabled/pressed correctly in normal availability. See results.json and actual PNGs. No 'all UI accessibility pass' claimed.

App layers retained during ordinary lens swap: catalogue pins, selected/place icons, neighbourhood rings/labels, atlas layers and route ids remain present and their visibility is not touched by the lens filter. Route actual screenshot retained the line and all5 numbered stops. No map, routes, notebook or source bytes removed by this audit.

## Source truth and checks

`node test/manga-lens.mjs`, `node test/street-world.mjs`, `python3 test/street-world-source.py` pass:5areas,9465footprints,215explicit heights,212rendered,3195source node-runs,3808shared junctions. Pinned raw equality covers footprint vertices, street refs, shared junctions and40m café association. Manga source styles introduce no own vector geometry, height or entrance claims. Unknown heights remain flat in street dataset. No source-truth regression confirmed.
