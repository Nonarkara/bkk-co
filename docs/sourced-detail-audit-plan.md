# Sourced-detail audit plan – 5 coffee districts

Owner laws: MSH → glance path → kinetic grids; GSH no invented heights/pins; STYLE.md building-place colors.

Current baseline from `public/data/street-world.json`:
* Areas: ari, samyan, charoenkrung, thonglo, ramkhamhaeng
* Buildings total 9,465
  * with explicit heightM: 215
  * render3D true: 212
* Per area
  * ari: 1,792 footprints, with height 2 / render3D 2
  * samyan: 2,649 footprints, with height 176 / render3D 174
  * charoenkrung: 3,035 footprints, with height 31 / render3D 30
  * thonglo: 1,839 footprints, with height 6 / render3D 6
  * ramkhamhaeng: 150 footprints, with height 0 / render3D 0

## Goals
Increase sourced visual density without inventing geometry.
* Keep unknown buildings flat.
* Add explicit heights only with cited source, tier, age.
* Add verified catalogue pins for restaurants/places with source qualification.

## Steps

1. Height source audit
   * Export buildingIDs per area with missing heightM.
   * Query OSM for `building:height` / `height` tags on those OSM way IDs. Record source URL, OSM version, fetch date.
   * Check data.go.th CKAN for building height datasets covering Bangkok districts. Record dataset ID, field mapping, license.
   * For any candidate height, create a record with {source, tier, age, osmid, heightM, minHeightM}. Tier: sourced → official, sourced → OSM explicit, unverified. Age: days since source update.
   * Do not create synthetic heights. If no source, leave flat.

2. Catalogue coverage audit
   * For each area, count catalogue places by kind: cafe, coworking, library, restaurant.
   * Identify placeIDs inside area footprint vs outside.
   * Flag places with missing phone/address, missing source photo consent, missing WorkAtmosphere evidence.
   * Prioritize gaps with high foot traffic streets from street-world streetIDs.

3. Street ribbon detail
   * Verify streetIDs map to OSM ways with sourceID. Ensure nodeIDs are intact for branching.
   * No invented connectivity. Record any street gaps that are OSM missing.

4. Artistic density without hallucination
   * Improve manga line-and-tone shaders: increase edge contrast, refine halftone dot size for 3D volumes, keep palette-volume-neutral dot tone.
   * Neighborhood atmosphere grounds stay at 16 % opacity, 800 m story circles only.
   * Add “Good for work” filter wiring to place sheets, and shareable URL for work-atmosphere panel already in `public/work-atmosphere.js`.

5. Ship criteria
   * MSH audit PASS at 390/1024/1440.
   * Byte verification against live origin.
   * Every displayed number carries {source, tier, age}. Fallbacks are visibly labeled.
   * No file collapse >30%, no deletion of live map/canvas/atlas/lenses/routes/notebooks.

## Deliverables
* `docs/release-2026-11-09/height-audit.json` per area with explicit heights added.
* `docs/release-2026-11-09/place-coverage.json` per area.
* Updated `public/data/street-world.json` with new explicit heights only.
* Capture coding session and update STYLE.md/context.md with audit results.

Next action: run OSM height query for samyan and charoenkrung as pilot, then review.
