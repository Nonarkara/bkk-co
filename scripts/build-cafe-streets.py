#!/usr/bin/env python3
"""Offline real OSM street segments near existing café pins; never a walking network.
Requires osmium, Shapely>=2 and pyproj. Run python3 scripts/build-cafe-streets.py.
"""
import collections, importlib.util, json, pathlib, subprocess
from shapely.geometry import Point, shape, mapping, box
from shapely.ops import transform
from shapely import STRtree
from pyproj import Transformer

ROOT=pathlib.Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('catalogue_contract',ROOT/'scripts/build-places.py')
contract=importlib.util.module_from_spec(spec); spec.loader.exec_module(contract)
FORWARD=Transformer.from_crs(4326,32647,always_xy=True).transform
BACK=Transformer.from_crs(32647,4326,always_xy=True).transform
DUMP=lambda d:json.dumps(d,ensure_ascii=False,separators=(',',':'))
ALLOWED={'primary','primary_link','secondary','secondary_link','tertiary','tertiary_link','residential','unclassified','service','living_street','pedestrian','footway','cycleway','path','steps','road','track'}
LIMIT=300; MAX_BYTES=500000; DISTANCE=40

def run(*args): subprocess.run(['osmium',*map(str,args),'--no-progress'],check=True)

def source():
    stem=contract.SOURCE_DIR/('atlas-'+contract.OSM_MD5[:8]+'-roads')
    seq=stem.with_suffix('.seq')
    if not seq.exists():
        pbf=stem.with_suffix('.pbf'); clipped=stem.with_suffix('.bbox.pbf')
        run('tags-filter',contract.OSM_PBF,'w/highway','-o',pbf,'--overwrite')
        b=contract.BOUNDS; padded=[b[0]-.0005,b[1]-.0005,b[2]+.0005,b[3]+.0005]
        run('extract',pbf,'--bbox',','.join(map(str,padded)),'-s','complete_ways','-o',clipped,'--overwrite')
        run('export',clipped,'-f','geojsonseq','-a','type,id','--geometry-types','linestring','-o',seq,'--overwrite')
    for line in seq.open(): yield json.loads(line.strip('\x1e\n'))

