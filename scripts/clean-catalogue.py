#!/usr/bin/env python3
"""Final, idempotent catalogue clean-up. Run after build-places.py, then re-run the builders that read
the published catalogue (build-atlas.py, build-cafe-streets.py, build-journey-geo.py, build-hoods.py) so every
derived row, count and hash is recomputed, never patched.

  python3 scripts/clean-catalogue.py --dry-run   # print what would change, write nothing
  python3 scripts/clean-catalogue.py             # apply to public/data and write the audit

Three decisions, each with its evidence recorded in public/data/cleanup.json:
  drop   a listing whose own name says it has shut, or a work-kind listing whose name names
         a non-venue business (hair salon, law office, clinic) with no café/food word
  merge  the same venue listed twice: same kind, <= 8 m apart, and the same number in both names,
         or every word of one name in the other (one a real name word, not 'cafe' or 'shabu'),
         or an identical name. A shared phone line is not evidence (food courts share one).
  alias  every retired id points to its survivor (public/data/aliases.json), so shared links,
         saved visits, ratings and recommendations keep working

Survivors keep their published metrics (the reviewed-row guard in include-reviewed-place.py
pins those); only contact fields and source lists are unioned in from the twin.
"""
import collections, glob, json, math, pathlib, re, sys, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data'
DUMP = lambda d: json.dumps(d, ensure_ascii=False, separators=(',', ':'))
TWIN_M = 8

CLOSED = re.compile(r'ปิดกิจการ|ปิดถาวร|เลิกกิจการ|ปิดปรับปรุง|permanently closed|closed down|\(closed\)', re.I)
# Whole words only (Maesalong is not a salon, Hathairad is not hair). Thai terms are specific phrases.
NON_VENUE = re.compile(r'\b(?:hair|salon|barber|barbershop|nails?|beauty|clinic|dental|legal|lawyers?|consulting|'
                       r'accounting|insurance|real estate|apartments?|condo|car ?wash|used cars?|laundry|pharmacy)\b|'
                       r'ทันตกรรม|คลินิก|ร้านทำผม|ทำผม|ซาลอน|เสริมสวย|สักคิ้ว|ทนายความ|การบัญชี|สำนักงานบัญชี|ประกันชีวิต|'
                       r'อสังหาริมทรัพย์|อพาร์ทเม้นท์|คอนโด|ล้างรถ|คาร์แคร์|รถมือสอง|ซักรีด|ร้านยา', re.I)
VENUE_WORD = re.compile(r'caf[eé]|coffee|kaffe|espresso|roast|\btea\b|bake|bistro|kitchen|food|\beat|brew|snack|slow ?bar|'
                        r'amazon|starbucks|กาแฟ|คาเฟ่|คาเฟ|คอฟฟี่|ชา|ขนม|เบเกอรี่|อาหาร|ครัว|ร้านน้ำ|อเมซอน', re.I)
# Restaurants: only businesses that are unmistakably not food, and never if the name holds a food word.
NON_VENUE_STRONG = re.compile(r'\b(?:car ?wash|used cars?|salon|barber|barbershop|insurance)\b|ล้างรถ|คาร์แคร์|รถมือสอง|ประกันชีวิต|ร้านยาง|คลินิก|ซาลอน', re.I)
FOOD_WORD = re.compile(r'pasta|pizza|noodle|rice|grill|steak|burger|sushi|ramen|bbq|ก๋วยเตี๋ยว|ส้มตำ|ข้าว|หมู|ไก่|เนื้อ|ปลา|กุ้ง|ซีฟู้ด|'
                       r'บะหมี่|โจ๊ก|ขนมจีน|ชาบู|ร้านอาหาร|ตามสั่ง|ข้าง', re.I)  # 'ข้าง' = "next to": "som tam next to the clinic"
AT = re.compile(r'\s(?:at|@)\s.*$|@.*$', re.I)  # "The Fire Bear AT คอนโดลุมพินี": a location, not the business
# Words that name a dish or a kind of place: never enough on their own to call two listings the same venue
GENERIC = {'cafe', 'coffee', 'the', 'and', 'bar', 'house', 'shop', 'bangkok', 'restaurant', 'eatery', 'kitchen', 'grill',
           'shabu', 'vegetarian', 'steak', 'noodle', 'noodles', 'thai', 'food', 'bistro', 'branch', 'soi', 'koffee', 'baan'}
