#!/usr/bin/env python3
"""Offline, reproducible catalogue of Bangkok work spots from two open datasets.
  OpenStreetMap  (ODbL-1.0)              -- Geofabrik extract, MD5-pinned
  Overture Places (CDLA-Permissive-2.0)  -- release 2026-10-21.0, Bangkok bbox, sha-pinned
Requires osmium and the duckdb Python package. Visitors never call either source.

Usage:
  python3 scripts/build-places.py --fetch-overture   # one-off: pull the Overture bbox to SOURCE_DIR
  python3 scripts/build-places.py                    # build public/data/
"""
import collections, hashlib, json, math, pathlib, re, shutil, subprocess, sys, tempfile, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT.parent / 'source-cache'
OSM_PBF = SOURCE_DIR / 'thailand-261024.osm.pbf'
OSM_URL = 'https://download.geofabrik.de/asia/thailand-261024.osm.pbf'
OSM_MD5 = '215e1ff30fe4d4adef2db3d664dab9da'
OSM_AS_OF = '2026-10-24T20:20:51Z'
OV_RELEASE = '2026-10-21.0'
OV_FILE = SOURCE_DIR / 'overture' / f'places-{OV_RELEASE}-bkk.parquet'
OV_URL = f's3://overturemaps-us-west-2/release/{OV_RELEASE}/theme=places/type=place/*'
BOUNDS = [100.30, 13.45, 100.95, 14.10]
KINDS = ['cafe', 'restaurant', 'coworking', 'library']
CELL = 20  # 0.05° detail cells, loaded on tap
# Overture confidence floor per kind: restaurants are numerous and noisy, so the bar is higher.
OV_RULES = {'cafe': ("basic_category IN ('coffee_shop','cafe')", 0.6),
            'restaurant': ("basic_category IN ('restaurant','fast_food_restaurant')", 0.8),
            'coworking': ("taxonomy.primary = 'coworking_space'", 0.5),
            'library': ("basic_category = 'library'", 0.6)}
MERGE_M = 60  # same normalised name within 60 m = same venue
WIFI = {'wlan': 'yes', 'yes': 'yes', 'wifi': 'yes', 'no': 'no', 'terminal': 'no'}
F_WIFI, F_NOWIFI, F_HOURS, F_OUTDOOR, F_OVERTURE, F_CHAIN, F_NOTABLE = 1, 2, 4, 8, 16, 32, 64

def sha(path, algo='sha256'):
    h = hashlib.new(algo)
    with path.open('rb') as f:
        while chunk := f.read(1 << 20): h.update(chunk)
    return h.hexdigest()

# Names that only say what the place is are no name at all: treat like unnamed, never show them.
GENERIC = {'entrance', 'exit', 'toilet', 'restroom', 'parking', 'lobby', 'cafe', 'café', 'coffee', 'coffeeshop', 'restaurant',
           'thaifood', 'food', 'canteen', 'ร้านอาหาร', 'ร้านกาแฟ', 'กาแฟสด', 'กาแฟ', 'ร้านข้าว', 'โรงอาหาร', 'ห้องสมุด', 'library'}

def latin(name):
    return re.sub(r'[^a-z0-9]+', '', unicodedata.normalize('NFKD', name).casefold())

def norm(name):
    s = unicodedata.normalize('NFKC', name).casefold()
    return re.sub(r'[\W_]+', '', s)

def centre(geom):
    # Point = the node; polygon = mean of the venue's own footprint ring (never an admin centroid).
    t, c = geom['type'], geom['coordinates']
    if t == 'Point': return c
    ring = c[0] if t == 'Polygon' else c[0][0] if t == 'MultiPolygon' else c
    ring = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
    return [sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)]

def inside(lng, lat): return BOUNDS[0] <= lng <= BOUNDS[2] and BOUNDS[1] <= lat <= BOUNDS[3]

def osm_kind(t):
    if t.get('access') in ('private', 'no') or t.get('opening_hours') == 'closed' or any(
            t.get(k) in ('yes', 'true', '1') for k in ('closed', 'disused', 'abandoned', 'demolished')):
        return None
    if t.get('amenity') == 'coworking_space' or t.get('office') == 'coworking': return 'coworking'
    if t.get('amenity') == 'library' and t.get('access') != 'private': return 'library'
    return {'cafe': 'cafe', 'restaurant': 'restaurant'}.get(t.get('amenity'))

