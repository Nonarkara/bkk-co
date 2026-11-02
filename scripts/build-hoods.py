#!/usr/bin/env python3
"""Operational neighbourhoods + the city-wide station leaderboard. Run after build-places.py.
Usage: python3 scripts/build-hoods.py

A neighbourhood here is not a drawn polygon (that would be invented geography). It is a
10-minute walk (800 m) around one real OSM anchor: a rail station, or a named building.
Authored stories live IN this script, each claim with a source. Every number is computed.
"""
import collections, json, math, pathlib, subprocess, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
PBF = ROOT.parent / 'source-cache' / 'thailand-261024.osm.pbf'
DATA = ROOT / 'public' / 'data'
BOUNDS = [100.30, 13.45, 100.95, 14.10]
RADIUS_M = 800  # ~10 minutes on foot
WORK = {'cafe', 'coworking', 'library'}
TRAITS = {  # Ray Oldenburg, The Great Good Place (1989)
    'neutral': 'Neutral ground', 'leveler': 'A leveller', 'talk': 'Conversation',
    'access': 'Open and easy', 'regulars': 'Regulars', 'low': 'Low profile',
    'playful': 'Playful mood', 'home': 'Home away from home'}

HOODS = [
    {'slug': 'ari', 'name': 'Ari', 'th': 'อารีย์', 'anchor': 'n5388607091', 'anchorLabel': 'BTS Ari',
     'for': 'Slow mornings', 'forTh': 'เช้าที่ไม่ต้องรีบ',
     'traits': ['regulars', 'low', 'home'],
     'plub': 'Pick a soi, order something slow, stay till lunch. Ari rewards regulars.',
     'story': [
         'Ari grew up as a residential soi neighbourhood off Phahonyothin Road, beside a cluster of government offices. The BTS reached it in 1999, and the cafés came after.',
         'Phahonyothin Soi 7 is the spine. The side sois off it hold small houses turned into coffee rooms, which is why so many places here are low-key, one room, and run by the people who own them.',
         'In Oldenburg\'s terms, Ari is about regulars and low profile: you come back to the same table, and nobody makes a fuss.'],
     'sources': [['Wikipedia: Ari, Bangkok', 'https://en.wikipedia.org/wiki/Ari,_Bangkok'],
                 ['Time Out Bangkok: Ari', 'https://www.timeout.com/bangkok/things-to-do/ari']]},
    {'slug': 'samyan', 'name': 'Sam Yan', 'th': 'สามย่าน', 'anchor': 'n12803915078', 'anchorLabel': 'MRT Sam Yan',
     'for': 'Studying past midnight', 'forTh': 'อ่านหนังสือข้ามคืน',
     'traits': ['access', 'leveler', 'neutral'],
     'plub': 'Exams? Samyan CO-OP never closes. Bring ID to register.',
     'story': [
         'Sam Yan sits between Chulalongkorn University and the old Sam Yan market. When Samyan Mitrtown opened in 2019 it put a free, 24-hour reading and working room, Samyan CO-OP, at the centre of a shopping mall.',
         'Around 500 seats, open all night, free after registration. Students, freelancers and people between shifts share the same long tables.',
         'That is Oldenburg\'s leveller and his "open and easy" in one room: nobody\'s rank matters, and the door is always open.'],
     'sources': [['Wikipedia: Samyan Mitrtown', 'https://en.wikipedia.org/wiki/Samyan_Mitrtown'],
                 ['Bangkok Post: Golden Land goes sleepless', 'https://www.bangkokpost.com/business/news/1684864/golden-land-goes-sleepless']]},
    {'slug': 'charoenkrung', 'name': 'Charoen Krung', 'th': 'เจริญกรุง', 'anchor': 'n4840964126', 'anchorLabel': 'TCDC, Grand Postal Building',
     'for': 'Crossing paths', 'forTh': 'เจอคนต่างสายงาน',
     'traits': ['talk', 'playful', 'neutral'],
     'plub': 'Walk the river side of Charoen Krung. Galleries, old shophouses, and someone always sketching.',
     'story': [
         'In May 2017 the Thailand Creative & Design Center (TCDC) moved out of a shopping mall and into the 1940 Grand Postal Building on Charoen Krung Road, with the stated aim of growing a creative district around it.',
         'The riverside stretch since filled with galleries, studios and cafés inside old shophouses, running north toward Talat Noi on the edge of Chinatown.',
         'This is Oldenburg\'s conversation and playful mood: places where a designer, a printer and a tourist end up at the same counter.'],
     'sources': [['Khaosod English: TCDC goes postal (2017)', 'https://www.khaosodenglish.com/life/arts/2017/04/05/tcdc-goes-postal-set-reopen-historic-building-river/'],
                 ['Wikipedia: General Post Office (Bangkok)', 'https://en.wikipedia.org/wiki/General_Post_Office_(Bangkok)']]},
    {'slug': 'thonglo', 'name': 'Thong Lo', 'th': 'ทองหล่อ', 'anchor': 'n5391626092', 'anchorLabel': 'BTS Thong Lo',
     'for': 'After work', 'forTh': 'หลังเลิกงาน',
     'traits': ['playful', 'regulars', 'talk'],
     'plub': 'Work till six, then just stay. Thong Lo changes shift at dusk.',
     'story': [
         'Thong Lo is Sukhumvit Soi 55, about two kilometres from Sukhumvit Road up to Phetchaburi Road. A large Japanese community nearby shaped it: Japanese restaurants, groceries and small cafés line the soi.',
         'It is built for the hours after work. Places that are quiet laptop rooms at three in the afternoon turn into somewhere to meet people by seven.',
         'Oldenburg would call it playful, with regulars: the same faces at the same counters, a different mood after dark.'],
     'sources': [['Wikipedia: Thong Lo', 'https://en.wikipedia.org/wiki/Thong_Lo']]},
]