STOP = GENERIC | {'ร้าน', 'กาแฟ', 'คาเฟ่'}
tokens = lambda s: [t for t in re.split(r'[^a-z0-9]+', unicodedata.normalize('NFKD', s).casefold()) if t]

latin = lambda s: re.sub(r'[^a-z0-9]+', '', unicodedata.normalize('NFKD', s).casefold())
# A number that follows a place word is an address, not part of the venue's name:
# "Terminal 21", "Central Rama 9", "Sukhumvit 22", "สาขา 2" fused unrelated mall shops in the dry run.
PLACE_NUM = re.compile(r'(?:terminal|central|rama|sukhumvit|thong ?lo|thonglor|soi|ladprao|lad ?phrao|lotus|km|floor|'
                       r'branch|road|moo|เทอร์มินอล|เทอร์มินัล|เซ็นทรัล|พระราม|สุขุมวิท|ทองหล่อ|ซอย|ซ\.|ลาดพร้าว|โลตัส|สาขา|'
                       r'กม\.?|ชั้น|ถนน|หมู่|ม\.|คลอง|สุขาภิบาล|รามอินทรา|ตลาด)\s*\d+', re.I)
digits = lambda s: frozenset(re.findall(r'\d+', PLACE_NUM.sub(' ', s)))
PLACEHOLDER = re.compile(r'^[a-z]+(?:_[a-z]+)+$')  # 'food_shop': a category code, not a name
words = lambda s: {w for w in re.findall(r'[a-z]{3,}|[฀-๿]{3,}', unicodedata.normalize('NFKD', s).casefold())} - STOP

def metres(a, b):
    return math.hypot((a[3] - b[3]) * 111_320, (a[4] - b[4]) * 111_320 * math.cos(math.radians(a[3])))

def load():
    files = {f: json.loads((DATA / f'places-{f}.json').read_text()) for f in ('work', 'food')}
    cells = {pathlib.Path(p).name: json.loads(pathlib.Path(p).read_text()) for p in glob.glob(str(DATA / 'cells' / '*.json'))}
    detail = {pid: d for c in cells.values() for pid, d in c.items()}
    return files, cells, detail

def decide(files, detail):
    kinds = files['work']['kinds']
    rows = [r for f in files.values() for r in f['rows']]
    drop, merge = {}, {}
    for r in rows:
        name, kind = r[1], kinds[r[2]]
        if CLOSED.search(name):
            drop[r[0]] = {'name': name, 'rule': 'name says closed'}
        elif PLACEHOLDER.match(name.strip()) and set(name.strip().split('_')) <= GENERIC | {'entrance', 'store', 'library'}:
            drop[r[0]] = {'name': name, 'rule': 'placeholder, not a name'}
        else:
            business = AT.sub('', name)  # only the business part of the name counts
            hit = NON_VENUE_STRONG.search(business) if kind == 'restaurant' else NON_VENUE.search(business)
            if hit and not VENUE_WORD.search(name) and not (kind == 'restaurant' and FOOD_WORD.search(name)):
                drop[r[0]] = {'name': name, 'rule': f'{kind} named as a non-venue business', 'match': hit.group(0)}
    live = [r for r in rows if r[0] not in drop]
    rank = lambda r: (0 if r[0][0] == 'h' else 1 if r[0][0] in 'nwr' else 2, -r[7], -len((detail.get(r[0]) or {}).get('ds') or []))
    grid = collections.defaultdict(list)
    for r in live: grid[(int(r[3] * 4000), int(r[4] * 4000))].append(r)  # ~28 m cells
    gone = set()
    for r in sorted(live, key=rank):
        if r[0] in gone: continue
        gy, gx = int(r[3] * 4000), int(r[4] * 4000)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                for q in grid[(gy + dy, gx + dx)]:
                    if q is r or q[0] in gone or q[2] != r[2]: continue
                    d = metres(r, q)
                    if d > TWIN_M: continue
                    why = None
                    if digits(r[1]) and digits(r[1]) == digits(q[1]): why = 'same number in both names'
                    else:
                        # every word of the shorter name appears in the longer one, and at least one of them is a real name
                        ta, tb = tokens(r[1]), tokens(q[1])
                        short, long_ = sorted((ta, tb), key=len)
                        if short and set(short) <= set(long_) and any(len(t) >= 4 and t not in GENERIC for t in short):
                            why = 'every word of one name is in the other'
                        elif r[1].strip() == q[1].strip() and len(r[1].strip()) >= 4:
                            why = 'identical name'
                    if why:
                        gone.add(q[0])
                        merge[q[0]] = {'into': r[0], 'name': q[1], 'survivor': r[1], 'metres': round(d, 1), 'rule': why}
    return drop, merge

