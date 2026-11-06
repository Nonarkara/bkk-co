# Footprint zoom regression · 7 November 2026

Grid remains the existing map-first column layout. This change adds no chrome or animation; the map remains the visual entry and the compact category key stays at its edge.

Original failure reproduced in the real browser: z17/16 359 colored components, z15 838, z14 955, z13 905, z12 **0**. At z12 the OpenMapTiles building source returns no geometry. Lower source zooms also merge or alter source geometry, so retaining whole feature IDs would color unrelated buildings.

`build-footprint-colors.py` reads the MD5-pinned Geofabrik 24 October 2026 Thailand extract (`215e1ff30fe4d4adef2db3d664dab9da`). `osmium tags-filter` retains `wr/building`, `osmium export` emits original Polygon rings, and Shapely2 strictly joins each individual component against the unchanged current catalogue points. No nearest join, buffered footprint, simplification, rounding, height inference or added connector. Boundary points and holes do not match. The source cache is outside the repository.

The build checked 1,758,809 components; invalid components skipped: 0. It retained 8,155 source components (8,154 distinct ring sets), strictly containing 15,788 of 57,379 catalogue points. The other 41,591 points remain unassigned. Largest retained bounding box is source `w26071844:0`: [100.7441003,13.6861749,100.7569344,13.6965064] (the source airport building). This is a footprint containment statement, never a whole-building use classification.

The page lazily requests one immutable same-origin source corpus: **3,117,946 bytes raw / 665,364 bytes gzip**. Enforced ceiling: 3.5MB raw / 750KB gzip. No new remote provider or API call. Full original coordinates are retained. Static city coverage permits fresh low-zoom loads and pans to areas never previously visited. GeoJSON tolerance is zero. Classification is cached by selected-place input and reused on pan/zoom/idle; source update and paint do not loop. Street-view geometry and explicit heights continue using their existing source; unknown heights remain flat.

At city scale actual small polygons become subpixel. They remain the original footprints; no enlarged fake building or density patch is drawn. Tile-only matches absent from this pinned source stay unassigned, rather than adopting a nearby building. The source retains the original source IDs in its metadata and both input catalogue SHA256 hashes in its manifest.

Verification: `node test/footprint-model.mjs`, `node test/footprint-palette.mjs`, `PLUB_URL=http://localhost:43828 node test/footprint-zoom.mjs`. The zoom test exercises real MapLibre at 390/1024/1440: z17/16/15/14/13/12/9, cold z12, unseen city pan, exact source rings and query-only negative control. Screenshots and measured results are in `zoom/`. `footprint-browser.mjs` also accepts pinned source polygons when checking component provenance. Its 390px run passed footprints, filters, key, camera and source-height checks, then stopped on its old `[data-street-step="20"]` locator after the parent changed street controls. That unrelated selector requires integration before the legacy full script can pass.

No commit, production write or deployment performed by this subtask. Parent independently reviews the finished map and integrates the release.

Source availability now appears live in Key: loading, available, or unavailable. A503/fetch failure keeps current loaded map polygons as fallback, discloses that city-scale colors may be absent and offers one explicit Retry action. Requests coalesce; idle never auto-retries. Unit tests cover failure/disclosure/manual recovery without changing geometry.
