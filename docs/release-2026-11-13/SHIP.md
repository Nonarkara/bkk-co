# PLUB — release 2026-11-13

The system that maps great good places in Bangkok, measured again before it went out.
Commit `9881179` · Worker `00b5af4c-8cce-4e06-9b05-15c8d2b13f57` · https://co.nonarkara.org

---

## 1. Height enrichment, answered by measurement

The standing question was whether the pinned OpenStreetMap snapshot still held
explicit building heights that the pipeline had not yet taken. Overpass is
unreachable from this machine (406 / 504 / no response), so the question was
answered against the pinned snapshot itself
(`source-cache/thailand-261024.osm.pbf`, md5 `215e1ff30fe4d4adef2db3d664dab9da`),
joined by OSM id — not by counting the two populations side by side and hoping
they matched.

**The answer: the snapshot is exhausted. There is nothing left to enrich.**

| Population | Footprints | Explicit height (metres) | Floors only | No height information |
|---|---|---|---|---|
| Extraction boxes (900 m) | 33,590 | 320 | 10,098 | 23,172 |
| Neighbourhoods (800 m, shipped) | 20,650 | 248 | 6,163 | 14,239 |

Every height-bearing building polygon in the twelve extraction boxes was traced:

- **320** carry an explicit height in metres;
- **248** of them fall inside a neighbourhood's 800 m radius — and all 248 are
  already drawn. **Zero were lost.**
- The remaining 72 sit outside the neighbourhood radius, which is the definition
  of the area, not a defect;
- **zero** were dropped for invalid geometry, zero for an unparseable value,
  zero for a conflicting pair of heights, zero for any unexplained reason;
- **zero** shipped heights are absent from the source.

A further **6,163** shipped buildings state how many floors they have. A floor
count is not a height, so PLUB does not convert it, and those footprints stay
flat. The flat outlines are the honest picture, not a missing download.

That measurement now ships as `public/data/height-coverage.json`, with its
source, its date, its method and its rule, and the research page reports it
from that file so the figures cannot drift from the measurement.

**What this means for the owner:** the 3D world's sparsity is a property of
OpenStreetMap in Bangkok, not a gap in PLUB. To draw more, the map itself has
to change — a newer snapshot, or a decision to accept a floor count as a height
(which this system refuses to take on its own).

## 2. A provenance record that named the wrong file

`public/data/street-world.json` carried a `cacheKey` pointing at a **five-area**
OpenStreetMap extraction cache, while its geometry had been built from the
**twelve-area** cache. The index writer inherited the key from the previous
manifest instead of computing it, so it went stale the moment the area list
changed — and the shipped manifest, which is the system's own statement of
where its geometry came from, was wrong.

The key is now recomputed from the area list and its bounds, exactly as the
extractor computes it (`scripts/write-street-world-index.py`), and the raw-source
test asserts that the named cache exists and holds all twelve neighbourhoods'
source files. It cannot drift again.

## 3. The strongest honesty check in the repository was dead

`test/street-world-source.py` compares the shipped geometry against the pinned
snapshot — every footprint, every street node run, every junction, every 40 m
café association. It had been orphaned by the 2026-11-07 per-area split, could
no longer run, and was not in CI because it needs the 329 MB local snapshot.

It runs again, across all twelve neighbourhoods, and it now also asserts that
the manifest agrees with what actually shipped.

```
Raw pinned-source equality: every footprint, street vertex/ref run, shared
junction and 40m cafe association pass; bad height/access inputs rejected;
manifest agrees with the shipped geometry.
```

## 4. The research page counted less than the place sheet

The research section counted documented working facts from map tags alone,
while the place sheet and the API read map tags, visitor ratings and named
on-site reports. Its headline therefore understated what is documented —
**589 → 591** places, **59 → 61** clearing the coverage floor (the live site,
with its own ratings, reads 590 and 60).

The page now uses the same rule set as the sheet and says so in the note. If
the visitor record is unreachable when the page renders, it says that too,
rather than quietly counting less.

## 5. The gate could not see the map's own overlays

The MSH instrument measured chrome as fixed and sticky bands and explicitly
skipped the map's control containers, so an overlay standing on the map was
invisible to it — including PLUB's own key bar and the atlas action row.

It now measures PLUB's own overlays, takes them off the map's share, and fails
when they grow. The real interface carries **0.5 % to 2.0 %** of the first
screen; a planted overlay standing on 46 % is caught.

```
 390px  chrome 53+0px (6%)  map 89% (net 87%, overlays 2.0%)  void 13715px  hierarchy 14.15x  PASS
1024px  chrome 53+0px (6%)  map 65% (net 64%, overlays 0.7%)  void 38400px  hierarchy 2.06x  PASS
1440px  chrome 53+0px (6%)  map 75% (net 75%, overlays 0.5%)  void 54000px  hierarchy 3.35x  PASS
Verdict: PASS
```

Planted defect: 10 failures reported; the gate caught it: true.

## 6. One command that proves the ship

`scripts/ship.mjs` reads its test list out of `.github/workflows/notebook.yml`,
so the local gate and CI cannot fall out of step — one list, two runners. It
runs every CI test in CI's order, the MSH gate, the planted gate (which must
fail), the raw-source equality check when the snapshot is on the machine, and
with `--deploy` it deploys, byte-verifies and exercises the live URL.

A step that cannot run is marked SKIP, never PASS.

## 7. Verification

| Check | Result |
|---|---|
| Every test in the CI workflow | pass (`node scripts/ship.mjs`) |
| MSH gate at 390 / 1024 / 1440 | PASS, with map overlays measured |
| MSH gate on a planted defect | fails — 10 failures, caught |
| Shipped geometry vs pinned OSM source | every footprint, node run, junction, café association equal |
| Deployed bytes vs repository | **403 matched · 0 mismatched · 0 missing · 0 orphans** at commit `464cef6` |
| Live surfaces | `/`, `/day`, `/day?lang=th`, `/research`, `/bridge-1958`, `/v1` all 200 |
| Security headers | CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy on every path |

## 8. What is still honestly unfinished

- **Heights.** The snapshot holds no more explicit heights for these areas. More
  volume means a newer snapshot or an accepted conversion — neither taken here.
- **The catalogue's own thinness.** Only 590 of 20,640 places carry any
  documented working fact and only 60 clear the coverage floor. This is the
  single most important thing left to fix, and it is fixed by people
  reporting, not by code.
- **Overpass remains unreachable from this machine**, so live enrichment runs
  are still not possible here; the pinned snapshot is the only source.
- **The verifier's findings** are in `docs/audit-2026-11-13/REVIEW.md`.
