# Offline atlas data · 3 November 2026

Build: `python3 scripts/build-atlas.py` (osmium, Shapely 2+, pyproj). No requests at runtime. This script reads the existing catalogue and writes only the two additive atlas files. Source extracts are cached in `../source-cache/atlas-215e1ff3-*`, outside Git. Delete those cache files when testing extraction itself; the source MD5 is checked even on cached builds.

Source: [Geofabrik Thailand snapshot](https://download.geofabrik.de/asia/thailand-261024.osm.pbf), OpenStreetMap as of **2026-10-24T20:20:51Z**, MD5 `215e1ff30fe4d4adef2db3d664dab9da`. [© OpenStreetMap contributors, ODbL-1.0](https://www.openstreetmap.org/copyright). Each geographic feature retains its OSM `r`/`w`/`n` source ID. The manifest records licence, source, date, bounds, CRS, catalogue hashes and computation semantics. These are community-mapped administrative boundaries, not a legal boundary survey.

## Payload and semantics

- `atlas-geo.json`: manifest, `districts` and `parks` GeoJSON FeatureCollections. All **50 Bangkok level-6 districts** and **28 surrounding level-6 districts** intersecting catalogue bounds are included, with full district polygons. English/Thai source names, province ISO3166-2 code, Bangkok boolean, full area and catalogue-intersection area accompany each district. `code` is explicitly an **OSM relation ID**, not an invented official district code; official numeric district codes were unavailable in this extract.
- `atlas-places.json`: `cols = [placeID,districtID,parkID,parkDistanceM]`; one row for each of the **57,538** existing IDs. A sparse `attributes` object contains exact venue OSM tag evidence. This preserves the catalogue's names, coordinates, flags, metrics and ranks byte for byte.
- District membership uses original polygons and the catalogue's stored point, including boundary points; shared-border ties would use lowest lexical OSM ID. Display simplification never controls membership. Province membership uses greatest polygon-overlap area. Outward districts keep their own province names and codes rather than being called Bangkok.
- **832** polygon features tagged `leisure=park` or `nature_reserve` are included in a 0.03-degree padded extraction. Private/no/customer-only access is excluded; **unknown access remains unknown**. Parks can be unnamed: do not invent proper names. Gardens, point-only parks, woods, waterways and private greenery are not included. Polygon presence is neither entrance evidence nor proof of public access.
- Park distance is shortest straight-line distance to original polygon geometry in **EPSG:32647 (UTM 47N)**; zero inside the mapped polygon. Only distances **≤2,000m** are published; both park fields are null beyond that threshold. The extraction padding exceeds this search distance along both axes. The metric is not a walking route, an entrance distance, safety, shade or a nature-quality assessment. It does not reuse the catalogue's car-parking metric.
- Display GeoJSON is **EPSG:4326**, longitude/latitude rounded to five decimals after topology-preserving simplification (district30m, park12m). Small display-edge differences are expected. Full geometry controls all analysis.
- District counts are observations in this catalogue. `independentCafes` uses the existing chain flag, never a new independent/quality judgement. `catalogueAreaKm2` exists for any density calculation; using full surrounding district area would bias comparisons because the catalogue is bbox-limited. These are mapped venue counts, not footfall, sales or district popularity.

## Evidence and gaps

**40,576** places fall in Bangkok districts; **16,961** in precisely named surrounding districts. One existing source point remains unassigned: `o044b3fe045e3`, รักทะเลซีฟู้ด, **13.49347,100.40687**. Its point falls outside the selected district polygons near the coastal edge. It is retained with null district; no nearest-district guess is made. There were zero shared-border ties.

**51,483** places have a mapped park polygon within2km. **149** distances round to0m (this includes very small positive distances; use source geometry for exact containment). Null means no qualifying polygon within2km in this snapshot, not proof there is no green space.

Only **43** exact retained venue features have the requested explicit tags: all are `building=retail`, including **18** cafés. There are **zero** exact retained-venue `building=terrace`, `shop_house`/`shophouse`, `heritage`, or architecture tags. Retail does not establish shophouse architecture. The builder makes no shophouse inference from café independence, district, address, nearby buildings or neighborhood history. Untagged architecture is unknown, not absent. Any editorial shophouse/architecture shoutout requires separately sourced, branch-specific evidence.

The existing discovery collection is separate editorial/public-discussion evidence. This atlas does not resolve those name candidates to venue branches and adds no guessed pins.

## Verification

The builder asserts the original57,538 unique IDs and both original catalogue SHA256 hashes, district count50, valid/nonempty output geometries, row-count conservation, synchronized null proximity fields, original park interior distance0, and district boundary coverage. A long-rectangle fixture verifies an edge point is10m from the park while510m from its centroid; a polygon-hole fixture verifies hole points are outside the park. These guard the centroid-distance and hole-containment failure modes.

Catalogue hashes: work `67fe00fb832aeb49663083b10acc21350c5f93278402c090a530e39554f71395`; food `df43c22e5ea54a151e25c7abdda8bc6ae876114df5a5da9755625749428df29a`.

Approximate payload sizes: geography509KB (497KiB); per-place joins2.61MB uncompressed. Geography is bounded and under500KiB; transmitting explicit IDs for57,538 joins necessarily makes that separate file larger. Serve with HTTP compression. This task does not change the original catalogue or add runtime source calls.

## Café streets · bounded real street geometry

`python3 scripts/build-cafe-streets.py` writes `public/data/atlas-streets.json`, an additive GeoJSON FeatureCollection. Source, date, licence, MD5 and coordinate systems match the atlas above. It does not write any existing atlas or catalogue file.

The builder examines **48,198** named, eligible OSM highway ways intersecting the catalogue window plus0.0005-degree padding. **13,561** have at least one existing café point within **40m of their original LineString** in EPSG:32647. Explicit `access` or `foot` private/no/customers restrictions are excluded, as are motorways, trunks, proposed and construction roads. Eligible street/walkway classes and extraction rules live in the builder; unknown access is not permission.

To bound payload, it publishes the **top300 way segments by café count**, then independent café count, then lexical OSM way ID, plus the highest-ranked eligible segment covering each otherwise-unrepresented Bangkok district. This produces **308 segments**, **199,979bytes** uncompressed, including nearby cafés from **all50 Bangkok districts** and **2,871 distinct catalogue café IDs**. Coverage means the segment has café neighbours assigned to that district; it is not a new administrative classification of the entire road. The manifest states the positive-way population, published population, truncation and precise selection rule. This is a bounded sample, not every café street or an exhaustive city ranking.

Each feature carries `sourceID`, actual source names, `highway`, café `count`, existing-chain-flag `independentCount`, all matching `cafeIDs`, relevant café `districtIDs`, and source `access`/`foot` values or unknown. Geometry is the real OSM way, clipped to the padded catalogue window for display, simplified by at most **5m** before six-decimal coordinate rounding. It remains a LineString/MultiLineString; no street-centroid pin, café relocation, inferred connection, or manufactured geometry is introduced. Joins use the original, unsimplified source line, and the builder directly checks each matched café's distance is≤40m.

OSM ways are **segments**, and several may share a street name. Long segments naturally have more opportunity for nearby cafés; counts are not length-normalized. One café can be within40m of multiple segments, intersecting or parallel roads. **Do not sum segment counts as unique cafés**, or interpret proximity as an entrance/frontage connection, safe crossing, walkability, public access, an endorsement, or a pedestrian route. This layer contains no routable walking network. Existing café pin coordinates, names, flags and rankings remain unchanged; their hashes are checked again during the street build.
