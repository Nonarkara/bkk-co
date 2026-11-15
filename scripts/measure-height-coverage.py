#!/usr/bin/env python3
"""Measure how much of the city fabric carries a height, against the pinned snapshot.

The answer has to be measured, not asserted, and it has to be published with its
source and its date. This script joins the shipped street-world geometry to the
pinned OpenStreetMap extraction and writes public/data/height-coverage.json.

It reports two populations, because they are not the same thing:

  * the extraction boxes — the source geometry the pipeline read (900 m around
    each anchor), which includes buildings outside the neighbourhood itself;
  * the neighbourhoods — the 800 m radius actually shipped, where footprints
    are drawn and heights are extruded.

Nothing is converted. A floor count stays a floor count: it is reported as
knowable-but-not-a-height, and never turned into metres.

Usage: python3 scripts/measure-height-coverage.py
"""
import collections, datetime, hashlib, json, os, pathlib
from shapely.geometry import Point, shape
from shapely.ops import transform
from pyproj import Transformer

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data'
CACHE_ROOT = pathlib.Path(os.path.expanduser('~/Projects/bangkok-ioc/source-cache'))
RADIUS_M = 800
EXTRACT_M = 900
F = Transformer.from_crs(4326, 32647, always_xy=True).transform


def classify(tags):
    """A building is only ever one of three things here."""
    if tags.get('height') or tags.get('building:height'):
        return 'explicitHeight'
    if tags.get('building:levels'):
        return 'levelsOnly'
    return 'noHeightInfo'


def main():
    index = json.loads((DATA / 'street-world.json').read_text())
    manifest = index['manifest']
    cache = CACHE_ROOT / manifest['cacheKey']
    if not cache.is_dir():
        raise SystemExit(f'the named extraction cache is not here: {cache}')

    areas = json.loads((DATA / 'street-areas.json').read_text())['areas']
    box = collections.Counter()
    hood = collections.Counter()
    per_area = []
    measured = set()

    for a in areas:
        aid = a['id']
        seq = cache / f'{aid}.seq'
        if not seq.exists():
            raise SystemExit(f'missing source extract: {seq.name}')
        disc = Point(*F(a['anchor']['x'], a['anchor']['y'])).buffer(RADIUS_M)
        local = collections.Counter()
        seen = set()
        for line in seq.open():
            line = line.strip('\x1e\n')
            if not line:
                continue
            f = json.loads(line)
            t = f.get('properties', {})
            if '@id' not in t:
                continue
            if not (t.get('building') or t.get('building:part')):
                continue
            # osmium exports a way twice: once as the raw line, once as the
            # assembled polygon. Only the polygon is a footprint.
            if f['geometry']['type'] not in ('Polygon', 'MultiPolygon'):
                continue
            gid = t['@type'][0] + str(t['@id'])
            if gid in seen:
                continue
            seen.add(gid)
            kind = classify(t)
            box['footprints'] += 1
            box[kind] += 1
            if not transform(F, shape(f['geometry'])).intersects(disc):
                continue
            hood['footprints'] += 1
            hood[kind] += 1
            local[kind] += 1
            measured.add(gid)
        per_area.append({'id': aid, 'name': a['name'], 'footprints': hood['footprints'] - sum(
            p['footprints'] for p in per_area) + local['footprints'],
            'explicitHeight': local['explicitHeight'], 'levelsOnly': local['levelsOnly'],
            'noHeightInfo': local['noHeightInfo']})

    # Every height-bearing footprint in the shipped geometry must be one the
    # source also carries. This is the join that proves nothing was lost.
    shipped_heights = set()
    shipped_footprints = set()
    rendered = 0
    not_rendered = collections.Counter()
    for a in areas:
        payload = json.loads((DATA / 'street-world' / f"{a['id']}.json").read_text())
        for f in payload['buildings']['features']:
            shipped_footprints.add(f['id'])
            if f['properties']['heightM'] is not None:
                shipped_heights.add(f['id'])
                if f['properties'].get('render3D'):
                    rendered += 1
                else:
                    not_rendered[f['properties'].get('flatReason') or 'unknown'] += 1

    payload = {
        'source': 'OpenStreetMap',
        'sourceURL': 'https://www.openstreetmap.org',
        'license': 'ODbL-1.0',
        'licenseURL': 'https://www.openstreetmap.org/copyright',
        'snapshotMD5': manifest['md5'],
        'snapshotAsOf': manifest.get('asOf'),
        'measuredOn': datetime.date.today().isoformat(),
        'method': ('Every building polygon in the pinned extraction was joined by OSM id to the '
                   'shipped street-world geometry. A height counts only when the source tag gives '
                   'metres; a floor count is reported separately and never converted.'),
        'rule': ('Only explicit height / building:height tags in metres are drawn. building:levels '
                 'is recorded as knowable but not a height, so those footprints stay flat. No floor '
                 'conversion, no default height, no generated detail.'),
        'populations': {
            'extractionBoxes': {
                'radiusM': EXTRACT_M,
                'meaning': 'The source geometry the pipeline read: a 900 m box around each neighbourhood anchor.',
                'footprints': box['footprints'],
                'explicitHeight': box['explicitHeight'],
                'levelsOnly': box['levelsOnly'],
                'noHeightInfo': box['noHeightInfo'],
            },
            'neighbourhoods': {
                'radiusM': RADIUS_M,
                'meaning': 'The 800 m radius that actually ships and is drawn.',
                'footprints': hood['footprints'],
                'explicitHeight': hood['explicitHeight'],
                'levelsOnly': hood['levelsOnly'],
                'noHeightInfo': hood['noHeightInfo'],
            },
        },
        'shipped': {
            'footprints': len(shipped_footprints),
            'explicitHeight': len(shipped_heights),
            'renderedHeight': rendered,
            'notRendered': dict(not_rendered),
            'notRenderedMeaning': ('A parent outline whose own height is carried by a mapped '
                                    'height-bearing building part inside it. The volume is drawn '
                                    'once, on the part; the parent stays flat so the same building '
                                    'is not extruded twice.'),
            'heightsFoundInSource': len(measured & shipped_heights),
            'heightsShippedButNotInSource': len(shipped_heights - measured),
        },
        'areas': per_area,
    }
    out = DATA / 'height-coverage.json'
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({
        'written': str(out.relative_to(ROOT)),
        'neighbourhoodFootprints': hood['footprints'],
        'explicitHeight': hood['explicitHeight'],
        'levelsOnly': hood['levelsOnly'],
        'noHeightInfo': hood['noHeightInfo'],
        'heightsShippedButNotInSource': len(shipped_heights - measured),
    }))


if __name__ == '__main__':
    main()
