# PL;UB and CL;UB next release scope

**25 November 2026 · Proposed for approval**

The release should help someone choose a place with enough evidence to leave the house, then save or share it without losing their place. The first three decisions are where to work for the next two hours, where to spend today, and which neighbourhood to try before choosing a base. CL;UB has a separate job: find a listing and understand how well it is documented.

## Verified baseline

- Pulled `main` at `0334f1e`. Hosted CI is green for that revision and the deployed runtime `14ad55a`. Both map homes and `/day` respond. An unknown path returns HTTP 404. Bangkok date stamps and the 404 census are already in main. [Latest hosted checks](https://github.com/Nonarkara/bkk-co/actions/runs/45582516617)
- On the live PL;UB site at 390×844, an injected first-request HTTP 503 for the Work catalogue left a shared venue unopened with no visible recovery. Opening the list revealed Retry. Activating it by keyboard fetched once more, opened the intended Bridge listing and focused its heading. The gap is discovering recovery at the place where the task failed.
- Raw shipped rows with recorded hours: PL;UB Work 579/20,640 (2.81%), Food 967/36,739 (2.63%), CL;UB 76/329 (23.10%). These are raw catalogue fields. They do not measure how many hours are current, parseable, or supplemented by separately stored venue evidence.
- The height audit counts 248 explicit heights across 20,650 footprints and 244 rendered volumes after parent outlines are suppressed. Five of twelve areas have zero explicit heights. Sam Yan has 176 and is the strongest candidate for a pedestrian-view pilot. [Shipped height coverage](../public/data/height-coverage.json)
- Prior live medians on the recorded throttled phone profile were 14.08 s to a useful PL;UB map and 7.07 s for CL;UB, with about 1.76 MB and 0.94 MB transferred respectively. Rebaseline before editing. [Measurement protocol](release-2026-11-25/ship-1795595215200-approved/README.md)

## 1. Make startup and recovery reliable on both maps

**Code** — `public/app.js`, relevant map and search CSS, `test/map-readiness.mjs`, `test/club-isolation.mjs` and browser coverage in `scripts/audit-msh.mjs`.

Give a failed shared place or active search one visible Retry in its own surface. Distinguish loading, unavailable, genuinely empty and unknown ID. A shared Food or aliased link needs the right loading path before it can be declared missing. Use one in-flight request per catalogue and retain the current user intent when replies arrive late. Keep the catalogue usable as a list when map tiles fail.

**Acceptance** — Force 503, malformed responses and a delayed basemap. Test Work, optional Food and CL;UB independently. One explicit retry restores the exact listing and predictable focus. A dismissed task stays dismissed, a newer query wins, and failed data never becomes “0 places.” Repeat with keyboard, touch emulation and enlarged text. A cold CL;UB load still requests zero PL;UB catalogue files.

## 2. Give the planner enough evidence for an actual decision

**Code and data** — `public/day.js`, `public/journeys.js`, `public/journey-model.js`, `public/work-atmosphere.js`, `scripts/build-journey-evidence.mjs`, the existing evidence files, and relevant journey and API tests.

Pilot three areas where the decisions differ. Screen up to 15 candidate venues per area and aim for three well-evidenced choices per scripted journey. Publish the actual coverage if the source pool falls short. Include independent cafés and documented shophouses when they meet the task. Rank by the user's needs and the recorded evidence. Place the reason, uncertainty and next action together on the first screen.

| User and starting point | Decision and acceptance |
|---|---|
| Thai-speaking driver after an errand in Ramkhamhaeng | Choose the actual barber or starting point. Compare work spots with evidence for parking access, laptop use and the intended visit time. Label on-site parking and nearby mapped parking distinctly. Directions carry the selected origin and destination. The external route supplies live traffic. |
| English-speaking visitor using BTS, with an Ari test case | Choose station, work type and last-mile preference. Distinguish plain reading from Wi-Fi and Wi-Fi plus power. Show admission or day-pass conditions and relevant dates. The station-point estimate is labelled straight line, including when the user chooses a short ride. |
| User with two hours in Siam Square or Sam Yan | Try location permission accepted, denied and timed out. A typed or map-picked starting point still works. Show places with recorded schedules covering the intended stay, with a separate check-first section for unknowns. Back restores the start and result. |
| Prospective resident comparing Ari and Sam Yan | Compare the number of evidenced work options, the time window and mapped rail proximity. Save a trial visit in each neighbourhood. Display the comparison boundary and avoid implying rental affordability, commuting time or suitability for a household. |

Keep Thai and English through planner → results → venue → directions/back, including café-hop links and errors. Preserve the existing structured claims and catalogue IDs. Each new fact carries branch identity, source link, evidence tier, date, and the applicable reuse terms. Use permitted operator facts, OpenStreetMap tags and dated visits. Keep publisher discovery links and leave ambiguous branches, conflicts and unsupported schedules visible as unknown or disputed. Evaluate the existing OSM parser against real Thai schedules before deciding whether to extend it; keep any large comparison parser off the critical path. [OSM opening hours](https://wiki.openstreetmap.org/wiki/Key:opening_hours) · [Reference parser](https://github.com/opening-hours/opening_hours.js)

## 3. Make saving and contributing worth repeating

**Code** — existing planner, preferences, passport, notebook, community and browser tests.

Preserve explicitly saved preferences on the next visit and reuse them in the finder. After a visit, let the user privately save the place and record one missing fact such as outlets, admission or noise. Offer the existing share and moderation flow as a separate choice. Use the existing stamps for private visits and keep virtual hunt progress distinct from physical visits.

**Acceptance** — A first-time user completes directions without an account. A returning user can recover a saved place and their preferences. Test private draft → preview → explicit publish, photo opt-in, moderation and notebook ownership on a fresh local D1 database. Public tests are read-only. Keep exact location and private notes outside public shares, and collect no new analytics for this release.

## 4. Make CL;UB listings easier to trust

**Code and data** — `public/app.js`, `scripts/build-cannabis.py`, the CL;UB manifest and existing catalogue/isolation tests.

Keep the Botanical Green map and dispensary-first controls. Make province or hotspot, listing type, source and date easy to find. Review a small Bangkok and regional sample for duplicates, stale hours and source coverage. Keep the Bangkok government register's corroboration dated and geographically bounded. A matched archived row supports a historical source claim. Current business hours and current authorization require their own evidence. [DTAM Bangkok dataset](https://data.go.th/dataset/dtam-serv-002)

**Acceptance** — Search the same Thai and English branch in a Bangkok case and a regional case. Distinguish what the listing says, what the pinned register corroborates, and what has not been verified. No ambiguous merge, inferred coordinate, cross-bureau catalogue request or category toolbar.

## 5. Prove the manga street experience in one neighbourhood

**Code and data** — `scripts/build-street-areas.py`, `scripts/measure-height-coverage.py`, `public/street-world-3d.js`, the Sam Yan asset, and street and motion tests.

Use Sam Yan for the first street-level entry, with a mapped starting lane and one reachable café stop. Refresh the pinned explicit-height audit across the twelve areas before considering expansion. Give areas with zero relief a clear footprint-view label. Keep the manga map primary, precision map available, and the source geometry intact. Unknown heights stay flat. Lane connectivity comes from mapped shared nodes. A sketch still cannot confirm public access, entrances or pedestrian safety. [Thailand OSM extracts](https://download.geofabrik.de/asia/thailand.html) · [OSM height tag](https://wiki.openstreetmap.org/wiki/Key:height)

**Acceptance** — On phone and desktop, enter Street, follow one mapped turn, select a café, then return to the original map position. Check visual depth, occlusion, touch drag and tool readability in the actual viewport. Reduced motion snaps, manual input and exit stop animation, and loss of WebGL exposes the usable 2D path. If Sam Yan cannot demonstrate an enjoyable and usable street-level walk, keep the feature scoped to preview and record the reason before expanding.

## Review and ship

1. Ship recovery first, then the three Bangkok pilot areas with private saving and the CL;UB source labels. Treat Sam Yan as a separate release decision. Keep nationwide PL;UB expansion, Google sign-in, broad scraping, and new palette tokens outside this scope.
2. Judge the map on a column grid. Map first, decision fact and action together on the edge, detail after. The resting maps retain at least 60% first-screen share under the existing audit. Measure first useful fact plus action, chrome, tap targets, wrapping and bleed at 390/1024/1440 and at 260 px with enlarged text. Preserve house type, wordmarks, the current Wada roles, Nong Plub, routes and earned content.
3. Re-run the same cold phone profile with five matched runs per host and a warm run. Record median and slowest time to an interactive map with real pins, usable named search and a populated place sheet, plus transfer bytes. Set a no-regression gate against the refreshed baseline after measuring variance. Aim for PL;UB's first useful map in 10 s or less on that profile without adding startup bytes to CL;UB. Load optional food, photos and street geometry on demand.
4. Run real-device walkthroughs on Android Chrome and iPhone Safari when hardware is available. Record location denial, touch targets and text sizing, Back from Directions and WebGL behavior. Track missing hardware as unverified. Have a separate reviewer exercise both languages and the fault cases with fixtures. The existing planted MSH gate and a regression test for the hidden Retry must both catch their original defects. Flag transport failures separately from layout failures.
5. Reconcile open work before edits. PR #26 changes CI scope and should be evaluated against the now-green hosted checks before any merge. Each release ships from a known commit after CI and browser review. Verify both origins byte for byte, run read-only live journeys, and record the rollback Worker.

Approval covers the sequence and pilot areas above. A data-sparse pilot publishes its real yield. Expansion depends on usable results and field evidence.
