---
updated: 2026-11-03
drafted_by: codex/gpt-6
reviewed: false
---

# Independent journey review

Verdict: PASS in reviewed scope. Auditor `/root/audit`, separate from the builder. Preview: `http://localhost:43827`.

## Findings closed before release

1. P1: The original visitor conversion treated the actual1–3score scale as0–2. In particular, laptop1 (“No”) became positive working permission. The corrected model makes1negative,2–3positive, mixed intermediate averages unknown, and rejects out-of-range values. Independently reran `node test/journeys.mjs`:14data/model cases pass, including negative-vote eligibility falsifiers and conserved catalogue hashes.
2. P2: Escape in the origin picker originally bubbled into the global sheet closer. Independent retest now dismisses both input-origin and keyboard-focused-hit dropdowns while keeping the finder open.
3. Verification gap: body30px initially left journey text fixed at14px, so the old enlargement fixture did not test this interface. The corrected relative type now computes30px on the journey sheet. At390px there is no horizontal overflow, and the first directions control remains reachable by scrolling. See `review-enlarged-390.png`.

## Actual journeys

Chrome sessions at390×844,1024×900 and1440×900 exercised Drive + park, By BTS / rail and2hours nearby. No JavaScript errors or horizontal overflow occurred. At390px, the first driving directions ended at699px; rail/nearby directions ended at716px, within the844px screen. The column composition keeps task, facility evidence and directions together beside/below the map; it introduces no decorative hero or blank utility band.

- Driver: real mapped Rolling Barber Club origin `(13.7665947,100.6190286)` led to VichSpace. The Google URL retained that exact origin and destination `(13.75239,100.63924)`, with `travelmode=driving`. Distance is labelled straight-line; the action explicitly delegates traffic checking to Google.
- Rail: selected BTS Siam retained its source point. The first result TK Park exposed transit directions plus a separate walking leg from Siam. Walk and short-ride thresholds remain distinct; no walking-time, fare or motorcycle-availability promise is added.
- Nearby: Siam source coordinates `(13.7456236,100.5342199)` remained the exact Google walking origin. GPS denial preserved five results and the explicit Map centre fallback. Requests run only after pressing the location control.

Parking tests reject private/customer/unknown adjacency as a positive fact. A separately mapped explicitly accessible nearby car park remains qualified as nearby, not on-site. Wi-Fi/outlet unknowns remain check-first and are excluded by known-only; Reading does not imply equipment. Hours/visitor admission qualifications remain visible.

## Failure and asynchronous checks

- Held journey geography response, opened the notebook, then released the response: the notebook remained visible.
- Held a GPS callback, changed the task, then delivered the old location: the stale callback did not change the origin.
- Returned503for journey geography: the finder showed a bounded failure and Retry. Restoring the source and pressing Retry produced five results with a visible directions action.
- Keyboard ArrowDown reached actual origin buttons; Escape returned cleanly without losing the finder.
- Follow-up notebook race: held `Passport.all()`, observed the immediate notebook loading state, opened WorkFinder, then released the old notebook promise. The generation guard preserved the newer finder rather than replacing it with stale visits.
- Private-station closure: actual source Chitlada has `access=no` and is ineligible. Both all-rail and mixed drive-origin searches returned no Chitlada candidate in independent Chrome checks; the nearest-station/GPS pool uses the same eligibility helper. Rebuilt joins and the15-case model suite pass.
- Rail-origin closure: after retaining a barber as the previous drive origin and opening rail mode, the primary Google transit URL contained no hidden barber origin. Maps chooses the start unless rail GPS is explicitly requested; the station-to-venue link still uses the selected station's real coordinates.

Source spot-checks: [VichSpace's operator page](https://vichspace.co/) supports free second-floor working space, Wi-Fi, outlets, building parking and07:00–20:00hours. [TK Park's operator notice](https://mytk.tkpark.or.th/News/NewsInformation?id=355) supports visitor-pass admission, visitor Wi-Fi and Tuesday–Sunday10:00–20:00hours. This is not exhaustive independent verification of all11sources.

## Limits

No remaining confirmed blocker. Physical route/parking access, live traffic, current seat/outlet availability, GPS precision, exhaustive source accuracy and screen-reader behavior are unverified. Normal-size first-result visibility is established; enlarged text necessarily uses scrolling while retaining access. This review did not repeat cloud writes or the full atlas/notebook release suites.

## Final production geometry follow-up

The builder's first live phone capture exposed a result marker partly behind the location control. After fitting to measured control bounds, the independent auditor retested390px GPS-at-Siam: the TK Park marker's right edge is329px; controls begin334px. The required4px gap passes after camera movement stops. Venue-kind chips were also independently checked: Library off removes TK Park from strict BTS Laptop results, and Library on restores it; the card identifies Library explicitly. No new concern found.
