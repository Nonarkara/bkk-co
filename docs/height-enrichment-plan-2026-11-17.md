# Height Enrichment Plan – 2026-11-17

## Status
Overpass API returns HTTP 406 from this environment. Queries cannot run via Overpass.
Local source available: `/Users/nonarkara/Projects/bangkok-ioc/source-cache/thailand-261024.osm.pbf` can be used offline to extract `building:height` / `height` tags.

## Current policy
- Unknown buildings stay flat.
- Extrusion only for explicit `heightM` tag.
- Collision grid for all footprints per GSH.
- Coverage indicator published: `N / total mapped heights`.

## Existing artefacts
- `scripts/build-street-areas.py` chooses 12 neighbourhoods: 5 authored anchors + 7 density-chosen districts.
- Per-area geometry files under `public/data/street-world/`.
- Height audit files: `docs/msh-audit/2026-11-17/`.
- Plan and bboxes exist for 12 neighbourhoods; Overpass query templates ready.

## Next steps
1. Extract heights offline from local PBF using `osmium` / `pyosmium` for the 12 neighbourhood bboxes.
2. Validate tag presence against OSM source dates; never invent.
2. Validate tag presence against OSM source dates; never invent.
3. Update per-area geometry files only with explicit heights.
4. Re-run `node scripts/audit-msh.mjs` and visual proof at 390/1024/1440.
5. Update manifest and byte-verify.

## Notes
- No invented depth/pins/heights.
- Street preview is reference geometry, not verified pedestrian route or entrance.
- Keep catalogue hashes signed; curated visit evidence never written back.
