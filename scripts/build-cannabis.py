#!/usr/bin/env python3
"""Offline, reproducible open-data catalogue of Thailand cannabis dispensaries and clinics for CL;UB.
  OpenStreetMap  (ODbL-1.0)              -- Geofabrik Thailand extract, MD5-pinned
  Overture Places (CDLA-Permissive-2.0)  -- release 2026-10-21.0, Bangkok bbox, sha-pinned
Leaves the signed 57,379 work/food catalogue files (places-work.json, places-food.json) untouched.

Run it in the repository, not in a bare copy: the builder reads the signed catalogue
and drops any cannabis venue that is already a PL;UB place, so a venue is never
listed twice. Without those two files the build is one row longer and is wrong.
"""
import collections, csv, hashlib, json, math, pathlib, re, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
import importlib.util
spec = importlib.util.spec_from_file_location('build_places', ROOT / 'scripts' / 'build-places.py')
bp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bp)

TH_BOUNDS = [97.2, 5.5, 105.8, 20.6]
def inside_th(lng, lat): return TH_BOUNDS[0] <= lng <= TH_BOUNDS[2] and TH_BOUNDS[1] <= lat <= TH_BOUNDS[3]

# DTAM (Department of Thai Traditional and Alternative Medicine, Ministry of Public Health)
# licensed cannabis venues — official Thai government register, data.go.th dataset dtam-serv-002.
# Columns: ลำดับ, เลขที่ใบอนุญาต, ชื่อ, เขต — name + Bangkok district, NO coordinates.
# Per GSH: district centroids are never pins. DTAM corroborates venues already mapped in OSM/Overture
# by name + district match; unmatched rows are reported but not added (they need a hand pin).
DTAM_CSV = bp.SOURCE_DIR / 'dtam-serv-002.csv'
DTAM_HASH = '7d0eb15989275db4111f793c1f3eb324'  # MD5 from data.go.th CKAN, 2026-05-11

CLUB_NAME = re.compile(r'cannabis|canabis|dispensary|\bweed\b|ganja|\bthc\b|กัญชา', re.I)
SHOP_NAME = re.compile(r'dispensary|cannabis shop|weed shop|ร้านกัญชา', re.I)
CLINIC_NAME = re.compile(r'\bclinic\b|คลินิก|เวชกรรม', re.I)
CAFE_NAME = re.compile(r'caf[eé]|coffee|คาเฟ่', re.I)

def classify_sub(name, th, cat, tax, tags=None):
    label = f"{name or ''} {th or ''}"
    # Overture's clinic taxonomy alone includes unrelated clinics and stores.
    if tags is None and not CLUB_NAME.search(label):
        return None
    if SHOP_NAME.search(label):
        return 'dispensary'
    if CLINIC_NAME.search(label) and CLUB_NAME.search(label):
        return 'clinic'
    if (tags and tags.get('amenity') == 'cafe') or CAFE_NAME.search(label):
        return 'cafe'
    if 'cannabis_dispensary' in (cat, tax) or (tags and
            (tags.get('shop') == 'cannabis' or tags.get('amenity') == 'dispensary')):
        return 'dispensary'
    return 'other'

