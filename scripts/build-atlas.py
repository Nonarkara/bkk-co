#!/usr/bin/env python3
"""Additive, offline atlas. Requires osmium, Shapely>=2, pyproj; never writes the catalogue.
Run python3 scripts/build-atlas.py. Cached extracts outside Git are keyed to the pinned PBF.
"""
import collections, hashlib, importlib.util, json, pathlib, subprocess
from shapely.geometry import shape, mapping, box, Point, Polygon
from shapely.ops import transform, unary_union
from shapely import STRtree
from pyproj import Transformer

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('places_contract', ROOT/'scripts/build-places.py')
contract = importlib.util.module_from_spec(spec); spec.loader.exec_module(contract)
CACHE = contract.SOURCE_DIR
BOUNDS = contract.BOUNDS
FORWARD = Transformer.from_crs(4326, 32647, always_xy=True).transform
BACK = Transformer.from_crs(32647, 4326, always_xy=True).transform
DUMP = lambda v: json.dumps(v, ensure_ascii=False, separators=(',', ':'))

def run(*args):
    subprocess.run(['osmium', *map(str,args), '--no-progress'], check=True)

def extract(name, filters, bounds=None):
    # MD5 verification before this function makes cached data source-identical.
    stem = CACHE / ('atlas-' + contract.OSM_MD5[:8] + '-' + name)
    seq = stem.with_suffix('.seq')
    if not seq.exists():
        pbf = stem.with_suffix('.pbf')
        run('tags-filter', contract.OSM_PBF, *filters, '-o', pbf, '--overwrite')
        if bounds:
            clipped = stem.with_suffix('.bbox.pbf')
            run('extract', pbf, '--bbox', ','.join(map(str,bounds)), '-s', 'complete_ways', '-o', clipped, '--overwrite')
            pbf = clipped
        run('export', pbf, '-f', 'geojsonseq', '-a', 'type,id', '--geometry-types', 'point,polygon', '-o', seq, '--overwrite')
    for line in seq.open():
        feature = json.loads(line.strip('\x1e\n'))
        p = feature['properties']; feature['id'] = p['@type'][0] + str(p['@id'])
        yield feature

def compact_geometry(g, tolerance):
    # Topology-preserving simplification for display only. Joins use original geometry.
    geom = mapping(transform(BACK, transform(FORWARD,g).simplify(tolerance,preserve_topology=True)))
    def rounded(c):
        return [round(x,5) for x in c] if isinstance(c[0],(int,float)) else [rounded(x) for x in c]
    geom['coordinates'] = rounded(geom['coordinates'])
    assert shape(geom).is_valid and not shape(geom).is_empty
    return geom

def feature(fid,p,g,tolerance):
    return {'type':'Feature','id':fid,'properties':p,'geometry':compact_geometry(g,tolerance)}

