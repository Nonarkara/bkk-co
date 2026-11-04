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

def tidy(addr):
    # keep what names the place (road, mall, soi), drop what only locates a door: house numbers, floors, units, codes
    a = re.sub(r'\(.*?\)', ' ', addr)
    a = re.sub(r'\b\d+(?:st|nd|rd|th)?\s*(?:Fl\.?|Floor|ชั้น)(?=\W|$)|(?:Fl\.?|Floor|ชั้น)\s*\d+\w*', ' ', a, flags=re.I)
    a = re.sub(r'\b(?:Unit|Room|No\.?|เลขที่)\s*[\w/,\-]+', ' ', a, flags=re.I)
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
    return out.strip(' ,.-')

def main():
    rows = [r for f in ('work', 'food') for r in json.loads((DATA / f'places-{f}.json').read_text())['rows']]
    detail = {}
    for p in glob.glob(str(DATA / 'cells' / '*.json')): detail.update(json.loads(pathlib.Path(p).read_text()))
    atlas = json.loads((DATA / 'atlas-places.json').read_text())
    district_of = {r[0]: r[1] for r in atlas['rows']}
    geo = json.loads((DATA / 'atlas-geo.json').read_text())
    district = {f['properties']['id']: re.sub(r'\s*District$', '', f['properties']['name']) for f in geo['districts']['features']}
    same = collections.Counter(r[1].strip().casefold() for r in rows)
    out = {}
    for r in rows:
        if same[r[1].strip().casefold()] < 2: continue  # a unique name needs no label
        addr = (detail.get(r[0]) or {}).get('addr')
        label = tidy(addr) if addr else ''
        if not label or label.casefold() in r[1].casefold():
            label = district.get(district_of.get(r[0]), '')
        if label: out[r[0]] = label
    (DATA / 'branches.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    print('labels', len(out), 'of', sum(1 for r in rows if same[r[1].strip().casefold()] >= 2), 'repeated-name places')

if __name__ == '__main__':
    main()
