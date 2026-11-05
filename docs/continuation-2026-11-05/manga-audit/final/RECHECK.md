# Independent final recheck — 5 November 2026

No confirmed findings remain within the tested conditions. This auditor made no runtime edits, performed no production writes, and did not overwrite historical evidence. Write flows used independently created local databases and immutable copies of runtime inputs.

## Manga fixes

`manga-browser-regression.mjs` and `regression-results.json` confirm:

- Residential tone reaches its designed opacity of 0.14 after a normal toggle.
- All 12 interruption combinations (on/off × pointer, wheel, key, visibility, reduced motion, task change) settle with no later paint writes and zero-duration opacity transitions. Hidden-page coverage uses explicit controlled event injection, not OS background timing.
- A failed style fetch prevents the street sketch opening. The visible Retry action recovers, exit re-enables the control, the unavailable title clears, and keyboard Space toggles the lens.
- Reloading a snapshot of the current style preserves basemap and application layer visibility after switching the lens off.

The parent adopted the reusable browser regression and a CI VM gate. Three actual viewports, 390×844, 1024×900 and 1440×900, plus 30px body text have no document or street-panel horizontal bleed. Normal map shares remain 89.3%, 64.8% and 75%; the lens control is 44×44px. Existing enlarged header search clipping is outside this change.

Source checks pass again: five areas, 9,465 footprints, 215 explicit heights, 212 rendered volumes, 3,195 source node-runs, 3,808 shared junctions, and equality against the pinned raw source. Unknown heights remain flat.

## Shared-hop functionality

`hop-final.mjs` / `hop-final/` pass the three viewports and enlarged text in a fresh local database: account/key gate, selected stop order and exclusion, no visit date, unchecked photos excluded from upload, checked valid photos uploaded, account-change rejection, cancellation preventing a stale PUT, loading/empty/error recovery, and owner management. An earlier copied test used an invalid one-pixel PNG; the corrected browser-generated photo fixture passes. That timeout was a fixture defect.

`hop-management.mjs` / `hop-management/results.json` independently seed an owned hidden hop with a photo, a recommendation with a photo, and a report on another author's hop through authenticated localhost APIs. The actual UI cloud-export download contains the hidden hop and photo, post and photo, a reports array, and nonempty hop reports. The owner's management view shows the hidden note. The actual moderator queue restores and then removes both a recommendation and a hop; local public feeds are checked after each operation. No page errors occurred.

`feed-account-independent.mjs` / `.json` use actual catalogue IDs with a read-only feed fixture. The optional account request remains unresolved while the feed renders within five seconds. A stop action selects the correct catalogue record and exposes its Directions link.

## Final spatial and route closure

The compact rows retain native ordered-list numbering, wrap long Thai names and keep reorder controls beside their labels. The five-stop list measures 190px on phone and 197.19px on desktop. Publish ends at 790.41px on phone and 649.53px on desktop. The phone panel shrinks upward from its bottom anchor, returning space to the map. No horizontal overflow occurs at normal or 30px text.

The review discovered two further defects: opening shared notes cleared the planner's map points, and the shared-hop CSS class leaked into later tasks. Both are now closed by `route-final-line.mjs` and `route-final-line/results.json`:

- The planner's five actual stop IDs, coordinates and original line survive the feed and composer.
- Shared notes preserve the earned dashed straight line. The line joins the actual selected coordinates, and visible copy directs readers to place directions for walking paths.
- Reordering and unchecking produce the exact four selected IDs, with numbers 1–4, unchanged source coordinates and one LineString whose coordinates exactly match the selected order.
- Cancel restores the five planned stops. Close and a normal new task clear the points. A new task removes the shared-hop CSS class.

Stable-map screenshots in `route-final-line/selected-{390,1024,1440}.png` and the enlarged equivalents show the numbered selection over the actual map. White route numerals have 10.364:1 contrast on the ink fill, versus the original 1.576:1. Earlier captures with zero route points remain historical failure evidence and are superseded by these assertions.

`git diff --check` passes. This review does not claim coverage of every browser, accessibility or network state.