def metres(ay, ax, by, bx):
    dy = (ay - by) * 111_320
    dx = (ax - bx) * 111_320 * math.cos(math.radians((ay + by) / 2))
    return math.hypot(dx, dy)

def osm_points():
    """Rail stations (deduplicated by name) and the hood anchors, straight from the pinned extract."""
    with tempfile.TemporaryDirectory() as tmp:
        f, c, seq = [str(pathlib.Path(tmp) / n) for n in ('f.pbf', 'c.pbf', 's.seq')]
        subprocess.run(['osmium', 'tags-filter', str(PBF), 'nwr/railway=station', 'nwr/amenity=arts_centre',
                        'nwr/office', '-o', f, '--no-progress'], check=True)
        subprocess.run(['osmium', 'extract', f, '--bbox', ','.join(map(str, BOUNDS)), '-s', 'simple', '-o', c,
                        '--no-progress'], check=True)
        subprocess.run(['osmium', 'export', c, '-f', 'geojsonseq', '-a', 'type,id', '--geometry-types', 'point',
                        '-o', seq, '--no-progress'], check=True)
        byid, stations = {}, {}
        for line in open(seq, encoding='utf-8'):
            feat = json.loads(line.strip('\x1e\n')); p = feat['properties']
            pid = p['@type'][0] + str(p['@id']); x, y = feat['geometry']['coordinates']
            byid[pid] = (y, x, p)
            if p.get('railway') == 'station' and p.get('name'):
                key = (p.get('name:en') or p['name']).strip()
                stations.setdefault(key, []).append((y, x, p))
    # one point per station name: interchange platforms collapse to their mean
    out = []
    for name, pts in stations.items():
        y = sum(p[0] for p in pts) / len(pts); x = sum(p[1] for p in pts) / len(pts)
        net = sorted({p[2].get('network') or p[2].get('station') or 'rail' for p in pts})
        out.append({'name': name, 'th': pts[0][2].get('name'), 'y': round(y, 5), 'x': round(x, 5), 'net': net})
    return byid, out

def load_places():
    rows = []
    for f in ('work', 'food'):
        d = json.loads((DATA / f'places-{f}.json').read_text())
        rows += [dict(zip(['id', 'n', 'k', 'y', 'x', 'f', 'g', 'i'], r[:8]), k=d['kinds'][r[2]], h=r[8] if len(r) > 8 else None) for r in d['rows']]
    return rows

def within(rows, y, x):
    # cheap box first, exact distance second
    dy = RADIUS_M / 111_320; dx = dy / math.cos(math.radians(y))
    return [r for r in rows if abs(r['y'] - y) <= dy and abs(r['x'] - x) <= dx and metres(y, x, r['y'], r['x']) <= RADIUS_M]