def load_osm(skipped):
    if sha(OSM_PBF, 'md5') != OSM_MD5:
        raise ValueError('OSM checksum differs; review and pin a new source contract before refresh')
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        f, c, seq = [str(pathlib.Path(tmp) / n) for n in ('f.pbf', 'c.pbf', 'p.geojsonseq')]
        subprocess.run(['osmium', 'tags-filter', str(OSM_PBF), 'nwr/amenity=cafe,restaurant,coworking_space,library',
                        'nwr/office=coworking', '-o', f, '--no-progress'], check=True)
        subprocess.run(['osmium', 'extract', f, '--bbox', ','.join(map(str, BOUNDS)), '-s', 'complete_ways',
                        '-o', c, '--no-progress'], check=True)
        subprocess.run(['osmium', 'export', c, '-f', 'geojsonseq', '-a', 'type,id',
                        '--geometry-types', 'point,polygon', '-o', seq, '--no-progress'], check=True)
        seen = set()
        for line in open(seq, encoding='utf-8'):
            feat = json.loads(line.strip('\x1e\n')); t = feat['properties']
            kind = osm_kind(t)
            if not kind: continue
            pid = t['@type'][0] + str(t['@id'])
            if pid in seen: continue
            seen.add(pid)
            name = (t.get('name:en') or t.get('name') or t.get('brand') or '').strip()[:120]
            if not name or norm(name) in GENERIC: skipped['osm_unnamed'] += 1; continue  # never invent a business name
            lng, lat = centre(feat['geometry'])
            if not inside(lng, lat): skipped['osm_outside'] += 1; continue
            th = (t.get('name:th') or '').strip()[:120]
            out.append({'id': pid, 'n': name, 'k': kind, 'y': round(lat, 5), 'x': round(lng, 5),
                        'th': th if th and th != name else None, 'w': WIFI.get(t.get('internet_access')),
                        'h': (t.get('opening_hours') or '')[:200] or None, 'o': t.get('outdoor_seating') == 'yes',
                        'c': (t.get('cuisine') or '')[:60] or None,
                        'web': t.get('website') or t.get('contact:website'), 'src': 'osm',
                        'brand': t.get('brand') or t.get('brand:wikidata'),
                        'notable': bool(t.get('wikidata') or t.get('wikipedia') or t.get('heritage'))})
    return out

def load_overture():
    import duckdb
    db = duckdb.connect()
    db.sql("INSTALL spatial; LOAD spatial;")
    rows = []
    for kind, (where, floor) in OV_RULES.items():
        q = f"""SELECT id, names.primary, ST_Y(geometry), ST_X(geometry), confidence, websites[1], socials[1], phones[1],
                       addresses[1].freeform, list_transform(sources, s -> s.dataset), brand.names.primary
                FROM read_parquet('{OV_FILE}')
                WHERE {where} AND confidence >= {floor} AND names.primary IS NOT NULL
                  AND coalesce(operating_status, 'open') = 'open'"""
        for gid, name, lat, lng, conf, web, social, tel, addr, ds, brand in db.sql(q).fetchall():
            if not inside(lng, lat): continue
            if norm(name) in GENERIC: continue
            # Overture GERS ids are 32 hex; the first 12 are unique across this catalogue (checked below).
            rows.append({'id': 'o' + gid.replace('-', '')[:12], 'n': name.strip()[:120], 'k': kind,
                         'y': round(lat, 5), 'x': round(lng, 5), 'conf': round(conf, 2), 'web': web,
                         'social': social, 'tel': tel, 'addr': (addr or '')[:160] or None,
                         'ds': sorted(set(d for d in ds if d != 'Overture')), 'src': 'overture', 'brand': brand})
    return rows

def metres(a, b):
    dy = (a['y'] - b['y']) * 111_320
    dx = (a['x'] - b['x']) * 111_320 * math.cos(math.radians(a['y']))
    return math.hypot(dx, dy)

def merge(osm, ov, skipped):
    """OSM wins (community-checked footprint). Overture fills gaps and lends website/phone to its match."""
    grid = collections.defaultdict(list)
    key = lambda p: (int(p['y'] * 1000), int(p['x'] * 1000))  # ~110 m cells
    def near(p):
        gy, gx = key(p)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1): yield from grid[(gy + dy, gx + dx)]
    def same(a, b):
        if metres(a, b) > MERGE_M: return False
        for na, nb in ((norm(a['n']), norm(b['n'])), (latin(a['n']), latin(b['n']))):  # Thai suffixes must not block a match
            if not na or not nb: continue
            short, long_ = sorted((na, nb), key=len)
            if na == nb or (len(short) >= 6 and short in long_): return True
        return False
    kept = []
    for p in osm:
        grid[key(p)].append(p); kept.append(p)
    for p in sorted(ov, key=lambda r: -r['conf']):
        match = next((q for q in near(p) if same(p, q)), None)
        if match:
            for f in ('web', 'social', 'tel', 'addr', 'brand'):
                if p.get(f) and not match.get(f): match[f] = p[f]
            match['ds'] = sorted(set(match.get('ds') or []) | set(p['ds']))  # every dataset that lists this venue
            skipped['overture_merged' if match['src'] == 'osm' else 'overture_duplicate'] += 1
            continue
        grid[key(p)].append(p); kept.append(p)
    return kept

