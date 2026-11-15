# PLUB · Placemaking Laboratory Urban Bureau

Where to work in Bangkok, on one map: **[co.nonarkara.org](https://co.nonarkara.org)**

**CL;UB** — Cannabis Laboratory Urban Bureau — is the same codebase in a second
mode at **[club.nonarkara.org](https://club.nonarkara.org)**, mapping licensed
dispensaries and clinics in Bangkok from open data only. Its places live in
`public/data/places-cannabis.json`, apart from the signed catalogue below, and
carry no working or rating claims.

57,379 cafés, co-working spaces, libraries and restaurants from OpenStreetMap and Overture Maps, with separately labelled open-data indices and visitor work ratings.
Neighbourhood stories and catalogue counts, Nong Plub as guide, and private notebooks for visits and photos on your device or synced with your notebook key.
Visitors rate Wi-Fi, outlets, quiet and laptop-friendliness. Places nobody has rated show as not rated.

Places © OpenStreetMap contributors (ODbL) · © Overture Maps Foundation (CDLA-Permissive-2.0).
See `context.md` for sources, rebuild and deploy.

Notebook API checks can be rerun safely with `node scripts/test-notebook-isolated.mjs`: each run owns a fresh local D1 and leaves shared state untouched.

Café contact enrichment uses a pinned CC0 AllThePlaces snapshot. Run `python3 scripts/enrich-places.py` after the base catalogue; the main builder does this automatically. It fills missing addresses/phones only, with source IDs and dates, and never adds or moves pins. See [the data contract](docs/audit-2026-11-03/DATA.md).

Explore **50 + 50 cafés** from the guide or search: publisher/institution entries and a separately labelled public-discussion cohort. All sources and dates are linked; these lists do not invent a Bangkok-wide rank or pin. Rebuild with `python3 scripts/build-discovery.py`. Regenerate all brand icons/previews with `node scripts/build-brand-assets.mjs` against the local Worker.

Explore the coffee city from **Explore map**: counted clusters include every matching record, with café/desk/book/food symbols, your own 4–5/5 visit stars, and dated publication badges. Views cover catalogue density, independent signals, less documented cafés, park proximity, sourced design/shophouses, sampled public discussion, mapped café streets and straight-line coffee triangles. Real district boundaries carry rotating independent spotlights. These are documented signals, not invented popularity or walking routes.

Atlas rebuild: `python3 scripts/build-atlas.py`, `python3 scripts/build-cafe-streets.py`, then `node scripts/build-atlas-evidence.mjs`. The geographic builders require the pinned OSM PBF and Python dependencies documented in [the data contract](docs/atlas-2026-11-03/DATA.md). `node test/atlas.mjs` checks immutable catalogue hashes, geography references, evidence and triangle/marker honesty. Browser checks: `node test/atlas-browser.mjs` and `node test/atlas-edges.mjs` against the local Worker on 43827.

**Find a work spot** follows three trips: drive and park after an errand, work near BTS/rail, or spend two hours nearby. Choose Laptop (Wi-Fi/outlets), Online (Wi-Fi), or Reading. Select a mapped barber/station/place or press your location; directions preserve that chosen starting point. Rail offers station walking proximity or a short ride. Unknown equipment stays check-first; admission, pass costs, source dates and parking access are disclosed. Traffic is checked in the external driving route.

Rebuild journey geography with `python3 scripts/build-journey-geo.py` and branch facts with `node scripts/build-journey-evidence.mjs`. Source contracts: [geography](docs/journeys-2026-11-03/GEO.md), [facility evidence](docs/journeys-2026-11-03/EVIDENCE.md). Pure tests: `node test/journeys.mjs`; local browser flows: `node test/journeys-browser.mjs` and `node test/journeys-edges.mjs` on43827. These additions preserve original catalogue bytes and notebook ownership/privacy.

## Reviewed places and community paths · 3 November 2026
Search accepts apostrophe/accent variants, word order and the name in a full Google Maps place link without fetching Google. Featured places opens verified publisher branches directly; the two50entry research lists remain separate. Place actions expose notes/photos, a private-first recommendation composer, precise directions and share/manual-copy recovery. Publishing and photo inclusion remain explicit.

Meet's space Cafe is an exact-source reviewed category correction, not a guessed pin. `scripts/include-reviewed-place.py` preserves every original row; the base builder invokes its catalogue-only step and geography builders use current manifest counts. Provenance and reproducibility: [DATA.md](docs/community-2026-11-03/DATA.md). `node test/place-tools.mjs` checks the entire original work-file reconstruction hash. Run `node scripts/test-browser-isolated.mjs test/notebook-browser.mjs test/community-browser.mjs` for fresh local DB plus immutable runtime inputs; active development cannot restart that Worker during a POST. Review/geometry/release records: [verification](docs/community-2026-11-03/VALIDATION.md), [independent review](docs/community-2026-11-03/REVIEW.md).

## Compact discovery and street sketches · 4 November 2026
The map is the first view. Open List for nearby places, Find a work spot for the three trips, or disclose Explore/Filters for secondary choices. Counts refer to the map area; index values are not star ratings. Default list tools take83px on phone and81px on desktop.

Choose Street sketch from search, Explore or a place. Twelve areas cover Ari, Samyan, Charoen Krung, Thong Lo, meet’s space/Ramkhamhaeng, Pathum Wan, Phra Nakhon, Samphanthawong, Chatuchak, Dindaeng, Bangkapi and Prawet. Steps follow original OSM nodes and shared junctions. Only explicitly tagged building heights become volumes; unknown heights remain flat. This is an oblique sketch, not a surveyed street view or current pedestrian-access promise. Playback pauses on manual input, task change, hidden page, reduced motion and exit.

Rebuild: `python3 scripts/build-street-world.py` (pinned PBF, shapely/pyproj); tests: `node test/street-world.mjs`, `node test/street-model.mjs`, `node test/map-motion.mjs`, `python3 test/street-world-source.py`. Browser checks on43827: `node test/street-browser.mjs`, `node docs/reconciliation-2026-11-04/independent-rail.mjs` (96px budget plus original-defect falsifier), `node test/reconciled-prs-browser.mjs`. Release contracts, independent review and proof: [Nov4 evidence](docs/reconciliation-2026-11-04/VALIDATION.md).

The integrated media sidecar requires explicit external-player choice and marks name/branch uncertainty. Optional Hotspot tiles count actual café records and rebuild on pan/zoom; the original density heatmap remains. Old IDs continue to resolve to cleaned records, including device notebook stamps and visit history.

## Shared café-hop notes · 5 November 2026
Open Café hop → Shared hop notes to read recent experiences or publish an ordered set of actual stops. A cloud notebook key is required to publish. You explicitly choose stops and optional photos; private visits and dates are never attached. Reordering a preview updates the straight-line map links, which do not establish a walking route. Notes → Cloud notebook → My shared hop notes manages public/hidden logs. Cloud export includes their full photos and your reports; owner moderation reviews both recommendations and hop notes. Up to100 hop notes per account.

The manga toggle now settles within240ms and stops its drawing transition on manual input, task change, reduced motion or a hidden page. Failed drawing loads leave the ordinary map available with a working retry. Tests: `node test/manga-motion.mjs` (CI), `node test/manga-browser.mjs` (local43828), `node test/hop-logs.mjs`, `node test/hop-browser.mjs` (fresh immutable Worker/D1). Evidence: [agent continuation](docs/continuation-2026-11-05/RECONCILIATION.md).

## Palette manga buildings · 7 November 2026
Manga is the primary map, starting close in Charoen Krung/Talat Noi. The corner map toggle opens the secondary precision basemap; both use identical coordinates and GPS. Footprint fills use Palette320: coral cafés, pale yellow co-work, green libraries, blue food. Mixed categories stripe; unmatched buildings stay neutral. Colors follow selected kinds/filters and strict contained place pins, not inferred whole-building use. Key explains the matching and palette. Street sketch follows the current close area and retains source heights/lanes.

Tests: `node test/footprint-model.mjs`, `node test/footprint-palette.mjs`, `node test/footprint-browser.mjs` (read-only local43827 or PLUB_URL). CI runs component/runtime guards and measured/planted MSH. Provenance, independent actual pixels and limitations: [Palette validation](docs/palette-buildings-2026-11-07/VALIDATION.md).

## Neighborhood Palette, references and needs

The manga map retains exact matched building colors across zoom and adds five explicitly authored neighborhood mood grounds. In List → Find a work spot → Your place preferences, save equipment/space choices on this device; a place also offers Find places for my needs. Dated evidence separates documented facts from unknowns; visitor Fast is not measured Mbps.

Guide → Real neighborhood photos opens120credited source photographs, labeled as neighborhood references rather than venue images. Neighborhood sheets offer source-lane strolls; unknown building heights stay flat and source lines do not establish entrances/walkability. Final source, tests, live deployment and limits: [7November release](docs/stroll-2026-11-07/SHIP.md).