def river():
    """The Chao Phraya as line segments: a walking hop must never cross it (that needs a ferry or a bridge)."""
    with tempfile.TemporaryDirectory() as tmp:
        f, c, seq = [str(pathlib.Path(tmp) / n) for n in ('f.pbf', 'c.pbf', 'r.seq')]
        subprocess.run(['osmium', 'tags-filter', str(PBF), 'w/waterway=river', '-o', f, '--no-progress'], check=True)
        subprocess.run(['osmium', 'extract', f, '--bbox', ','.join(map(str, BOUNDS)), '-s', 'complete_ways', '-o', c, '--no-progress'], check=True)
        subprocess.run(['osmium', 'export', c, '-f', 'geojsonseq', '-o', seq, '--no-progress'], check=True)
        lines = []
        for line in open(seq, encoding='utf-8'):
            feat = json.loads(line.strip('\x1e\n')); p = feat['properties']
            if (p.get('name:en') or p.get('name') or '') in ('Chao Phraya River', 'แม่น้ำเจ้าพระยา') and feat['geometry']['type'] == 'LineString':
                lines.append([[round(x, 5), round(y, 5)] for x, y in feat['geometry']['coordinates']])
    (DATA / 'barriers.json').write_text(json.dumps({'source': 'OSM waterway=river, Chao Phraya River', 'lines': lines}, separators=(',', ':')))
    print('river ways', len(lines), 'points', sum(map(len, lines)))

def build():
    byid, stations = osm_points()
    rows = load_places()
    work_rows = [r for r in rows if r['k'] in WORK]
    area = math.pi * (RADIUS_M / 1000) ** 2

    board = []
    for s in stations:
        n = len(within(work_rows, s['y'], s['x']))
        board.append({**s, 'work': n})
    board.sort(key=lambda s: -s['work'])
    for i, s in enumerate(board): s['rank'] = i + 1
    median = sorted(s['work'] for s in board)[len(board) // 2]

    hoods = []
    for h in HOODS:
        y, x, tags = byid[h['anchor']]
        inside = within(rows, y, x)
        kinds = collections.Counter(r['k'] for r in inside)
        work = [r for r in inside if r['k'] in WORK]
        rank = 1 + sum(1 for s in board if s['work'] > len(work))
        # Plub's walk: co-working and libraries first (the point of a work map), then Wi-Fi-tagged, then by index
        def pri(r): return (0 if r['k'] in ('coworking', 'library') else 1 if r['f'] & 1 else 2, -r['i'])
        walk = [r['id'] for r in sorted(work, key=pri)[:6]]
        hoods.append({**{k: h[k] for k in ('slug', 'name', 'th', 'anchorLabel', 'for', 'forTh', 'plub', 'story', 'sources')},
                      'traits': [[t, TRAITS[t]] for t in h['traits']],
                      'anchor': {'id': h['anchor'], 'y': round(y, 5), 'x': round(x, 5), 'osmName': tags.get('name')},
                      'radius': RADIUS_M,
                      'stats': {'kinds': {k: kinds.get(k, 0) for k in ('cafe', 'coworking', 'library', 'restaurant')},
                                'work': len(work), 'perKm2': round(len(work) / area),
                                'wifiTagged': sum(1 for r in work if r['f'] & 1),
                                'hoursKnown': sum(1 for r in work if r['h']),
                                'ggp': round(sum(r['i'] for r in work) / max(1, len(work))),
                                'stationRank': rank, 'stations': len(board), 'stationMedian': median},
                      'walk': walk, 'ids': [r['id'] for r in inside]})
    out = {'radius': RADIUS_M, 'areaKm2': round(area, 2), 'traits': TRAITS, 'hoods': hoods,
           'leaderboard': [{k: s[k] for k in ('rank', 'name', 'th', 'work', 'y', 'x')} for s in board[:15]],
           'stations': len(board), 'stationMedian': median, 'stationWork': sorted(s['work'] for s in board),
           'method': f'Work spots (café, co-working, library) within {RADIUS_M} m of each OSM rail station, '
                     f'stations merged by name. Places from places-work.json.'}
    (DATA / 'hoods.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    for h in hoods:
        print(f"{h['name']:14} work {h['stats']['work']:4}  {h['stats']['kinds']}  rank {h['stats']['stationRank']}/{len(board)}")
    print('top stations:', [(s['name'], s['work']) for s in board[:8]], 'median', median)

if __name__ == '__main__':
    build()
    river()