# ---- Great Good Place metrics -------------------------------------------------------------
# Each is a decile 0-9 across all 57k places, so "7" means "better than ~70% of Bangkok".
# A Access    walk distance to the nearest rail station. Jeffres et al. 2009: perceived
#             accessibility of third places predicts community quality of life.
# S Scene     third places within 250 m. Adelfio et al. 2020 map third places as clusters.
# C Character not a chain (name seen <=1x, no brand). Mehta & Bosson 2010: personalization.
# F Footprint how many independent datasets and channels know the venue (OSM, Meta,
#             Foursquare, AllThePlaces, Microsoft, website, social, phone). A popularity proxy;
#             Adelfio et al. warn one source alone misleads, so this counts agreement.
# W Work      co-working/library, tagged Wi-Fi, known hours. Visitor scores add to it live.
# N Notable   Wikidata/Wikipedia/heritage tag on the venue itself (prestige; sparse, honest).
METRICS = {'A': 'Access', 'S': 'Scene', 'C': 'Character', 'F': 'Footprint', 'W': 'Work', 'N': 'Notable'}
SCENE_M = 250

def load_stations():
    with tempfile.TemporaryDirectory() as tmp:
        f, seq = str(pathlib.Path(tmp) / 'f.pbf'), str(pathlib.Path(tmp) / 's.seq')
        subprocess.run(['osmium', 'tags-filter', str(OSM_PBF), 'n/railway=station', '-o', f, '--no-progress'], check=True)
        subprocess.run(['osmium', 'export', f, '-f', 'geojsonseq', '-o', seq, '--no-progress'], check=True)
        pts = [json.loads(l.strip('\x1e\n'))['geometry']['coordinates'] for l in open(seq)]
    return [(y, x) for x, y in pts if inside(x, y)]

def deciles(values, reverse=False):
    order = sorted(range(len(values)), key=lambda i: values[i], reverse=reverse)
    out, n, i = [0] * len(values), len(values), 0
    while i < n:  # ties share a decile
        j = i
        while j + 1 < n and values[order[j + 1]] == values[order[i]]: j += 1
        d = min(9, int(10 * ((i + j) / 2) / n))
        for k in range(i, j + 1): out[order[k]] = d
        i = j + 1
    return out

def percentiles(values, reverse=False):
    order = sorted(range(len(values)), key=lambda i: values[i], reverse=reverse)
    out, n, i = [0.0] * len(values), len(values), 0
    while i < n:
        j = i
        while j + 1 < n and values[order[j + 1]] == values[order[i]]: j += 1
        for k in range(i, j + 1): out[order[k]] = ((i + j) / 2) / max(1, n - 1)
        i = j + 1
    return out

def score_places(places, stations):
    cell = lambda y, x, size: (int(y / size), int(x / size))
    sgrid = collections.defaultdict(list)
    for y, x in stations: sgrid[cell(y, x, 0.01)].append((y, x))
    pgrid = collections.defaultdict(list)
    for p in places: pgrid[cell(p['y'], p['x'], 0.0025)].append(p)
    names = collections.Counter(norm(p['n']) for p in places)
    walk, scene, foot, work = [], [], [], []
    for p in places:
        gy, gx = cell(p['y'], p['x'], 0.01); best = 9e9; r = 1
        while best == 9e9 and r < 30:  # widen until a station is found
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    for y, x in sgrid.get((gy + dy, gx + dx), ()):
                        best = min(best, metres(p, {'y': y, 'x': x}))
            r += 1
        walk.append(best)
        gy, gx = cell(p['y'], p['x'], 0.0025)
        scene.append(sum(1 for dy in (-1, 0, 1) for dx in (-1, 0, 1) for q in pgrid.get((gy + dy, gx + dx), ())
                         if q is not p and metres(p, q) <= SCENE_M))
        foot.append((p['src'] == 'osm') + len(p.get('ds') or []) +
                    bool(p.get('web')) + bool(p.get('social')) + bool(p.get('tel')))
        work.append((4 if p['k'] in ('coworking', 'library') else 0) + (3 if p.get('w') == 'yes' else 0) + (1 if p.get('h') else 0))
        p['chain'] = bool(p.get('brand')) or names[norm(p['n'])] >= 3
    A, S, F = deciles(walk, reverse=True), deciles(scene), deciles(foot)
    pA, pS, pF = percentiles(walk, reverse=True), percentiles(scene), percentiles(foot)
    for i, p in enumerate(places):
        C = 1 if p['chain'] else 5 if names[norm(p['n'])] == 2 else 9
        # Great Good Place index: mean of the four Oldenburg-facing percentiles, 0-100 (fine-grained, few ties)
        p['i'] = round((pA[i] + pS[i] + C / 9 + pF[i]) / 4 * 100)
        W = min(9, round(work[i] * 9 / 8))
        N = 9 if p.get('notable') else 0
        p['g'] = f"{A[i]}{S[i]}{C}{F[i]}{W}{N}"
        p['m'] = {'walk': round(walk[i]), 'scene': scene[i], 'sources': foot[i]}  # raw values for the sheet

