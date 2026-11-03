---
updated: 2026-11-03
drafted_by: codex/gpt-6
reviewed: false
---
# Journey validation

Independent PASS: REVIEW.md. Grid: column. Map is entry; task/evidence/directions sit on its edge. No licensed break, decorative hero, new colour or boxed logo. Existing map/atlas/notebook/source discovery/branding remain.

Passed:
- `node test/journeys.mjs`:15 model/data cases, original catalogue hashes/IDs,20,720 joins, explicit facility source tiers,1–3visitor score scale, no-laptop/no-WiFi/no-outlet exclusions, unknown vs false, no power inference from venue kind/solar/EV charging, parking access restrictions and alternatives, actual VichSpace drive case, BTS vs MRT/selected station, restricted Chitlada refusal, two-hour hours sampling/endpoints/pass access, river guard, exact Google coordinate handoffs.
- `node test/journeys-browser.mjs`: real Chrome390/1024/1440/360, three journeys, mapped barber selection→VichSpace, strict facilities, BTS walk/short ride, explicit GPS at original Siam station point (test fixture), Reading without equipment filters, place/photo/back actions, first directions visible together with result, no page errors/bleed. Fixed Bangkok10am test time keeps the source-hour fixture repeatable. Actual computed finder text enlarges to30px; this is not a misleading body-only font fixture.
- `node test/journeys-edges.mjs`: denied GPS preserves results; stale GPS cannot override a newer task; unselected search text cannot become an origin; delayed Notebook read cannot replace a newer finder;503geography retry; held view module can load after finder and replay exact result markers. The latter also holds the all-sources-loaded predicate false to prove route-source initialization follows base-layer readiness rather than unrelated source idleness.
- Full notebook-browser suite:390/1024/1440/1280, private notes/photos, edit/export/sharing-preview boundary, cross-device restore and cloud timeout. Photo moderation/review restore/remove/deletion/rebackup and original finder/hop/mood flows pass. Artifacts are in notebook-regression/.
- Existing route-order regression passes at four widths, including semantic markers and deliberate original-occlusion falsifier. Pure atlas/catalogue/discovery/timezone/date and race/JPEG/FK/privacy tests pass. Worker dry-run passes. No backend schema or consent changes.
- Fresh notebook API suite:67/67 assertions. Two earlier attempts were interrupted by dev Worker restarts, not failing application assertions. The runner now snapshots public/src/db/config as well as using a fresh D1, preventing unrelated edits/asset watcher activity from interrupting stateful POSTs. The immutable-source rerun passed. It never retries a POST blindly or deletes another agent's state.

Findings fixed: visitor1=None/No was incorrectly interpreted using a zero-based scale; Escape in the origin picker closed the whole finder; finder text was initially fixed14px and ignored the enlargement fixture; restricted station metadata could influence public rail matches; rail mode inherited an invisible barber origin; delayed Notebook loads could replace navigation. Each has source or executable evidence in the review/test files.

Scanner: scanner.txt verdict REVIEW, no SLOP. Its cream/terracotta P1 is archived plub.js vector art, not a visible asset. Heavy PNGs are repository audit proof outside public/, not shipped webpage payload. The existing passive privacy/status sentences describe intended states; retained. New finder source has no additional scanner finding.

Limits: source station points are not entrances, distances not routes, access tags not available parking spaces. Rail/motorcycle directions are provider checks, not promised services. PLUB does not measure live traffic. Operator/editorial claims are dated; admission and working equipment must be checked at the branch. Physical-device and screen-reader behavior are unverified. Independent browser review and emulated narrow/enlarged screens are not claimed as hardware tests.

Final live-visual repair: fit padding now reserves the measured right-side control bounds and origin-label space. The four-width browser gate projects actual result coordinates with marker radius and4pxclearance. Its local390px falsifier reinstates the old35/55padding and confirms the same collision rule rejects it, then restores the fixed fit. `marker-control-before-390.png` preserves the original live collision. Final public captures below this directory are regenerated after the repair.
