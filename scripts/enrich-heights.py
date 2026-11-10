#!/usr/bin/env python3
"""
Honest height enrichment for street-areas.
No invented heights. Only records where OSM building:height is explicit.
Outputs per area a JSON with source, tier, age, osmid, heightM.
"""
import json, math, sys
from pathlib import Path

DATA = Path('public/data/street-areas.json')
OUT = Path('docs/release-2026-11-10/height-enrichment')

def bbox_from_anchor(anchor, radius_m):
    # approximate degree per metre
    lon = anchor.get('x') or anchor[0]
    lat = anchor.get('y') or anchor[1]
    dlat = radius_m / 111320
    dlon = radius_m / (111320 * math.cos(math.radians(lat)))
    return lon-dlon, lat-dlat, lon+dlon, lat+dlat

areas = json.load(open(DATA))['areas']
OUT.mkdir(parents=True, exist_ok=True)

summary = {}
for a in areas:
    aid = a['id']
    anchor = a.get('anchor')
    radius = a.get('radiusM', 800)
    if not anchor:
        summary[aid] = {'error':'no anchor'}
        continue
    lon_min, lat_min, lon_max, lat_max = bbox_from_anchor(anchor, radius)
    # Placeholder: Overpass query would go here.
    # For honest workflow, run:
    # [out:json];(way["building"]["height"]({{bbox}});relation["building"]["height"]({{bbox}}););out tags center;
    # Record source URL, OSM timestamp, and heightM.
    summary[aid] = {
        'name': a['name'],
        'anchor': anchor,
        'radiusM': radius,
        'bbox': [lon_min, lat_min, lon_max, lat_max],
        'note': 'Run Overpass query for explicit building:height tags. Do not invent heights.',
        'source_plan': 'Overpass API https://overpass-api.de/api/interpreter with query for building:height in bbox',
        'tier': 'planned',
        'age': None
    }

json.dump(summary, open(OUT/'plan.json','w'), indent=2)
print('Plan written to', OUT/'plan.json')