def apply(files, cells, detail, drop, merge):
    retired = set(drop) | set(merge)
    alias = {old: m['into'] for old, m in merge.items()}
    for f in files.values():
        f['rows'] = [r for r in f['rows'] if r[0] not in retired]
    for old, m in merge.items():  # union contact fields and sources into the survivor
        s, t = detail.get(m['into']), detail.get(old) or {}
        if s is None: continue
        for k in ('web', 'social', 'tel', 'addr', 'th'):
            if t.get(k) and not s.get(k): s[k] = t[k]
        if t.get('ds'): s['ds'] = sorted(set(s.get('ds') or []) | set(t['ds']))
    for name, c in cells.items():
        for pid in retired & set(c): del c[pid]
        (DATA / 'cells' / name).write_text(DUMP(c))
    for f, d in files.items(): (DATA / f'places-{f}.json').write_text(DUMP(d))
    # files keyed by place id that no builder regenerates: retire or repoint (row tables are rebuilt, see below)
    for name, fix in (('enrichment.json', lambda d: keyed_list(d, 'places', 'place', alias, retired)),
                      ('atlas-evidence.json', lambda d: keyed_list(d, 'places', 'place_id', alias, retired)),
                      ('journey-evidence.json', lambda d: keyed_dict(d, 'places', alias, retired))):
        path = DATA / name
        if path.exists(): path.write_text(DUMP(fix(json.loads(path.read_text()))))
    old_alias = json.loads((DATA / 'aliases.json').read_text()) if (DATA / 'aliases.json').exists() else {}
    old_alias.update(alias)
    (DATA / 'aliases.json').write_text(DUMP(old_alias))
    return retired

def keyed_list(d, key, field, alias, retired):
    seen, out = set(), []
    for item in d[key]:
        pid = alias.get(item[field], item[field])
        if item[field] in retired and pid == item[field]: continue      # dropped outright
        if pid in seen: continue                                        # survivor already has its own record
        seen.add(pid); out.append({**item, field: pid})
    d[key] = out
    return d

def keyed_dict(d, key, alias, retired):
    out = {}
    for pid, v in d[key].items():
        new = alias.get(pid, pid)
        if pid in retired and new == pid: continue
        out.setdefault(new, v)
    d[key] = out
    return d

def main():
    files, cells, detail = load()
    drop, merge = decide(files, detail)
    rules = collections.Counter(m['rule'] for m in merge.values())
    print(f"drop {len(drop)} · merge {len(merge)} {dict(rules)}")
    if '--dry-run' in sys.argv:
        for pid, d in list(drop.items())[:60]: print('DROP ', pid, d)
        for pid, m in list(merge.items()): print('MERGE', pid, m)
        return
    apply(files, cells, detail, drop, merge)
    m = json.loads((DATA / 'manifest.json').read_text())
    rows = [r for f in files.values() for r in f['rows']]
    kinds = files['work']['kinds']
    m['total'] = len(rows)
    m['kinds'] = dict(sorted(collections.Counter(kinds[r[2]] for r in rows).items()))
    import hashlib
    for f in ('work', 'food'):  # the published file fingerprints must describe the published files
        raw = (DATA / f'places-{f}.json').read_bytes()
        m.setdefault('files', {})[f] = {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
    prev_c = m.get('cleanup', {'dropped': 0, 'merged': 0})
    m['cleanup'] = {'dropped': prev_c['dropped'] + len(drop), 'merged': prev_c['merged'] + len(merge), 'audit': 'cleanup.json', 'aliases': 'aliases.json'}
    (DATA / 'manifest.json').write_text(json.dumps(m, indent=1, ensure_ascii=False) + '\n')
    prev = json.loads((DATA / 'cleanup.json').read_text()) if (DATA / 'cleanup.json').exists() else {'drop': {}, 'merge': {}}
    prev['drop'].update(drop); prev['merge'].update(merge)
    prev['rules'] = __doc__.split('Three decisions')[1].split('Survivors')[0].strip()
    (DATA / 'cleanup.json').write_text(DUMP(prev))
    print('total', m['total'], m['kinds'])

if __name__ == '__main__':
    main()
