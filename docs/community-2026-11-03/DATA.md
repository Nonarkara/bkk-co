# Reviewed place recovery and café features · 3 November 2026

## Why Meet's space Cafe was missing

The café was already in the pinned Overture Maps Places release `2026-10-21.0` under original UUID `825832f9-4e7f-441a-af0e-eb4b86f65e6d`. Its category was `restaurant`, taxonomy `halal_restaurant`, confidence `0.7754961848258972`. PLUB's restaurant ingestion floor is 0.8, so the record was discarded. It was not a map rendering omission or a missing source location.

The owner's visit, the café name, the operator's [founder post](https://www.lemon8-app.com/@meets.space.cafe/7524259820657000977?region=th) dated 7 July 2025, and the [SME Marketing Center Ramkhamhaeng café list](https://www.smemarketingcenter.com/blog/9132/10-%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B8%B2%E0%B9%80%E0%B8%9F%E0%B9%88-%E0%B8%99%E0%B8%B1%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B4%E0%B8%A5%E0%B8%A2%E0%B9%88%E0%B8%B2%E0%B8%99%E0%B8%A3%E0%B8%B2%E0%B8%A1%E0%B8%84%E0%B8%B3%E0%B9%81%E0%B8%AB%E0%B8%87-%E0%B8%9B%E0%B8%B5-2026), updated 18 August 2026, support reviewing this one record as a café. The latter independently matches the exact phone `097-2234003` and Ramkhamhaeng locality. No global confidence threshold changes. The record clears the existing café floor of 0.6.

`data/reviewed-inclusions.json` records the decision. `python3 scripts/include-reviewed-place.py` reads the original source record and appends only this café as `o825832f94e7f`. Its original POINT is longitude `100.61656422`, latitude `13.7699849`; catalogue precision remains five decimals, as for every original row. Coordinates come from Overture geometry, never Google's link, a geocoder, an address centroid or the editorial source.

Original source attribution: Meta record `590291710833227`, updated 12 October 2026, CDLA-Permissive-2.0. The original `websites[0]` was a long Google search tracking URL; it is omitted entirely and does not count as a venue website. The source's Facebook URL and phone remain. The discarded website is not converted into an official site or a data source.

No Wi-Fi, power, opening hours, venue parking, visitor stars or work permission is asserted. The owner confirmed a visit, not these facilities. The external list's hours were deliberately not imported: a generic editorial list is insufficient to resolve working-hour conflicts. The UI's existing unknown state governs.

## Conservation and reproducibility

The script verifies the original OSM MD5 and Overture SHA-256 against the pinned contract. It reconstructs raw input copies using the existing `load_osm`, `load_additions`, `load_overture` and `merge` functions. `score_places` computes genuine comparative metrics for the new record only; every old published metric/index remains unchanged. The new café's `559400` / index65 is a computed catalogue index, never a visitor rating or popularity endorsement.

The script requires all 20,720 original work rows to match their original compact JSON hash before appending. The entire food file must retain its original hash. It can run again without another row or count increment. A source or old-row change fails clearly instead of merging silently. Apply it after the frozen base catalogue/atlas/journey builds; this bounded exception does not rewrite those builders' original source contracts.

| File / cohort | Before | After | Conservation |
|---|---:|---:|---|
| Catalogue total | 57,538 | 57,539 | All original row arrays identical |
| Work rows | 20,720 | 20,721 | New row appended |
| Cafés | 20,235 | 20,236 | One reviewed category |
| Restaurants | 36,818 | 36,818 | Entire file unchanged |
| Co-working / libraries | 57 / 428 | 57 / 428 | Unchanged |
| Atlas joins | 57,538 | 57,539 | All old joins identical |
| Journey joins | 20,720 | 20,721 | All old joins identical |

New work SHA-256: `0bb9a767b51606ee5a785bf441daefe387ea50b377ff847dcd747e18296ebc30` (1,789,855 bytes).

Food SHA-256 remains `df43c22e5ea54a151e25c7abdda8bc6ae876114df5a5da9755625749428df29a` (3,779,251 bytes).

The new atlas and journey joins use the same unsimplified original OSM geometry and UTM47N distance pipeline as the existing builders. District coverage is `r2939956`; nearest eligible mapped park is `w564451236`, 341m straight-line. Nearest eligible station node is `n10867419329`, 1,171m; nearest BTS node `n5391626092`, 6,524m. No OSM parking geometry lies within150m. These are mapped source-point/polygon distances, not entrance, road, accessible route, facility or parking-availability promises.

District counts and atlas/journey source fingerprints update for the additional point. All three geography builders now derive expected counts from the current manifest, and all three were rerun against57,539rows. The street publication's308original features remain identical: the extra café is not within40mof any published street segment. Its current manifest fingerprints/counts therefore update after an actual recomputation, not by relabelling an old cohort.

## Two more branch-verified features

The evidence builder now publishes27café identities, adding two records without changing either original pin:

- **Mother Roaster · Talat Noi**, `n8017968685`: the [Tourism Authority of Thailand Japan feature](https://www.thailandtravel.or.jp/mother-roaster/) matches1172TalatNoi, exact phone061-216-2277, and its social identity. It does not refer to the PratuPhi, SongWat or Sutthisan branches. Publication date is not shown and stays null. This adds institutional coverage only; being upstairs in a building is insufficient evidence for an architecture/adaptive-reuse tag.
- **Hong Sieng Kong · Talat Noi**, `n9329112618`: [BK Magazine's9June2021feature](https://www.bkmagazine.com/restaurant/hong-sieng-kong/) matches name, locality, Soi2 and exact phone095-998-9895. It explicitly describes a family renovation of six older buildings into the riverside café, supporting adaptive reuse/architecture. No shophouse tag, age survey, Wi-Fi, parking or hours claim is inferred. The catalogue's source address remains intact; BK's brief address is not used to move the pin.

Coverage counts are distinct sourced pages, never a popularity leaderboard. Sources retain their actual dates and attribution. No images, ratings or review prose were copied. The current `patina.asvin` pin was deliberately excluded from old TalatNoi Patina coverage: the old TimeOut venue is marked closed and the contemporary pin is a different location. Rejection is recorded in `data/atlas-evidence.json`.

## Source archive

Public page responses are archived outside Git in `../source-cache/community-2026-11-03/`, keyed by the first12characters of the URL SHA-256, alongside URL/status/checkdate/content hashes. This includes the first-party operator post, both feature sources and the SME identity list. Robots responses were retained for review. No authenticated requests, block bypass or Google/Wongnai scraping occurred. Source pages may change; the check date is not a new publication date or a guarantee that a venue is operating today.

## Executed checks

- The reviewed inclusion ran twice without duplicate rows/count increments.
- `build-atlas.py`, `build-journey-geo.py`, and `build-cafe-streets.py` completed against the updated manifest.
- Every original catalogue/atlas/journey row compared equal by source ID against commit21d6eab. All308original published street features remained completely identical.
- A fresh temporary project copied the source scripts/curation inputs, symlinked only the pinned raw source cache, and ran the complete `build-places.py` pipeline including enrichment and reviewed inclusion. Its work/food byte counts and SHA-256 values matched the final runtime files exactly. The temporary project was removed afterward.
- `node scripts/build-atlas-evidence.mjs` validated/published27records with12sources.
- `data-validation.json` records conservation, final file hashes and source response receipts.
