---
updated: 2026-11-07
drafted_by: codex/gpt-6
reviewed: false
---
# Palette-filled manga buildings

Owner clarified actual small building footprints containing mapped places, not the interface chips. Manga is now the primary map; the precision basemap remains an explicit secondary switch. Trial area: Charoen Krung/Talat Noi at close neighbourhood scale, retaining real streets and the existing low-perspective street explorer.

Intent: distinguish matching mapped café/co-work/library/food records inside actual footprints, while keeping linework, screentone, labels and routes dominant. Column/modular edge instruments; map → places/actions → compact Key. No new hero chrome, guessed buildings, nearest-building snapping, invented building use, guessed heights or street connections.

Chord: Palette catalogue combination320 — Coral Red#f58e84(café), Sulpher Yellow#f5ecc2(co-work), Oil Green#819238(library), Light Glaucous Blue#a5c8d1(food). Warm coral/yellow against cool green/blue, bounded by white paper and dark ink. This is the catalogue's credited digital reconstruction, not exact historic print. UI retains combination273. Fill opacity and screentone soften the categorical fields; symbols/patterns remain available without hue. Mixed records use multi-color stripes; unknowns stay neutral.

Source rule: actual OpenMapTiles building feature IDs may merge2420 unrelated Polygon components. Split each geometry component and require strict point-in-polygon containment, respecting holes and excluding ambiguous boundaries. Never color the whole source ID. Overlay coordinates are copied from source polygons; categories describe contained matching pins, not every occupant or legal use. Model tests falsify source-ID bleed, holes, boundaries, mixed masks and nearest-guessing.

Implementation: viewport-limited source-geometry overlay; existing source-height street volumes can share colors only for their own contained records. Recompute after map/filter/source changes, preserve default/off/retry/lifecycle. Compact color key and explanation. Start close in actual dense Charoen Krung, deep links and GPS controls retained.

Proof: actual390/1024/1440 normal/enlarged screenshots, legend contrast + grayscale/color-vision views, original MSH measured and planted-defect gates, primary manga/secondary precision switch, map movement/filter refresh, source-geometry/pin association, mixed and unknown neutral, street low view/shared-node turns and source-height preservation. Separate auditor reviews actual pixels before shipping. Commit/push/merge/deploy, ordinary-URL asset + stale-file verification and live read-only flows finish the work.
