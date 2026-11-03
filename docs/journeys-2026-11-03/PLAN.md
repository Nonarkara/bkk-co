---
updated: 2026-11-03
drafted_by: codex/gpt-6
reviewed: false
---
# Three work-spot journeys

Reader/task: a driver leaving a Ramkhamhaeng barber; a visitor travelling by BTS; a person with two free hours near Siam Square. The unfinished online journey becomes the Online work type (Wi-Fi), alongside Laptop (Wi-Fi/outlets) and Reading (neither assumed necessary).

Grid: column; no licensed break. The map is the entry and intentional open space. The task chooser/results/directions occupy its edge; no decorative hero. Attention: task → facility evidence/result → directions. Heading24/body14 provides a real scale step. Pansy actions, amber only for existing coworking data; white/neutral ground, no new decorative accents/shadows/radii. Keyboard follows DOM order. Existing dense32px controls with4px gaps remain; isolated primary/location actions44px.

Preserve: the interactive atlas/lenses, all57,538 source IDs/coordinates/flags/scores, all neighbourhoods/routes, source discovery, notebook/auth/privacy, intact Nong Plub/Sao Chingcha identity. No file shrinks30%; no deleted earned feature. User's explicit freedom to research/build/ship authorizes the scoped implementation; no further preference decision blocks it.

New files: journey-model.js (pure facility/eligibility/ranking/directions contract), journeys.js/CSS (task instrument), deterministic OSM journey builder+geo/joins, branch evidence builder/data, journey tests and this evidence directory. Targeted edits: index script/style hooks, atlas dock primary work action, app sheet-class reset/early directions/evidence, views openNow handoff retaining basic implementation, CI+README/context.

Drive+park: select a real starting place/barber, GPS or explicitly labelled map centre; find short-distance work spots. Wi-Fi/power depend on task. Parking is explicit venue evidence or a separately tagged accessible nearby car park; private/customer/unknown adjacency does not become venue parking. Google driving URLs carry exact selected origin/destination. Traffic is checked in the provider's driving route, never guessed from straight-line distance or street class.

By rail: named original station nodes with exact tags/route associations; explicit BTS by default, any rail optional. Walk-proximity≤800m or short-ride proximity≤2.5km, straight-line station distance, not entrance/walking time. Station and venue legs have explicit Google Maps links; no motorcycle availability/fare claim.

Two hours: GPS only after a click, immediate map-centre fallback, search local OSM barbers/stations/catalogue points without an external geocoder. Check known hours throughout the next120min (Bangkok timezone); unknown hours stay visible as check-first. Work types control needs. Results expose missing facts, conditions/pass costs and operator/source links. Evidence is not inferred from place kind or independence.

Research/prior art: EVIDENCE.md records source/archive contracts and reusable OSM/opening_hours methods. Google Maps URL docs support encoded coordinate origins/destinations and travel modes. Public Nominatim is deliberately not used: offline source origins meet the task without query sharing, API rate limits or a new dependency. No Wongnai/Google scraping; source portal links remain.

Verification: pure model/data tests with false-proxy/unknown/power/hour/routing falsifiers; actual three journeys at390/1024/1440 and narrow phones; first result/directions together; keyboard, long Thai, enlarged text, denied GPS, source failures, stale asynchronous responses. Different auditor reviews screenshots/MSH/glance/flow. Existing atlas/route/notebook tests and isolated67-assertionAPI suite, syntax/build/CI, merge, deploy, full live-byte proof and read-only live journeys. Physical route/parking availability and live traffic are not certified by PLUB.

Execution follow-ups: the existing stateful API runner required an immutable code/assets snapshot to avoid development restarts mid-POST; it is included in this scope. The notebook preservation run exposed a delayed read/navigation race, fixed with immediate loading feedback and the shared sheet generation. The late-view replay gate uses initialized base pins instead of unrelated source loading state. These are targeted preservation fixes, not backend/schema changes.
