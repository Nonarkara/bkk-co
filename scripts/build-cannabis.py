#!/usr/bin/env python3
"""Offline, reproducible open-data catalogue of Bangkok cannabis dispensaries and clinics for CL;UB.
  OpenStreetMap  (ODbL-1.0)              -- Geofabrik extract, MD5-pinned
  Overture Places (CDLA-Permissive-2.0)  -- release 2026-10-21.0, Bangkok bbox, sha-pinned
Leaves the signed 57,379 work/food catalogue files (places-work.json, places-food.json) untouched.
"""
import collections, hashlib, json, math, pathlib, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
import importlib.util
spec = importlib.util.spec_from_file_location('build_places', ROOT / 'scripts' / 'build-places.py')
bp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bp)

def classify_sub(name, th, cat, tax, tags=None):
    blob = f"{name or ''} {th or ''}".lower()
    if tax == 'cannabis_clinic' or cat == 'cannabis_clinic' or 'clinic' in blob or 'คลินิก' in blob or 'สหคลินิก' in blob or 'เวชกรรม' in blob or 'แผนไทย' in blob:
        return 'clinic'
    if (tags and tags.get('amenity') == 'cafe') or 'cafe' in blob or 'café' in blob or 'coffee' in blob or 'คาเฟ่' in blob:
        return 'cafe'
    return 'dispensary'

def load_osm_cannabis(skipped):
    if bp.sha(bp.OSM_PBF, 'md5') != bp.OSM_MD5:
        raise ValueError('OSM checksum differs; review and pin a new source contract before refresh')
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        f, c, seq = [str(pathlib.Path(tmp) / n) for n in ('f.pbf', 'c.pbf', 'p.geojsonseq')]
        subprocess.run(['osmium', 'tags-filter', str(bp.OSM_PBF),
                        'nwr/shop=cannabis,beverages,herbalist',
                        'nwr/amenity=dispensary,pharmacy,cafe,clinic',
                        '-o', f, '--no-progress'], check=True)
        subprocess.run(['osmium', 'extract', f, '--bbox', ','.join(map(str, bp.BOUNDS)), '-s', 'complete_ways',
                        '-o', c, '--no-progress'], check=True)
        subprocess.run(['osmium', 'export', c, '-f', 'geojsonseq', '-a', 'type,id',
                        '--geometry-types', 'point,polygon', '-o', seq, '--no-progress'], check=True)
        seen = set()
        for line in open(seq, encoding='utf-8'):
            feat = json.loads(line.strip('\x1e\n')); t = feat['properties']
            if t.get('access') in ('private', 'no') or t.get('opening_hours') == 'closed' or any(
                    t.get(k) in ('yes', 'true', '1') for k in ('closed', 'disused', 'abandoned', 'demolished')):
                continue
            raw_names = ' '.join(str(t.get(k) or '') for k in ('name', 'name:en', 'name:th', 'brand')).lower()
            is_can = (
                t.get('shop') == 'cannabis' or
                t.get('amenity') == 'dispensary' or
                t.get('beverages') == 'cannabis' or
                any(w in raw_names for w in ('cannabis', 'dispensary', 'ganja', 'weed', 'กัญชา'))
            )
            if not is_can:
                continue
            pid = t['@type'][0] + str(t['@id'])
            if pid in seen:
                continue
            seen.add(pid)
            name = (t.get('name:en') or t.get('name') or t.get('brand') or '').strip()[:120]
            if not name or bp.norm(name) in bp.GENERIC:
                skipped['osm_unnamed'] += 1
                continue
            lng, lat = bp.centre(feat['geometry'])
            if not bp.inside(lng, lat):
                skipped['osm_outside'] += 1
                continue
            th = (t.get('name:th') or '').strip()[:120]
            out.append({
                'id': pid, 'n': name, 'k': 'cannabis', 'y': round(lat, 5), 'x': round(lng, 5),
                'th': th if th and th != name else None,
                'w': bp.WIFI.get(t.get('internet_access')),
                'h': (t.get('opening_hours') or '')[:200] or None,
                'o': t.get('outdoor_seating') == 'yes',
                'c': (t.get('cuisine') or '')[:60] or None,
                'web': t.get('website') or t.get('contact:website'),
                'tel': t.get('phone') or t.get('contact:phone'),
                'addr': ' '.join(filter(None, [t.get('addr:housenumber'), t.get('addr:street'), t.get('addr:subdistrict'), t.get('addr:district')]))[:160] or None,
                'src': 'osm',
                'brand': t.get('brand') or t.get('brand:wikidata'),
                'notable': bool(t.get('wikidata') or t.get('wikipedia') or t.get('heritage')),
                'sub': classify_sub(name, th, t.get('shop'), t.get('amenity'), t),
            })
    return out