def main():
    assert contract.sha(contract.OSM_PBF,'md5') == contract.OSM_MD5, 'Unreviewed OSM source'
    files = [ROOT/'public/data'/f'places-{s}.json' for s in ('work','food')]
    fingerprints = {p.name:contract.sha(p) for p in files}
    rows = [r for p in files for r in json.loads(p.read_text())['rows']]
    assert len(rows)==57538 and len({r[0] for r in rows})==57538
    bbox = box(*BOUNDS)
    admins=[]
    for f in extract('admin',['r/boundary=administrative']):
        p=f['properties']
        if p.get('admin_level') not in ('4','6') or f['geometry']['type'] not in ('Polygon','MultiPolygon'): continue
        g=shape(f['geometry'])
        if g.intersects(bbox):
            assert g.is_valid
            admins.append((f['id'],p,g))
    provinces=[a for a in admins if a[1]['admin_level']=='4']
    bangkok=next(a for a in provinces if a[1].get('ISO3166-2')=='TH-10')
    districts=[]
    for fid,p,g in admins:
        if p['admin_level']!='6': continue
        province=max(provinces,key=lambda a:g.intersection(a[2]).area)
        is_bkk=province[0]==bangkok[0]
        districts.append((fid,p,g,province,is_bkk))
    districts.sort(key=lambda d:(not d[4],d[1].get('name:en',''),d[0]))
    assert sum(d[4] for d in districts)==50
    district_tree=STRtree([d[2] for d in districts])
    # 0.03 degree padding exceeds 2km in both axes here, preventing edge truncation
    # of the only proximity we publish. Keep complete park geometries, never centroids.
    padded=[BOUNDS[0]-.03,BOUNDS[1]-.03,BOUNDS[2]+.03,BOUNDS[3]+.03]
    parks=[]; attributes={}; ids={r[0] for r in rows}
    for f in extract('features',['nwr/leisure=park,nature_reserve,garden','nwr/amenity=cafe,restaurant,coworking_space,library','nwr/office=coworking'],padded):
        p=f['properties']; g=shape(f['geometry']); fid=f['id']
        if fid in ids:
            tags={k:v for k,v in p.items() if (k=='building' and v in ('retail','terrace','shop_house','shophouse')) or k=='heritage' or k.startswith(('heritage:','architecture','building:architecture'))}
            if tags: attributes[fid]={'sourceID':fid,'tags':tags}
        if p.get('leisure') not in ('park','nature_reserve') or g.geom_type not in ('Polygon','MultiPolygon'): continue
        if p.get('access') not in (None,'yes','permissive','designated'): continue
        if not g.is_valid or g.is_empty or not g.intersects(box(*padded)): continue
        parks.append((fid,p,g,transform(FORWARD,g)))
    parks.sort(key=lambda a:a[0]); park_tree=STRtree([p[3] for p in parks])
    assert parks
    joins=[]; counts=collections.defaultdict(collections.Counter); multi=0; outside=0
    near_count=0
    for r in rows:
        point=Point(r[4],r[3]); candidates=district_tree.query(point,predicate='intersects')
        # Shared border points are deterministic; never nearest-centroid assignments.
        hits=sorted((int(i) for i in candidates),key=lambda i:districts[i][0])
        multi+=len(hits)>1
        district=districts[hits[0]][0] if hits else None
        outside+=not bool(hits)
        pp=transform(FORWARD,point); idx=int(park_tree.nearest(pp)); distance=pp.distance(parks[idx][3])
        park_id=parks[idx][0] if distance<=2000 else None
        metres=round(distance) if park_id else None
        near_count+=bool(park_id)
        joins.append([r[0],district,park_id,metres])
        counts[district]['total']+=1; counts[district][contract.KINDS[r[2]]]+=1
        if r[2]==0 and not (r[5]&32): counts[district]['independentCafes']+=1
        if park_id and r[2]==0: counts[district]['cafesWithin2kmPark']+=1
    district_features=[]
    for fid,p,g,province,is_bkk in districts:
        pr={'id':fid,'code':fid,'codeSystem':'OpenStreetMap relation ID','sourceID':fid,
            'name':p.get('name:en') or p['name'],'nameTh':p.get('name:th') or p.get('name'),
            'province':province[1].get('name:en') or province[1]['name'], 'provinceCode':province[1].get('ISO3166-2'),
            'bangkok':is_bkk,'areaKm2':round(transform(FORWARD,g).area/1e6,3),
            'catalogueAreaKm2':round(transform(FORWARD,g.intersection(bbox)).area/1e6,3),
            'counts':dict(counts[fid])}
        district_features.append(feature(fid,pr,g,30))
    park_features=[feature(fid,{'id':fid,'sourceID':fid,'name':p.get('name:en') or p.get('name'),
        'nameTh':p.get('name:th') or p.get('name'),'kind':p['leisure'],
        'access':p.get('access','unknown'),'areaKm2':round(pg.area/1e6,4)},g,12) for fid,p,g,pg in parks]
    manifest={'version':1,'built':'2026-11-03','source':'OpenStreetMap','sourceURL':contract.OSM_URL,
        'asOf':contract.OSM_AS_OF,'md5':contract.OSM_MD5,'license':'ODbL-1.0',
        'attribution':'© OpenStreetMap contributors','licenseURL':'https://www.openstreetmap.org/copyright',
        'crs':'EPSG:4326','distanceCRS':'EPSG:32647','bounds':BOUNDS,
        'catalogueSHA256':fingerprints,'catalogueTotal':len(rows),
        'districtCodeSystem':'OpenStreetMap relation IDs; official district codes unavailable in this extract',
        'districtJoin':'Catalogue point covered by original OSM level6 polygon; border ties lowest lexical OSM ID',
        'parkDistance':'Metres to original mapped park/nature_reserve polygon, zero inside; only <=2000m published; straight-line proximity, no entrance or walking claim',
        'parkAccess':'Excludes explicit private/no/customers; unknown is not evidence of public access',
        'displaySimplificationMetres':{'district':30,'park':12},
        'counts':{'bangkokDistricts':50,'surroundingDistricts':len(districts)-50,'parks':len(parks),'places':len(rows),
                  'unassignedDistrict':outside,'borderTies':multi,'within2kmPark':near_count,'explicitVenueAttributes':len(attributes)}}
    geo={'manifest':manifest,'districts':{'type':'FeatureCollection','features':district_features},
         'parks':{'type':'FeatureCollection','features':park_features}}
    joined={'manifest':{'version':1,'catalogueTotal':len(rows),'catalogueSHA256':fingerprints,
                        'asOf':contract.OSM_AS_OF,'license':'ODbL-1.0','geo':'atlas-geo.json'},
            'cols':['placeID','districtID','parkID','parkDistanceM'],'rows':joins,'attributes':attributes}
    target=ROOT/'public/data'
    for name,data in [('atlas-geo.json',geo),('atlas-places.json',joined)]:
        (target/name).write_text(DUMP(data))
    assert all(contract.sha(p)==fingerprints[p.name] for p in files), 'Catalogue changed'
    assert sum(c['total'] for c in counts.values())==57538
    assert all((j[2] is None)==(j[3] is None) for j in joins)
    # Edge regression fixtures distinguish polygon/edge distance from centroid distance.
    long_park=box(0,0,1000,100)
    assert long_park.distance(Point(5,50))==0
    assert long_park.distance(Point(-10,50))==10
    assert long_park.centroid.distance(Point(-10,50))==510
    with_hole=Polygon([(0,0),(100,0),(100,100),(0,100)],holes=[[(40,40),(60,40),(60,60),(40,60)]])
    assert with_hole.distance(Point(50,50))==10
    # Original mapped geometry: interior park distance=0 and district boundary covered.
    for _,_,g,pg in parks:
        assert pg.distance(pg.representative_point())==0
    for _,_,g,_,_ in districts:
        assert g.covers(Point(g.exterior.coords[0])) if g.geom_type=='Polygon' else g.covers(Point(g.geoms[0].exterior.coords[0]))
    print(DUMP({'manifest':manifest,'bytes':{n:(target/n).stat().st_size for n in ('atlas-geo.json','atlas-places.json')}}))

if __name__=='__main__': main()
