#!/usr/bin/env python3
"""Write the street-world index from the per-area files.

The geometry of each neighbourhood lives in public/data/street-world/<id>.json, so a reader
only pays for the area they walk. This script rebuilds the index — the area list and the
manifest — from those files, without re-extracting anything from OpenStreetMap.

Usage: python3 scripts/write-street-world-index.py
"""
import collections, hashlib, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data'
AREAS = DATA / 'street-world'
RADIUS_M = 800


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
    manifest.update({
        'version': 2, 'built': '2026-11-07',
        'split': 'One file per area under data/street-world/. The index carries the area list and this manifest only.',
        'areas': len(index_areas), 'buildingCount': len(buildings),
        'explicitHeightCount': known, 'unknownHeightCount': len(buildings) - known,
        'renderedHeightCount': rendered, 'streetCount': len(streets), 'junctionCount': len(junctions),
        'catalogueSHA256': hashlib.sha256((DATA / 'places-work.json').read_bytes()).hexdigest(),
    })
    payload = {'manifest': manifest, 'areas': index_areas}
    raw = (json.dumps(payload, indent=2) + '\n').encode()
    (DATA / 'street-world.json').write_bytes(raw)
    print(json.dumps({'areas': len(index_areas), 'bytes': len(raw),
                      'buildings': len(buildings), 'explicitHeight': known, 'renderedHeight': rendered,
                      'streets': len(streets), 'junctions': len(junctions)}))


if __name__ == '__main__':
    main()
