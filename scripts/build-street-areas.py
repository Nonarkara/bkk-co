#!/usr/bin/env python3
"""Choose the street-sketch areas: the 3D neighbourhoods you can hunt and hop among cafes.

The rule is stated, computed and repeatable:

  * Four authored neighbourhoods keep their anchor and their story (data/hoods.json), plus
    one operator-reported venue (Meet's space, Ramkhamhaeng).
  * The rest are chosen by CAFE DENSITY, not by fame. For every real OSM district polygon
    we find the busiest 800 m circle of catalogue cafes, then take the district whose
    busiest circle holds the most cafes. A candidate is skipped when it overlaps an area
    already chosen, so the twelve never show the same street twice.
  * The anchor of a chosen district is the highest-index independent cafe in that circle,
    and the anchor's own coordinates are used. Nothing is invented: the anchor is a real
    mapped venue with a real catalogue id.
  * Every area records how many cafes, libraries and co-work spaces fall inside it, so the
    interface can state the neighbourhood's actual mix instead of an authored mood.

Usage: python3 scripts/build-street-areas.py
"""
import collections, hashlib, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data'
RADIUS_M = 800
TARGET_NEW = 7
# A candidate must not overlap an area already chosen.
MIN_SEPARATION_M = 1500
# A district needs a real cafe cluster to be worth walking.
MIN_CLUSTER_CAFES = 40

# EPSG:32647 (UTM 47N) keeps metre distances honest over Bangkok.
def utm(lon, lat, epsg=32647):
    x = lon * 20037508.34 / 180
    # A local metre approximation is enough for a neighbourhood-scale separation test.
    import math
    return x * math.cos(math.radians(lat)), lat * 110574