def load_osm_cannabis(skipped):
    if bp.sha(bp.OSM_PBF, 'md5') != bp.OSM_MD5:
        raise ValueError('OSM checksum differs; review and pin a new source contract before refresh')
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        f, c, seq = [str(pathlib.Path(tmp) / n) for n in ('f.pbf', 'c.pbf', 'p.geojsonseq')]
        subprocess.run(['osmium', 'tags-filter', str(bp.OSM_PBF),
                        'nwr/shop=cannabis,beverages,herbalist,tobacco',
                        'nwr/amenity=dispensary,pharmacy,cafe,clinic',
                        'nwr/healthcare=clinic,pharmacy',
                        '-o', f, '--no-progress'], check=True)
        subprocess.run(['osmium', 'extract', f, '--bbox', ','.join(map(str, TH_BOUNDS)), '-s', 'complete_ways',
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
                t.get('cbd') == 'yes' or
                t.get('hemp') == 'yes' or
                t.get('medical_cannabis') == 'yes' or
                any(w in raw_names for w in ('cannabis', 'dispensary', 'ganja', 'weed', 'kush', '420', 'hemp', 'cbd', 'terpene', 'กัญชา', 'กัญชง'))
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
            if not inside_th(lng, lat):
                skipped['osm_outside'] += 1
                continue
            th = (t.get('name:th') or '').strip()[:120]
            pay = [lbl for k, lbl in (('payment:credit_cards', 'Cards'), ('payment:debit_cards', 'Debit'), ('payment:qr_code', 'QR'), ('payment:promptpay', 'PromptPay'), ('payment:cash', 'Cash')) if t.get(k) == 'yes']
            out.append({
                'id': pid, 'n': name, 'k': 'cannabis', 'y': round(lat, 5), 'x': round(lng, 5),
                'th': th if th and th != name else None,
                'w': bp.WIFI.get(t.get('internet_access')),
                'h': (t.get('opening_hours') or '')[:200] or None,
                'o': t.get('outdoor_seating') == 'yes',
                'c': (t.get('cuisine') or '')[:60] or None,
                'web': t.get('website') or t.get('contact:website'),
                'tel': t.get('phone') or t.get('contact:phone'),
                'ig': t.get('contact:instagram') or t.get('instagram'),
                'fb': t.get('contact:facebook') or t.get('facebook'),
                'line': t.get('contact:line') or t.get('line'),
                'deliv': t.get('delivery') == 'yes',
                'take': t.get('takeaway') == 'yes',
                'wheel': t.get('wheelchair') in ('yes', 'limited'),
                'ac': t.get('air_conditioning') == 'yes',
                'smoke': t.get('smoking') if t.get('smoking') in ('yes', 'outside', 'separated', 'no') else None,
                'pay': pay or None,
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
        subtype = classify_sub(name, None, cat, tax)
        if subtype is None:
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
            'sub': subtype,
        })
    return rows

def load_dtam_cannabis():
    """DTAM licensed cannabis venues (Thai FDA register). No coordinates — matched
    to OSM/Overture venues by name + Bangkok district for corroboration only."""
    if not DTAM_CSV.exists():
        raise FileNotFoundError(f'DTAM source not cached: {DTAM_CSV}')
    if hashlib.md5(DTAM_CSV.read_bytes()).hexdigest() != DTAM_HASH:
        raise ValueError('DTAM checksum differs; review and pin a new source contract before refresh')
    venues = []
    with DTAM_CSV.open(encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get('ชื่อ') or '').strip()
            district = (row.get('เขต') or '').strip()
            license_no = (row.get('เลขที่ใบอนุญาต') or '').strip()
            if not name or bp.norm(name) in bp.GENERIC:
                continue
            venues.append({'n': name, 'district': district, 'license': license_no})
    return venues

def classify_province(lat, lng):
    if 13.45 <= lat <= 14.10 and 100.30 <= lng <= 100.95:
        return 'Bangkok'
    if 12.60 <= lat <= 13.45 and 100.75 <= lng <= 101.25:
        return 'Pattaya / Chonburi'
    if 18.40 <= lat <= 19.20 and 98.60 <= lng <= 99.30:
        return 'Chiang Mai'
    if 7.70 <= lat <= 8.25 and 98.20 <= lng <= 98.50:
        return 'Phuket'
    if 9.35 <= lat <= 9.80 and 99.85 <= lng <= 100.15:
        return 'Samui / Surat Thani'
    if 12.35 <= lat <= 12.75 and 99.80 <= lng <= 100.05:
        return 'Hua Hin / Prachuap'
    return 'Regional Thailand'

def build():
    skipped = collections.Counter()
    osm = load_osm_cannabis(skipped)
    ov = load_overture_cannabis()
    places = sorted(bp.merge(osm, ov, skipped), key=lambda r: r['id'])

    # DTAM corroboration: match licensed venues to mapped venues by name + Bangkok district.
    # DTAM has no coordinates, so unmatched rows are reported but never pinned (GSH).
    try:
        dtam = load_dtam_cannabis()
        dtam_matched = 0
        for d in dtam:
            dn = bp.norm(d['n'])
            if not dn:
                continue
            matches = []
            for p in places:
                pn = bp.norm(p['n'])
                if not pn:
                    continue
                short, long_ = sorted((dn, pn), key=len)
                if dn == pn or (len(short) >= 6 and short in long_):
                    # District cross-check when OSM/Overture carries an address
                    paddr = p.get('addr') or ''
                    if d['district'] and d['district'] not in paddr:
                        continue
                    matches.append(p)
            if len(matches) == 1:
                p = matches[0]
                p.setdefault('ds', []).append('dtam')
                p['ds'] = sorted(set(p['ds']))
                dtam_matched += 1
            elif len(matches) > 1:
                skipped['dtam_ambiguous'] += 1
        skipped['dtam_matched'] = dtam_matched
        skipped['dtam_unmatched'] = len(dtam) - dtam_matched - skipped['dtam_ambiguous']
    except FileNotFoundError:
        skipped['dtam_missing'] = 1

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

    # Spatial concentration across Thailand (250 m micro-cluster & 1 km corridor hub)
    def dist_m(lat1, lng1, lat2, lng2):
        dx = (lng2 - lng1) * 111320 * math.cos(math.radians((lat1 + lat2) * 0.5))
        dy = (lat2 - lat1) * 110540
        return math.hypot(dx, dy)

    grid = collections.defaultdict(list)
    for idx_p, p in enumerate(places):
        grid[(int(p['y'] * 100), int(p['x'] * 100))].append(idx_p)

    for idx_p, p in enumerate(places):
        gy, gx = int(p['y'] * 100), int(p['x'] * 100)
        n250, n1000 = 0, 0
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                for j in grid.get((gy + dy, gx + dx), ()):
                    if j == idx_p:
                        continue
                    q = places[j]
                    d = dist_m(p['y'], p['x'], q['y'], q['x'])
                    if d <= 250:
                        n250 += 1
                    if d <= 1000:
                        n1000 += 1
        p['hub250m'] = n250
        p['hub1km'] = n1000

        g = list(p['g'])
        w_score = (3 if p.get('sub') == 'cafe' else 2 if p.get('sub') == 'clinic' else 1) + (3 if p.get('w') == 'yes' else 0) + (2 if p.get('h') else 0) + (1 if p.get('web') or p.get('tel') else 0)
        g[4] = str(min(9, w_score))
        p['g'] = ''.join(g)

        # Count record fields. A category or a neighbour adds no evidence about this venue.
        p['i'] = sum(bool(value) for value in (p.get('h'), p.get('web') or p.get('social'),
                                                p.get('tel'), p.get('addr')))


    # Precompute top concentrated dispensary hotspots across Thailand (1.5 km greedy clusters)
    hotspots = []
    taken = set()
    for p in sorted(places, key=lambda r: (r['hub1km'], r['i']), reverse=True):
        if p['id'] in taken or p['hub1km'] < 1:
            continue
        members = [q for q in places if dist_m(p['y'], p['x'], q['y'], q['x']) <= 1500]
        if len(members) < 2:
            continue
        for q in members:
            taken.add(q['id'])
        hotspots.append({
            'name': p['n'],
            'lat': p['y'],
            'lng': p['x'],
            'count': len(members),
            'clinics': sum(1 for q in members if q.get('sub') == 'clinic'),
            'dispensaries': sum(1 for q in members if q.get('sub') == 'dispensary'),
            'cafes': sum(1 for q in members if q.get('sub') == 'cafe'),
            'topIndex': max(q['i'] for q in members),
        })
        if len(hotspots) >= 24:
            break

    rows = []
    details = {}
    for p in places:
        flags = (bp.F_WIFI if p.get('w') == 'yes' else bp.F_NOWIFI if p.get('w') == 'no' else 0) | \
                (bp.F_HOURS if p.get('h') else 0) | (bp.F_OUTDOOR if p.get('o') else 0) | \
                (bp.F_OVERTURE if p['src'] == 'overture' else 0) | \
                (bp.F_CHAIN if p['chain'] else 0) | (bp.F_NOTABLE if p.get('notable') else 0) | \
                (bp.F_PARK if p['park'] is not None and p['park'] <= bp.PARK_M else 0)
        rows.append([p['id'], p['n'], 0, p['y'], p['x'], flags, p['g'], p['i']] + ([p['h']] if p.get('h') else []))
        p['prov'] = classify_province(p['y'], p['x'])
        has_contact = bool(p.get('web') or p.get('social') or p.get('tel'))
        p['tier'] = 'A' if p.get('sub') == 'clinic' and has_contact else 'B' if (p.get('h') and has_contact) else 'C'
        det = {k: p[k] for k in ('th', 'h', 'c', 'web', 'social', 'tel', 'ig', 'fb', 'line', 'deliv', 'take', 'wheel', 'ac', 'smoke', 'pay', 'addr', 'conf', 'ds', 'm', 'sub', 'hub250m', 'hub1km', 'prov', 'tier') if p.get(k) is not None and p.get(k) != '' and p.get(k) is not False}
        if det:
            details[p['id']] = det

    payload = {
        'kinds': ['cannabis'],
        'cols': ['id', 'name', 'kind', 'lat', 'lng', 'flags', 'metrics', 'index', 'hours?'],
        'metrics': bp.METRICS,
        'builtFrom': [
            {'name': 'OpenStreetMap (Thailand)', 'asOf': bp.OSM_AS_OF, 'licence': 'ODbL-1.0'},
            {'name': 'Overture Maps Places (Bangkok)', 'release': bp.OV_RELEASE, 'licence': 'CDLA-Permissive-2.0', 'confidenceFloor': 0.5},
            {'name': 'DTAM licensed cannabis register (data.go.th dtam-serv-002)', 'asOf': '2026-05-11', 'licence': 'Open Data Common', 'records': len(dtam) if 'dtam' in locals() else 0, 'corroborated': skipped.get('dtam_matched', 0)},
        ],
        'total': len(rows),
        'bySource': dict(collections.Counter(p['src'] for p in places)),
        'bySub': dict(collections.Counter(p.get('sub', 'dispensary') for p in places)),
        'byProvince': dict(collections.Counter(p.get('prov', 'Regional Thailand') for p in places).most_common()),
        'hotspots': hotspots,
        'rows': rows,
        'details': details,
    }
    raw = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode()
    (data / 'places-cannabis.json').write_bytes(raw)

    # The catalogue is an artefact of this builder, not a hand-kept file. Lock its
    # digest here so a later hand-edit, or a builder change nobody re-ran, is a
    # visible failure instead of a silent drift (test/cannabis-catalogue.mjs).
    manifest = {
        'file': 'places-cannabis.json',
        'bytes': len(raw),
        'sha256': hashlib.sha256(raw).hexdigest(),
        'total': payload['total'],
        'bySource': payload['bySource'],
        'bySub': payload['bySub'],
        'byProvince': payload['byProvince'],
        'builtFrom': payload['builtFrom'],
        'builder': 'python3 scripts/build-cannabis.py',
        'sourceContract': {
            'osm': {'file': bp.OSM_PBF.name, 'md5': bp.OSM_MD5, 'asOf': bp.OSM_AS_OF, 'licence': 'ODbL-1.0'},
            'overture': {'file': bp.OV_FILE.name, 'release': bp.OV_RELEASE, 'licence': 'CDLA-Permissive-2.0'},
            'dtam': {'file': DTAM_CSV.name, 'md5': DTAM_HASH, 'asOf': '2026-05-11', 'licence': 'Open Data Common', 'url': 'https://data.go.th/dataset/dtam-serv-002'},
        },
        'note': 'CL;UB only. The signed PL;UB catalogue (places-work.json) is never written here. DTAM corroborates mapped venues by name + district; no coordinates are inferred.',
    }
    (data / 'manifest-cannabis.json').write_bytes(
        json.dumps(manifest, ensure_ascii=False, indent=1).encode() + b'\n')

    print(json.dumps({
        'total': payload['total'],
        'bySource': payload['bySource'],
        'bySub': payload['bySub'],
        'bytes': len(raw),
        'sha256': manifest['sha256'],
    }, indent=2))

if __name__ == '__main__':
    build()
