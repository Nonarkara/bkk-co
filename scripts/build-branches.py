#!/usr/bin/env python3
"""Branch labels for places whose name alone cannot tell them apart ("Starbucks Coffee" x many).
Run after clean-catalogue.py and build-atlas.py:  python3 scripts/build-branches.py

Label = the listing's own published address (tidied), or else its OSM district. Never invented:
a place with neither gets no label. Written to public/data/branches.json as {id: label}; the
catalogue rows and their pinned hashes are untouched.
"""
import collections, glob, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data'
MAX = 34

ZERO_WIDTH = re.compile(r'[\u200b-\u200d\ufeff]')
PLUS_CODE = re.compile(r'\b[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b')
DANGLING = re.compile(r'\s+(?:ถนน|ถ\.|ซอย|ซ\.|ต\.|อ\.|จ\.|แขวง|เขต|ตำบล|อำเภอ|Soi|Rd|Road|Moo|Km\.?)$', re.I)
squash = lambda s: re.sub(r'[\s\-_.]+', '', s).casefold()

def readable(label):
    """A label must contain a word: not just numbers, not a Plus Code."""
    return bool(re.search(r'[A-Za-z\u0e00-\u0e7f]{2,}', label)) and not PLUS_CODE.search(label)

def tidy(addr):
    # keep what names the place (road, mall, soi), drop what only locates a door: house numbers, floors, units, codes
    a = re.sub(r'\(.*?\)', ' ', ZERO_WIDTH.sub('', addr)).replace('"', ' ').replace('“', ' ').replace('”', ' ')
    a = PLUS_CODE.sub(' ', a)
    a = re.sub(r'\b\d+(?:st|nd|rd|th)?\s*(?:Fl\.?|Floor|ชั้น)(?=\W|$)|(?:Fl\.?|Floor|ชั้น)\s*\d+\w*', ' ', a, flags=re.I)
    a = re.sub(r'(?:\b(?:Unit|Room|Shop|No\.?)|ห้องเลขที่|เลขที่|ล็อค|ล็อก)\s*[\w/,\-]+(?:\s+\d+\b)?', ' ', a, flags=re.I)
    a = re.sub(r'^\s*\d[\d/,\-]*(?=\s|,|$)|(?:^|\s)\d+/[\d/\-]+(?=\s|,|$)', ' ', a)  # leading or slashed house numbers only; "Soi 42" stays
    a = re.sub(r'\s*,\s*', ' ', a)
    a = re.sub(r'\bRd\.?(?=\s|$)', 'Rd', a.strip())
    a = re.sub(r'\bRoad\b', 'Rd', a, flags=re.I)
    words, seen = [], set()
    for w in a.split():
        k = w.casefold().strip('.,')
        if k in seen: continue  # "Sathupradit Rd Sathupradit Rd" -> "Sathupradit Rd"
        seen.add(k); words.append(w)
    out = ''
    for w in words:
        if len(out) + len(w) + 1 > MAX: break
        out = f'{out} {w}'.strip()
    out = out.strip(' ,.-')
    for _ in range(3): out = DANGLING.sub('', out).strip(' ,.-')  # "… ถนน", "… Soi" say nothing on their own
    out = re.sub(r'^\d[\d/,\-]*\s+', '', out)  # a house number left at the front after a unit code went
    return out

def main():
    rows = [r for f in ('work', 'food') for r in json.loads((DATA / f'places-{f}.json').read_text())['rows']]
    detail = {}
    for p in glob.glob(str(DATA / 'cells' / '*.json')): detail.update(json.loads(pathlib.Path(p).read_text()))
    atlas = json.loads((DATA / 'atlas-places.json').read_text())
    district_of = {r[0]: r[1] for r in atlas['rows']}
    geo = json.loads((DATA / 'atlas-geo.json').read_text())
    district = {f['properties']['id']: re.sub(r'\s*District$', '', f['properties']['name']) for f in geo['districts']['features']}
    # every district name, English and Thai, to catch an address that names a different area than the pin
    names_of = {}
    for f in geo['districts']['features']:
        pr = f['properties']
        for n in (pr.get('name') or '', pr.get('nameTh') or ''):
            core = re.sub(r'^(?:เขต|อำเภอ|Amphoe)\s*|\s*District$', '', n).strip()
            if len(core) >= 4: names_of.setdefault(pr['id'], set()).add(squash(core))
    same = collections.Counter(r[1].strip().casefold() for r in rows)
    out = {}
    for r in rows:
        if same[r[1].strip().casefold()] < 2: continue  # a unique name needs no label
        here = district_of.get(r[0])
        addr = (detail.get(r[0]) or {}).get('addr')
        label = tidy(addr) if addr else ''
        flat = squash(label)
        elsewhere = any(n in flat for d, ns in names_of.items() if d != here for n in ns)
        if not label or not readable(label) or label.casefold() in r[1].casefold() or elsewhere:
            label = district.get(here, '')  # the pin's own district: never an area the pin is not in
        if label: out[r[0]] = label
    # two places that still share name and label: add the district where it tells them apart
    pair = collections.Counter((r[1].strip().casefold(), out.get(r[0])) for r in rows if r[0] in out)
    for r in rows:
        lab = out.get(r[0]); d = district.get(district_of.get(r[0]), '')
        if lab and pair[(r[1].strip().casefold(), lab)] > 1 and d and d.casefold() not in lab.casefold():
            out[r[0]] = f'{lab} · {d}'
    (DATA / 'branches.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    print('labels', len(out), 'of', sum(1 for r in rows if same[r[1].strip().casefold()] >= 2), 'repeated-name places')

if __name__ == '__main__':
    main()