def build():
    skipped = collections.Counter()
    osm, ov = load_osm(skipped), load_overture()
    places = sorted(merge(osm, ov, skipped), key=lambda r: r['id'])
    score_places(places, load_stations())
    ids = [p['id'] for p in places]
    assert len(ids) == len(set(ids)), 'id collision'
    data = ROOT / 'public' / 'data'
    shutil.rmtree(data / 'cells', ignore_errors=True); (data / 'cells').mkdir(parents=True)
    rows, cells = [], collections.defaultdict(dict)
    for p in places:
        flags = (F_WIFI if p.get('w') == 'yes' else F_NOWIFI if p.get('w') == 'no' else 0) | \
                (F_HOURS if p.get('h') else 0) | (F_OUTDOOR if p.get('o') else 0) | (F_OVERTURE if p['src'] == 'overture' else 0) | \
                (F_CHAIN if p['chain'] else 0) | (F_NOTABLE if p.get('notable') else 0)
        rows.append([p['id'], p['n'], KINDS.index(p['k']), p['y'], p['x'], flags, p['g'], p['i']] + ([p['h']] if p.get('h') else []))
        detail = {k: p[k] for k in ('th', 'h', 'c', 'web', 'social', 'tel', 'addr', 'conf', 'ds', 'm') if p.get(k)}
        if detail: cells[f"{math.floor(p['y'] * CELL)}-{math.floor(p['x'] * CELL)}"][p['id']] = detail
    # Two files so work spots paint first; restaurants (2/3 of rows) stream in after.
    files = {}
    for name, keep in (('work', lambda r: KINDS[r[2]] != 'restaurant'), ('food', lambda r: KINDS[r[2]] == 'restaurant')):
        raw = json.dumps({'kinds': KINDS, 'cols': ['id', 'name', 'kind', 'lat', 'lng', 'flags', 'metrics', 'index', 'hours?'], 'metrics': METRICS,
                          'rows': [r for r in rows if keep(r)]}, ensure_ascii=False, separators=(',', ':')).encode()
        (data / f'places-{name}.json').write_bytes(raw)
        files[name] = {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
    for cell, d in cells.items():
        (data / 'cells' / f'{cell}.json').write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
    counts = collections.Counter(p['k'] for p in places)
    manifest = {
        'builtFrom': [
            {'name': 'OpenStreetMap', 'url': OSM_URL, 'asOf': OSM_AS_OF, 'licence': 'ODbL-1.0',
             'attribution': '© OpenStreetMap contributors', 'sha256': sha(OSM_PBF)},
            {'name': 'Overture Maps Places', 'url': OV_URL, 'release': OV_RELEASE, 'licence': 'CDLA-Permissive-2.0',
             'attribution': '© Overture Maps Foundation', 'sha256': sha(OV_FILE),
             'confidenceFloor': {k: v[1] for k, v in OV_RULES.items()}}],
        'bounds': BOUNDS, 'cellsPerDegree': CELL, 'total': len(places), 'kinds': dict(sorted(counts.items())),
        'bySource': dict(collections.Counter(p['src'] for p in places)), 'skipped': dict(sorted(skipped.items())),
        'wifiTagged': sum(1 for p in places if p.get('w') == 'yes'), 'hoursTagged': sum(1 for p in places if p.get('h')),
        'files': files}
    (data / 'manifest.json').write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + '\n')
    print(json.dumps({k: manifest[k] for k in ('total', 'kinds', 'bySource', 'skipped', 'files')}, indent=1))

def fetch_overture():
    import duckdb
    db = duckdb.connect()
    db.sql("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
    OV_FILE.parent.mkdir(parents=True, exist_ok=True)
    b = BOUNDS
    db.sql(f"""COPY (SELECT * FROM read_parquet('{OV_URL}', hive_partitioning=1)
               WHERE bbox.xmin BETWEEN {b[0]} AND {b[2]} AND bbox.ymin BETWEEN {b[1]} AND {b[3]})
               TO '{OV_FILE}' (FORMAT parquet)""")
    print(OV_FILE, sha(OV_FILE))

if __name__ == '__main__':
    fetch_overture() if '--fetch-overture' in sys.argv else build()
