#!/usr/bin/env python3
"""Enrich existing pins only, from the reviewed CC0 snapshot. No network at build time."""
import collections, json, math, pathlib, re, unicodedata
ROOT = pathlib.Path(__file__).resolve().parent.parent
SNAPSHOT = ROOT / 'data/atp-cafe-amazon.json'

def amazon(name):
    name = ''.join(c for c in unicodedata.normalize('NFKD', name).casefold() if not unicodedata.combining(c))
    name = re.sub(r'[\W_]+', '', name)
    return name.startswith(('cafeamazon', 'คาเฟอเมซอน', 'คาเฟ่อเมซอน'))

def distance(a, b):
    return math.hypot((a['y']-b['y'])*111320, (a['x']-b['x'])*111320*math.cos(math.radians(a['y'])))

def match(places, records):
    """Recognized same-brand cafes ≤30m, unique in BOTH directions; never nearest-only."""
    places = [p for p in places if p['k']=='cafe' and p.get('src')!='hand' and amazon(p['n'])]
    edges, targets = collections.defaultdict(list), collections.Counter()
    for source in records:
        candidates = [p for p in places if distance(p,source)<=30]
        edges[source['id']] = candidates
        for p in candidates: targets[p['id']] += 1
    return [(s, edges[s['id']][0]) for s in records if len(edges[s['id']])==1 and targets[edges[s['id']][0]['id']]==1]

def enrich(data_dir=None):
    data_dir = pathlib.Path(data_dir or ROOT/'public/data')
    snapshot = json.loads(SNAPSHOT.read_text()); records=snapshot['records']
    assert len({s['id'] for s in records}) == len(records), 'duplicate source IDs'
    assert snapshot['licence']=='CC0-1.0'
    places=[]
    for name in ('work','food'):
        d=json.loads((data_dir/f'places-{name}.json').read_text())
        for r in d['rows']:
            places.append(dict(id=r[0],n=r[1],k=d['kinds'][r[2]],y=r[3],x=r[4],src='hand' if r[5]&128 else 'mapped'))
    cells={}; counts=collections.Counter(); applied=[]
    matches=match(places,records)
    for s,p in matches:
        key=f"{math.floor(p['y']*20)}-{math.floor(p['x']*20)}"
        if key not in cells:
            path=data_dir/'cells'/f'{key}.json';cells[key]=json.loads(path.read_text()) if path.exists() else {}
        detail=cells[key].setdefault(p['id'],{})
        added=[]
        for field in ('addr','tel'):
            value=(s.get(field) or '').strip()
            previous=detail.get('enrichment',{}).get(field,{})
            if value and (not detail.get(field) or previous.get('id')==s['id'] and detail[field]==value[:500]):
                detail[field]=value[:500]
                detail.setdefault('enrichment',{})[field]=dict(source='AllThePlaces · Café Amazon',id=s['id'],ref=s['ref'],branch=s['branch'],url=snapshot['sourceUrl'],asOf=snapshot['asOf'],run=snapshot['run'],distanceM=round(distance(p,s),1),licence='CC0-1.0')
                counts[field]+=1;added.append(field)
        if added:applied.append(dict(place=p['id'],source=s['id'],fields=added))
    for key,detail in cells.items():
        (data_dir/'cells'/f'{key}.json').write_text(json.dumps(detail,ensure_ascii=False,separators=(',',':')))
    report=dict(source=snapshot['url'],sha256=snapshot['sha256'],asOf=snapshot['asOf'],licence=snapshot['licence'],records=len(records),matched=len(matches),filled=dict(counts),places=applied,rule='same brand, cafe, ≤30m, unique both directions; missing fields only; pins/rankings unchanged')
    (data_dir/'enrichment.json').write_text(json.dumps(report,ensure_ascii=False,indent=1)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='places'},ensure_ascii=False))
if __name__=='__main__':enrich()
