---
updated: 2026-11-03
drafted_by: codex/gpt-6
reviewed: false
---
# A readable café atlas

Task: understand Bangkok’s café landscape, choose a real district or nearby independent café, and open its notebook record. The phone screenshot exposes index-based culling: zoom<13 hides index<92; zoom13–15 hides index<70. Count clusters must represent all active catalogue points instead.

Preserve all57,538IDs/coordinates/source/rankings, existing routes/labels, neighbourhood stories, map-first screen area and notebook privacy. No fabricated stars, popularity, hidden quality, street connectivity, architecture or shophouse identities. No inferred venue pins.

Implementation:
- Cluster the active GeoJSON source, with count conservation, expandable clusters and co-located-place lists. Distinct café/desk/book/food artwork replaces black-dot identity. Dashed café outlines mean low source footprint, personal4–5/5stars only mean actual local visits, and a separate featured symbol means verified publication evidence.
- One compact on-map Explore/key control, not another header band. Lenses: hotspots (catalogue density), less documented, independent, mapped parks, verified discussion evidence, design/shophouses, café streets and three-stop coffee triangles. Real district polygons and per-district café lists/counts.
- Couple pinned OSM boundaries/park geometries/streets with original points using metric joins; preserve source/asof/licence/CRS. Nearby café links/triangles are labelled straight-line suggestions, not walking streets/routes. Named café streets use real OSM lines and proximity counts.
- Verify a small branch-specific publication/discussion/architecture subset. No source-free brand matching; generic mentions stay unassigned. Real independent shop shout-outs link to their own records and visits/photos.
- Tests for count conservation, low-index presence, joins, lenses, correct icons and actual point clicks. City/close map screenshots at390/1024/1440/1280 plus phone-height constraints; adversarial review, existing route/notebook regression, build/CI, merge/deploy/live bytes and browser proof.

Scope is authorized by owner’s map-improvement request. Source methodology and limits remain visible in map key and place facts. Ratings and recognition are never derived from the Great Good Place index.