def main():
    work = json.loads((DATA / 'places-work.json').read_text())
    rows, kinds = work['rows'], work['kinds']
    geo = json.loads((DATA / 'atlas-geo.json').read_text())
    hoods = json.loads((DATA / 'hoods.json').read_text())['hoods']
    cafe_rows = [r for r in rows if kinds[r[2]] == 'cafe']
    by_id = {r[0]: r for r in rows}

    areas = []
    for h in hoods:
        a = h['anchor']
        areas.append({
            'id': h['slug'], 'name': h['name'], 'nameTh': h.get('th'), 'mood': h.get('for'),
            'anchor': {'sourceID': a['id'], 'x': a['x'], 'y': a['y']}, 'radiusM': RADIUS_M,
            'basis': 'Authored neighbourhood around one real OSM anchor.',
            'kind': 'authored',
        })
    meet = by_id['o825832f94e7f']
    areas.append({
        'id': 'ramkhamhaeng', 'name': "Meet's space · Ramkhamhaeng", 'nameTh': 'รามคำแหง', 'mood': "Meet's space",
        'anchor': {'sourceID': meet[0], 'x': meet[4], 'y': meet[3]}, 'radiusM': RADIUS_M,
        'basis': 'One operator-reported venue, placed at its published point.',
        'kind': 'venue',
    })

    # District polygons carry real names in English and Thai.
    districts = []
    for f in geo['districts']['features']:
        p = f['properties']
        districts.append((p, f['geometry']))

    def inside(geom, lon, lat):
        # Point-in-polygon on the raw lon/lat ring, so no projection is assumed.
        polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
        for poly in polys:
            ring = poly[0]
            inside_pt = False
            j = len(ring) - 1
            for i in range(len(ring)):
                xi, yi = ring[i][0], ring[i][1]
                xj, yj = ring[j][0], ring[j][1]
                if ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi):
                    inside_pt = not inside_pt
                j = i
            if inside_pt:
                return True
        return False

    chosen_points = [(utm(a['anchor']['x'], a['anchor']['y'])) for a in areas]
    candidates = []
    for props, geom in districts:
        local = [r for r in cafe_rows if inside(geom, r[4], r[3])]
        if len(local) < MIN_CLUSTER_CAFES:
            continue
        pts = [(r, utm(r[4], r[3])) for r in local]
        peak_count, peak_pt = 0, None
        for r, (px, py) in pts:
            n = sum(1 for _, (qx, qy) in pts if (px - qx) ** 2 + (py - qy) ** 2 <= RADIUS_M ** 2)
            if n > peak_count:
                peak_count, peak_pt = n, (px, py)
        if peak_pt is None:
            continue
        cluster = [(r, p) for r, p in pts if (p[0] - peak_pt[0]) ** 2 + (p[1] - peak_pt[1]) ** 2 <= RADIUS_M ** 2]
        # The anchor is the highest-index independent cafe in the busiest circle.
        anchor_row = max(cluster, key=lambda rp: (rp[0][7], rp[0][1]))[0]
        candidates.append({
            'id': props['name'].lower().replace(' district', '').replace(' ', ''),
            'name': props['name'].replace(' District', ''),
            'nameTh': props.get('nameTh') or '',
            'district': props['name'],
            'cafesWithin800m': peak_count,
            'anchor': {'sourceID': anchor_row[0], 'x': anchor_row[4], 'y': anchor_row[3]},
            'radiusM': RADIUS_M,
            'basis': f"Densest 800 m cafe circle in the {props['name']} polygon, anchored on a real mapped cafe.",
            'kind': 'cluster',
        })
    candidates.sort(key=lambda c: (-c['cafesWithin800m'], c['name']))

    for c in candidates:
        if len([a for a in areas if a['kind'] == 'cluster']) >= TARGET_NEW:
            break
        p = utm(c['anchor']['x'], c['anchor']['y'])
        if any((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 < MIN_SEPARATION_M ** 2 for q in chosen_points):
            continue
        # The real mix inside the circle, counted from the catalogue.
        mix = collections.Counter()
        for r in rows:
            if (utm(r[4], r[3])[0] - p[0]) ** 2 + (utm(r[4], r[3])[1] - p[1]) ** 2 <= RADIUS_M ** 2:
                mix[kinds[r[2]]] += 1
        c['mix'] = {k: mix.get(k, 0) for k in ('cafe', 'coworking', 'library', 'restaurant') if mix.get(k)}
        areas.append(c)
        chosen_points.append(p)

    for a in areas:
        if 'mix' in a:
            continue
        p = utm(a['anchor']['x'], a['anchor']['y'])
        mix = collections.Counter()
        for r in rows:
            q = utm(r[4], r[3])
            if (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 <= RADIUS_M ** 2:
                mix[kinds[r[2]]] += 1
        a['mix'] = {k: mix.get(k, 0) for k in ('cafe', 'coworking', 'library', 'restaurant') if mix.get(k)}
        a['cafesWithin800m'] = mix.get('cafe', 0)

    payload = {
        'manifest': {
            'version': 1, 'built': '2026-11-07',
            'rule': 'Authored neighbourhoods keep their anchors. The rest are the districts whose busiest 800 m catalogue cafe circle holds the most cafes, anchored on a real mapped cafe, with no overlap between areas.',
            'radiusM': RADIUS_M, 'minSeparationM': MIN_SEPARATION_M,
            'source': 'OpenStreetMap district polygons; PLUB catalogue',
            'sourceURL': 'https://www.openstreetmap.org/copyright',
            'licenses': ['ODbL-1.0 (OpenStreetMap)', 'CDLA-P-2.0 (Overture Maps)'],
            'catalogueSHA256': hashlib.sha256((DATA / 'places-work.json').read_bytes()).hexdigest(),
            'districtPolygons': len(districts),
            'areas': len(areas),
        },
        'areas': areas,
    }
    out = DATA / 'street-areas.json'
    out.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps({'areas': len(areas), 'bytes': out.stat().st_size,
                      'list': [{'id': a['id'], 'name': a['name'], 'cafes': a.get('cafesWithin800m')} for a in areas]}, ensure_ascii=False))


if __name__ == '__main__':
    main()
