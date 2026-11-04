---
updated: 2026-11-04
drafted_by: codex/gpt-6
reviewed: false
---
# Data and visual contracts

The original cleaned 57,379-place catalogue, all 86 aliases and branch labels remain intact. Work SHA256: 8c72533b96de56992097fc08f9b6cee288a63cff982eb4964ca8d97be1141716. Food SHA256: 8c7cc19345b6568c0a116ff3ac91872d5e769485138267aa5fbaa20cc409c4f6.

Street data is baked from the pinned Geofabrik Thailand OSM 2026-10-24 snapshot (ODbL); MD5 215e1ff30fe4d4adef2db3d664dab9da, snapshot 2026-10-24T20:20:51Z. Ari, Samyan, Charoen Krung, Thong Lo and Ramkhamhaeng/meet’s space have 800m source patches: 9,465 actual footprints, 215 explicit heights and 212 rendered volumes after parent/duplicate suppression. Unknown heights remain flat; Ramkhamhaeng has zero known heights. 3,195 original-way-node runs and 3,808 shared-node junctions are tested against raw source geometry. Nearby café associations within 40m are proximity, never entrance claims. Street access tags filter the graph but do not prove current walkability. JSON is 6,916,993 bytes (960,048 gzip), SHA256 605c9ea75be913565074ec318a139ca97c518b3942c31ac05ab8648d88cdb604.

The owner’s [Rokehan reference](https://tools.oyasumi-gamedev.com/rokehan/) informed line/tone and neighbourhood exploration. No code or assets copied; no reuse licence found. Its inferred heights are not imported. [OpenMapTiles building SQL](https://github.com/openmaptiles/openmaptiles/blob/master/layers/building/building.sql) synthesizes render_height using levels and a fallback; that field is deliberately not used as factual height. Current MapLibre renders source geometry on the existing canvas. A flat-ground oblique sketch is not a surveyed eye-level street view. The invalid unreferenced original style WIP is archived as plub-manga-original.json rather than silently enabled or discarded.

PR7 media is an attributed sidecar of 157 entries/361 video references: 33 catalogue associations, 20 with video. Name/branch identity remains explicitly unverified; 124 candidates are not fabricated into map pins. No external thumbnail/player request before explicit user choice. PR8 Einstein hat geometry retains Craig Kaplan’s BSD-3 notice. It displays actual catalogue café counts, not popularity, activity or quality. Original heatmap and symbols are preserved. Ranking/index values are now labelled as index values rather than implied star ratings.