def main():
    assert contract.sha(contract.OSM_PBF,'md5')==contract.OSM_MD5
    catalogues=[ROOT/'public/data'/f'places-{s}.json' for s in ('work','food')]
    fingerprints={p.name:contract.sha(p) for p in catalogues}
    all_rows=[r for p in catalogues for r in json.loads(p.read_text())['rows']]
    assert len(all_rows)==57538 and len({r[0] for r in all_rows})==57538
    cafes=sorted((r for r in all_rows if r[2]==0),key=lambda r:r[0]); assert len(cafes)==20235
    points=[transform(FORWARD,Point(r[4],r[3])) for r in cafes]; tree=STRtree(points)
    joins=json.loads((ROOT/'public/data/atlas-places.json').read_text())
    district_by_place={r[0]:r[1] for r in joins['rows']}
    geodata=json.loads((ROOT/'public/data/atlas-geo.json').read_text())
    bkk={f['id'] for f in geodata['districts']['features'] if f['properties']['bangkok']}
    b=contract.BOUNDS; window=box(b[0]-.0005,b[1]-.0005,b[2]+.0005,b[3]+.0005)
    features=[]; eligible=0; seen=set()
    for f in source():
        p=f['properties']; name=(p.get('name:en') or p.get('name') or '').strip()
        if not name or p.get('highway') not in ALLOWED: continue
        if p.get('access') in ('private','no','customers') or p.get('foot') in ('no','private','customers'): continue
        fid='w'+str(p['@id'])
        if fid in seen: continue
        seen.add(fid); g=shape(f['geometry'])
        if g.geom_type!='LineString' or not g.is_valid or not g.intersects(window): continue
        eligible+=1; projected=transform(FORWARD,g)
        ix=sorted(map(int,tree.query(projected,predicate='dwithin',distance=DISTANCE)))
        if not ix: continue
        ids=[cafes[i][0] for i in ix]
        # Verify actual original line distances for every published match.
        assert all(projected.distance(points[i])<=DISTANCE for i in ix)
        clipped=g.intersection(window)
        display=mapping(transform(BACK,transform(FORWARD,clipped).simplify(5,preserve_topology=True)))
        def rounded(c): return [round(x,6) for x in c] if isinstance(c[0],(int,float)) else [rounded(x) for x in c]
        display['coordinates']=rounded(display['coordinates'])
        assert shape(display).geom_type in ('LineString','MultiLineString') and shape(display).is_valid
        properties={'id':fid,'sourceID':fid,'name':name,'nameTh':p.get('name:th') or p.get('name'),
                    'highway':p['highway'],'count':len(ids),'independentCount':sum(not(cafes[i][5]&32) for i in ix),
                    'cafeIDs':ids,'districtIDs':sorted({district_by_place[k] for k in ids if district_by_place.get(k)}),
                    'access':p.get('access','unknown'),'foot':p.get('foot','unknown')}
        features.append({'type':'Feature','id':fid,'properties':properties,'geometry':display})
    features.sort(key=lambda f:(-f['properties']['count'],-f['properties']['independentCount'],f['id']))
    positive=len(features)
    def coverage(fs): return sorted(set(d for f in fs for d in f['properties']['districtIDs'])&bkk)
    all_coverage=coverage(features)
    manifest={'version':1,'built':'2026-11-03','source':'OpenStreetMap','sourceURL':contract.OSM_URL,
              'asOf':contract.OSM_AS_OF,'md5':contract.OSM_MD5,'license':'ODbL-1.0','attribution':'© OpenStreetMap contributors',
              'licenseURL':'https://www.openstreetmap.org/copyright','crs':'EPSG:4326','distanceCRS':'EPSG:32647',
              'bounds':contract.BOUNDS,'catalogueTotal':len(all_rows),'cafeTotal':len(cafes),'catalogueSHA256':fingerprints,
              'distanceM':DISTANCE,'displaySimplificationM':5,'displayClippedToPaddedBounds':True,
              'meaning':'Existing catalogue cafés within40m straight-line of the original named OSM way geometry. Not a walking route, entrance, safe crossing, frontage or recommendation.',
              'duplicates':'One café may be near multiple ways, parallel roads or intersection segments. Counts must not be added as unique cafés. OSM way segments with the same name remain separate.',
              'eligibility':'Named street/walkway classes; excludes motorways/trunks/construction/proposed and explicit private/no/customers access or foot restrictions. Unknown access is not permission.',
              'eligibleWays':eligible,'positiveWays':positive,'positiveBangkokDistrictCoverage':all_coverage}
    # Publish every positive segment only when the full file fits. Otherwise bounded top300.
    def payload(fs):
        manifest.update({'publishedWays':len(fs),'truncated':len(fs)<positive,
                         'selection':'All positive named ways' if len(fs)==positive else 'Top300 ways by cafe count, independent count, then lexical OSM way ID, plus highest-ranked way covering each otherwise-unrepresented Bangkok district; max350 and500000bytes',
                         'publishedBangkokDistrictCoverage':coverage(fs),
                         'uniquePublishedCafes':len({k for f in fs for k in f['properties']['cafeIDs']})})
        return DUMP({'type':'FeatureCollection','manifest':manifest,'features':fs})
    raw=payload(features)
    if len(raw.encode())>MAX_BYTES:
        ranked=features; features=ranked[:LIMIT]
        covered=set(coverage(features))
        for f in ranked[LIMIT:]:
            ds=set(f['properties']['districtIDs'])&bkk
            if ds-covered:
                features.append(f); covered.update(ds)
            if covered==set(all_coverage): break
        assert len(features)<=LIMIT+50
        raw=payload(features)
        while len(raw.encode())>MAX_BYTES and features:
            features.pop(); raw=payload(features)
    assert features and len(raw.encode())<=MAX_BYTES
    for f in features:
        p=f['properties']; assert p['count']==len(set(p['cafeIDs'])) and p['independentCount']<=p['count']
    assert all(contract.sha(p)==fingerprints[p.name] for p in catalogues)
    target=ROOT/'public/data/atlas-streets.json'; target.write_text(raw)
    print(DUMP({'manifest':manifest,'bytes':target.stat().st_size}))

if __name__=='__main__': main()