def load_overture_cannabis():
    import duckdb
    db = duckdb.connect()
    db.sql("INSTALL spatial; LOAD spatial;")
    q = f"""SELECT id, names.primary, basic_category, taxonomy.primary, ST_Y(geometry), ST_X(geometry),
                   confidence, websites[1], socials[1], phones[1], addresses[1].freeform,
                   list_transform(sources, s -> s.dataset), brand.names.primary
            FROM read_parquet('{bp.OV_FILE}')
            WHERE (taxonomy.primary IN ('cannabis_clinic', 'cannabis_dispensary')
               OR basic_category IN ('cannabis_clinic', 'cannabis_dispensary')
               OR (basic_category IN ('medical_service', 'alternative_medicine', 'pharmacy', 'herb_and_spice_shop')
                   AND (names.primary ILIKE '%cannabis%' OR names.primary ILIKE '%dispensary%' OR names.primary LIKE '%กัญชา%')))
              AND confidence >= 0.5 AND names.primary IS NOT NULL
              AND coalesce(operating_status, 'open') = 'open'"""
    rows = []
    for gid, name, cat, tax, lat, lng, conf, web, social, tel, addr, ds, brand in db.sql(q).fetchall():
        if not bp.inside(lng, lat):
            continue
        if bp.norm(name) in bp.GENERIC:
            continue
        rows.append({
            'id': 'o' + gid.replace('-', '')[:12],
            'n': name.strip()[:120],
            'k': 'cannabis',
            'y': round(lat, 5),
            'x': round(lng, 5),
            'conf': round(conf, 2),
            'web': web,
            'social': social,
            'tel': tel,
            'addr': (addr or '')[:160] or None,
            'ds': sorted(set(d for d in ds if d != 'Overture')),
            'src': 'overture',
            'brand': brand,
            'sub': classify_sub(name, None, cat, tax),
        })
    return rows

def build():
    skipped = collections.Counter()
    osm = load_osm_cannabis(skipped)
    ov = load_overture_cannabis()
    places = sorted(bp.merge(osm, ov, skipped), key=lambda r: r['id'])
    # Load existing work/food ids so we never collide with a cafe/restaurant id already in the base catalogue
    data = ROOT / 'public' / 'data'
    existing_ids = set()
    for fn in ('places-work.json', 'places-food.json'):
        pfile = data / fn
        if pfile.exists():
            for r in json.loads(pfile.read_text()).get('rows', []):
                existing_ids.add(r[0])
    places = [p for p in places if p['id'] not in existing_ids]
    bp.score_places(places, bp.load_stations(), bp.load_parking())
    # Re-bonus W (work/amenities) for cannabis cafes/clinics with hours/wifi/web
    for p in places:
        g = list(p['g'])
        w_score = (3 if p.get('sub') == 'cafe' else 2 if p.get('sub') == 'clinic' else 1) + (3 if p.get('w') == 'yes' else 0) + (2 if p.get('h') else 0) + (1 if p.get('web') or p.get('tel') else 0)
        g[4] = str(min(9, w_score))
        p['g'] = ''.join(g)

    rows = []
    details = {}
    for p in places:
        flags = (bp.F_WIFI if p.get('w') == 'yes' else bp.F_NOWIFI if p.get('w') == 'no' else 0) | \
                (bp.F_HOURS if p.get('h') else 0) | (bp.F_OUTDOOR if p.get('o') else 0) | \
                (bp.F_OVERTURE if p['src'] == 'overture' else 0) | \
                (bp.F_CHAIN if p['chain'] else 0) | (bp.F_NOTABLE if p.get('notable') else 0) | \
                (bp.F_PARK if p['park'] is not None and p['park'] <= bp.PARK_M else 0)
        rows.append([p['id'], p['n'], 0, p['y'], p['x'], flags, p['g'], p['i']] + ([p['h']] if p.get('h') else []))
        det = {k: p[k] for k in ('th', 'h', 'c', 'web', 'social', 'tel', 'addr', 'conf', 'ds', 'm', 'sub') if p.get(k)}
        if det:
            details[p['id']] = det

    payload = {
        'kinds': ['cannabis'],
        'cols': ['id', 'name', 'kind', 'lat', 'lng', 'flags', 'metrics', 'index', 'hours?'],
        'metrics': bp.METRICS,
        'builtFrom': [
            {'name': 'OpenStreetMap', 'asOf': bp.OSM_AS_OF, 'licence': 'ODbL-1.0'},
            {'name': 'Overture Maps Places', 'release': bp.OV_RELEASE, 'licence': 'CDLA-Permissive-2.0', 'confidenceFloor': 0.5},
        ],
        'total': len(rows),
        'bySource': dict(collections.Counter(p['src'] for p in places)),
        'bySub': dict(collections.Counter(p.get('sub', 'dispensary') for p in places)),
        'rows': rows,
        'details': details,
    }
    raw = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode()
    (data / 'places-cannabis.json').write_bytes(raw)
    print(json.dumps({
        'total': payload['total'],
        'bySource': payload['bySource'],
        'bySub': payload['bySub'],
        'bytes': len(raw),
        'sha256': hashlib.sha256(raw).hexdigest(),
    }, indent=2))

if __name__ == '__main__':
    build()
