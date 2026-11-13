#!/usr/bin/env python3
"""Write the street-world index from the per-area files.

The geometry of each neighbourhood lives in public/data/street-world/<id>.json, so a reader
only pays for the area they walk. This script rebuilds the index — the area list and the
manifest — from those files, without re-extracting anything from OpenStreetMap.

Usage: python3 scripts/write-street-world-index.py
"""
import collections, hashlib, json, pathlib

from pyproj import Transformer
from shapely.geometry import Point
from shapely.ops import transform

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data'
AREAS = DATA / 'street-world'
RADIUS_M = 800
DUMP = lambda d: json.dumps(d, ensure_ascii=False, separators=(',', ':'))
# The same projection and buffer the extractor uses, so the key computed here
# is byte-identical to the key scripts/build-street-world.py computes.
F = Transformer.from_crs(4326, 32647, always_xy=True).transform
B = Transformer.from_crs(32647, 4326, always_xy=True).transform


def cache_key(areas, osm_md5):
    """The extraction cache that produced this geometry.

    build-street-world.py names its cache by the area list and its bounds, so the
    name can be recomputed from the areas alone — no extraction needed. Carrying
    the key over from an older manifest (as this script used to do) let the index
    name a cache that no longer held this geometry.
    """
    pairs = []
    for a in areas:
        p = Point(*F(a['anchor']['x'], a['anchor']['y']))
        pairs.append((a['id'], list(transform(B, p.buffer(RADIUS_M + 100)).bounds)))
    key = hashlib.sha256(DUMP(pairs).encode()).hexdigest()[:10]
    return f'street-world-{osm_md5[:8]}-{key}'


def main():
    areas = json.loads((DATA / 'street-areas.json').read_text())['areas']
    old = json.loads((DATA / 'street-world.json').read_text())
    manifest = dict(old['manifest'])
    buildings, streets, junctions = {}, {}, {}
    index_areas = []
    for area in areas:
        path = AREAS / f"{area['id']}.json"
        if not path.exists():
            raise SystemExit(f'missing area file: {path.name}')
        file = json.loads(path.read_text())
        for feature in file['buildings']['features']:
            buildings[feature['id']] = feature
        for feature in file['streets']['features']:
            streets[feature['id']] = feature
        for node, junction in file['junctions'].items():
            junctions[node] = junction
        index_areas.append({
            'id': area['id'], 'name': area['name'], 'nameTh': area.get('nameTh') or '',
            'mood': area.get('mood') or '', 'basis': area.get('basis') or '',
            'district': area.get('district') or '', 'kind': area.get('kind') or '',
            'anchorName': area.get('anchorName') or '', 'cafesWithin800m': area.get('cafesWithin800m', 0),
            'mix': area.get('mix', {}),
            'anchor': area['anchor'], 'radiusM': area.get('radiusM', RADIUS_M),
            'heightVolumes': file['counts']['heightVolumes'],
        })
    known = sum(f['properties']['heightM'] is not None for f in buildings.values())
    rendered = sum(bool(f['properties']['render3D']) for f in buildings.values())
    # How much of the fabric could be drawn but is not: a floor count is not a height.
    levels_only = sum(1 for f in buildings.values()
                      if f['properties']['heightM'] is None
                      and (f['properties'].get('tags') or {}).get('building:levels'))
    recomputed = cache_key(areas, manifest.get('md5', ''))
    manifest.update({
        'version': 2, 'built': '2026-11-07',
        'split': 'One file per area under data/street-world/. The index carries the area list and this manifest only.',
        'areas': len(index_areas), 'buildingCount': len(buildings),
        'explicitHeightCount': known, 'unknownHeightCount': len(buildings) - known,
        'renderedHeightCount': rendered, 'streetCount': len(streets), 'junctionCount': len(junctions),
        'catalogueSHA256': hashlib.sha256((DATA / 'places-work.json').read_bytes()).hexdigest(),
        # The provenance key is recomputed from the area list, so it names the
        # extraction that holds this geometry rather than an older build's cache.
        'cacheKey': recomputed,
        'cacheKeyMeaning': 'Recomputed from the current area list and bounds; it names the OpenStreetMap extraction cache that holds this geometry.',
        'levelsOnlyCount': levels_only,
        'noHeightInfoCount': len(buildings) - known - levels_only,
        'heightCoverageMeaning': 'Footprints that record how many floors they have but no height in metres. A floor count is not a height, so these stay flat and are never converted.',
    })
    payload = {'manifest': manifest, 'areas': index_areas}
    raw = (json.dumps(payload, indent=2) + '\n').encode()
    (DATA / 'street-world.json').write_bytes(raw)
    print(json.dumps({'areas': len(index_areas), 'bytes': len(raw),
                      'buildings': len(buildings), 'explicitHeight': known, 'renderedHeight': rendered,
                      'streets': len(streets), 'junctions': len(junctions)}))


if __name__ == '__main__':
    main()
