---
updated: 2026-11-03
drafted_by: codex/gpt-6
reviewed: false
---

# Independent atlas review

Verdict: PASS in the reviewed scope. Auditor: `/root/audit`, separate from the builder. Preview: `http://localhost:43827`.

## Confirmed findings and closure

- Sparse verified lenses initially left the map empty when the user was elsewhere: three discussion matches existed, but there was no way to bring them into view. Retested from `[100.9,14.05]`, zoom17: Talked about and Design & shophouses now fit their actual matching coordinates and display markers. Offscreen-match navigation is also available.
- At30px body text, the fixed phone dock overlapped filter chips by26.5px. Retested at390px: chip bottom128.5px, dock top140.5px, a12px gap. The ResizeObserver repair closes the overlap.
- Featured publication markers initially depended on full geographic loading for their place-sheet evidence. On the independent browser run, a featured branch had an evidence disclosure before `Atlas.data` existed. The base-map provenance repair is present.

## Independent evidence

Real Chrome sessions at390×844,1024×900 and1440×900 exercised all nine non-default modes, the Explore menu and map key. Every mode's active GeoJSON count equalled `lastList.length`; no JavaScript errors or horizontal overflow occurred. Examples:20,235hotspot cafés;13,849independent-signal cafés;2,501less-documented;4,468near mapped parks;3discussion;5design;2,871street-proximity cafés. These are catalogue/evidence counts, not popularity ratings.

An actual co-location aggregate at `[100.494,13.7522]`, with requested zoom20 clamped by the map's maximum zoom19, opened eight matching records; choosing a row opened its exact catalogue ID. Bang Bon district selection showed140cafés and92with no chain signal; the sheet, map-source count and list all agreed at140.

Actual images inspected included phone base map, menu, parks, discussion, triangles, districts and key, plus desktop base map. The new semantic markers and count clusters reveal coverage that index thresholds previously hid. The compact dock does not add a header band. Triangle stops remain numbered; their explanatory copy distinguishes geometric suggestions from verified walking paths. Menu scrolling exposes additional choices rather than decorative voids.

`node test/atlas.mjs` independently passed:57,538catalogue records conserved;78OSM districts including50Bangkok districts;832parks;308sampled streets;25branch-evidence records. Source joins use original polygon membership/metric geometry, not district centroids. Park access and straight-line limitations are disclosed. Street coverage is explicitly sampled. Personal stars require actual local4–5/5visits, not index or publication rank.

Publication spot-checks used [Time Out's2025 article](https://www.timeout.com/bangkok/restaurants/bangkoks-best-new-cafes-of-2025) and [Roadbook's Bangkok guide](https://roadbook.com/bangkok/city-guide/best-coffee-shops-bangkok-thailand/); the displayed coverage dates and distinction between editorial coverage and ratings are consistent with those sources. This is a spot-check, not independent verification of every source assertion.

## Limits

No remaining confirmed blocker. This review does not establish physical-device/screen-reader behavior, exhaustive source accuracy, current venue operation, park entrances, walkability, or production deployment. The complete notebook and delayed-map regression suites remain the builder's separate evidence; this atlas review did not repeat cloud writes.
