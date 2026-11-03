#!/usr/bin/env python3
"""One reviewed open-data inclusion; preserve every previously shipped row/join.

Run after the base catalogue/atlas/journey build. Pinned raw sources required.
Existing 57,538 rows retain their original metrics. Only the added point is scored
against copies of the original raw catalogue using the existing scoring function.
No Google data, inferred facilities or invented location is used.
"""
import collections, copy, hashlib, importlib.util, json, math, pathlib, struct, sys
import duckdb
from shapely.geometry import Point, shape, box
from shapely.ops import transform
from shapely import STRtree

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT/'public/data'
DUMP = lambda d: json.dumps(d, ensure_ascii=False, separators=(',', ':'))
def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT/'scripts'/filename)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
C = module('reviewed_contract', 'build-places.py')
J = module('reviewed_journeys', 'build-journey-geo.py')
A = module('reviewed_atlas', 'build-atlas.py')
PID = 'o825832f94e7f'
BASE_HASH = '67fe00fb832aeb49663083b10acc21350c5f93278402c090a530e39554f71395'
FOOD_HASH = 'df43c22e5ea54a151e25c7abdda8bc6ae876114df5a5da9755625749428df29a'
def read(name): return json.loads((DATA/name).read_text())
def write(name, d): (DATA/name).write_text(DUMP(d))
def digest(raw): return hashlib.sha256(raw).hexdigest()
def without(rows): return [r for r in rows if r[0] != PID]

def main():
    decision = json.loads((ROOT/'data/reviewed-inclusions.json').read_text())['inclusions'][0]
    manifest = read('manifest.json'); work = read('places-work.json')
    base = copy.deepcopy(work); base['rows'] = without(base['rows'])
    assert digest(DUMP(base).encode()) == BASE_HASH, 'Previously shipped work rows changed'
    assert C.sha(DATA/'places-food.json') == FOOD_HASH, 'Previously shipped food rows changed'
    assert C.sha(C.OSM_PBF, 'md5') == C.OSM_MD5
    source_contract = next(s for s in manifest['builtFrom'] if s['name']=='Overture Maps Places')
    assert C.sha(C.OV_FILE) == source_contract['sha256'], 'Overture snapshot changed'
    db = duckdb.connect()
    rs = db.execute("SELECT id,names.primary,geometry,confidence,basic_category,taxonomy.primary,operating_status,socials,phones,addresses,sources FROM read_parquet(?) WHERE id=?", [str(C.OV_FILE), decision['source_id']]).fetchall()
    assert len(rs)==1
    gid,name,geom,conf,category,taxonomy,status,socials,phones,addresses,sources = rs[0]
    assert name==decision['source_name'] and category==decision['source_category'] and taxonomy==decision['source_taxonomy']
    assert status in (None, 'open') and conf>=C.OV_RULES['cafe'][1] and conf<C.OV_RULES['restaurant'][1]
    endian,kind,x,y = struct.unpack('<BI2d', geom)
    assert endian==1 and kind==1 and C.inside(x,y), 'Only original source POINT allowed'
    assert '+66972234003' in phones and 'Ramkhamhaeng 53' in addresses[0]['freeform']
    candidate={'id':PID,'n':name,'k':'cafe','y':round(y,5),'x':round(x,5),
               'conf':round(conf,2),'social':socials[0],'tel':phones[0],
               'addr':addresses[0]['freeform'],'ds':sorted({s['dataset'] for s in sources if s['dataset']!='Overture'}),'src':'overture'}
    # Source websites[0] is a Google search tracking URL, not the venue website.
    # Omit it entirely, including from footprint scoring.
    raw = C.merge(C.load_osm(collections.Counter()) + C.load_additions(), C.load_overture(), collections.Counter())
    assert len(raw)==57538 and PID not in {p['id'] for p in raw}
    raw.append(candidate)
    C.score_places(raw, C.load_stations(), C.load_parking())
    flags=C.F_OVERTURE | (C.F_CHAIN if candidate['chain'] else 0) | (C.F_PARK if candidate['park'] is not None and candidate['park']<=C.PARK_M else 0)
    row=[PID,name,0,candidate['y'],candidate['x'],flags,candidate['g'],candidate['i']]
    detail={k:candidate[k] for k in ('social','tel','addr','conf','ds','m')}
    detail['visit']='Visited by Non on 3 Nov 2026.'
    detail['provenance']={'source':'Overture Maps Places','sourceID':gid,'release':C.OV_RELEASE,'licence':'CDLA-Permissive-2.0',
      'sourceURL':'https://docs.overturemaps.org/guides/places/','sourceLocation':C.OV_URL,
      'originalPoint':[x,y],'sourceCategory':category,'sourceTaxonomy':taxonomy,'reviewedKind':'cafe','checkedAt':'2026-11-03',
      'reason':decision['reason'],'sources':decision['sources']}
    work['rows']=base['rows']+[row]; write('places-work.json',work)
    cell=f'{math.floor(candidate["y"]*C.CELL)}-{math.floor(candidate["x"]*C.CELL)}.json'
    cellpath='cells/'+cell; cell_data=read(cellpath); cell_data[PID]=detail; write(cellpath,cell_data)
    manifest['total']=57539;manifest['kinds']['cafe']=20236;manifest['bySource']['overture']=50159
    # Only this new row affects count changes. Original counters remain conserved.
    manifest['parkingNearby']=16625+int(bool(flags&C.F_PARK))
    manifest['reviewedInclusions']=[{'sourceID':gid,'placeID':PID,'kind':'cafe','decision':'data/reviewed-inclusions.json','checkedAt':'2026-11-03'}]
    for suffix in ('work','food'):
        p=DATA/f'places-{suffix}.json';manifest['files'][suffix]={'bytes':p.stat().st_size,'sha256':C.sha(p)}
    (DATA/'manifest.json').write_text(json.dumps(manifest,indent=1,ensure_ascii=False)+'\n')
    hashes={f'places-{s}.json':manifest['files'][s]['sha256'] for s in ('work','food')}
    if '--catalogue-only' in sys.argv:
        print(json.dumps({'row':row,'files':manifest['files'],'total':manifest['total']},ensure_ascii=False))
        return
    pp=transform(J.F,Point(row[4],row[3]))
    # Districts and parks use unsimplified original OSM geometries, as the base builder.
    atlas=read('atlas-geo.json'); joins=read('atlas-places.json')
    district_ids={f['id'] for f in atlas['districts']['features']}
    admins=[f for f in A.extract('admin',['r/boundary=administrative']) if f['id'] in district_ids]
    hit=sorted(f['id'] for f in admins if shape(f['geometry']).covers(Point(row[4],row[3])))
    district=hit[0] if hit else None
    parks=[];b=C.BOUNDS;padded=[b[0]-.03,b[1]-.03,b[2]+.03,b[3]+.03]
    for f in A.extract('features',['nwr/leisure=park,nature_reserve,garden','nwr/amenity=cafe,restaurant,coworking_space,library','nwr/office=coworking'],padded):
        t=f['properties'];g=shape(f['geometry'])
        if t.get('leisure') in ('park','nature_reserve') and g.geom_type in ('Polygon','MultiPolygon') and t.get('access') in (None,'yes','permissive','designated') and g.is_valid and not g.is_empty and g.intersects(box(*padded)):
            parks.append((f['id'],transform(J.F,g)))
    parks.sort(key=lambda p:p[0]);i=int(STRtree([p[1] for p in parks]).nearest(pp));distance=pp.distance(parks[i][1])
    park_id,park_m=(parks[i][0],round(distance)) if distance<=2000 else (None,None)
    atlas_row=[PID,district,park_id,park_m];already=any(r[0]==PID for r in joins['rows'])
    joins['rows']=without(joins['rows'])+[atlas_row]
    for d in (atlas,joins):d['manifest'].update({'catalogueTotal':57539,'catalogueSHA256':hashes})
    if not already:
        if district:
            counts=next(f for f in atlas['districts']['features'] if f['id']==district)['properties']['counts']
            for key in ('total','cafe'):counts[key]=counts.get(key,0)+1
            if not flags&C.F_CHAIN:counts['independentCafes']=counts.get('independentCafes',0)+1
            if park_id:counts['cafesWithin2kmPark']=counts.get('cafesWithin2kmPark',0)+1
        atlas['manifest']['counts']['places']+=1
        atlas['manifest']['counts']['within2kmPark']+=int(bool(park_id))
        atlas['manifest']['counts']['unassignedDistrict']+=int(not bool(district))
        atlas['manifest']['counts']['borderTies']+=int(len(hit)>1)
    write('atlas-geo.json',atlas);write('atlas-places.json',joins)
    # The same eligible source station points and original parking polygons as journey build.
    geo=read('journey-geo.json'); journey=read('journey-places.json');already=any(r[0]==PID for r in journey['workRows'])
    stations=[s for s in geo['stations'] if s['eligible']];bts=[s for s in stations if 'BTS' in s['systems']]
    def station(pool):
        points=[transform(J.F,Point(s['x'],s['y'])) for s in pool]
        i=int(STRtree(points).nearest(pp));return pool[i]['id'],round(pp.distance(points[i]))
    rid,rm=station(stations);bid,bm=station(bts);parking=[]
    for f in J.features(J.cache('extra',['nwr/amenity=parking','n/shop=hairdresser,barber'],geometry='point,polygon',padding=.002)):
        t=f['properties'];g=shape(f['geometry'])
        if t.get('amenity')=='parking' and g.is_valid and not g.is_empty:
            tags={k:v for k,v in t.items() if not k.startswith('@')}
            parking.append({'id':f['id'],'tags':tags,'accessClass':J.access_class(tags),'geometry':g,'projected':transform(J.F,g)})
    parking.sort(key=lambda p:p['id'])
    def nearest(pool):
        if not pool:return None,None
        i=int(STRtree([p['projected'] for p in pool]).nearest(pp));p=pool[i];distance=pp.distance(p['projected'])
        if distance>J.PARK_M:return None,None
        journey['parking'][p['id']]={k:p[k] for k in ('tags','accessClass')};journey['parking'][p['id']]['sourceID']=p['id']
        if distance<=30:geo['parkingGeometry'][p['id']]=J.display(p['geometry'])
        return p['id'],round(distance)
    aid,am=nearest(parking);oid,om=nearest([p for p in parking if p['accessClass'] in ('access_tagged','unknown')]);pid,pm=nearest([p for p in parking if p['accessClass']=='access_tagged'])
    journey_row=[PID,rid,rm,bid,bm,aid,am,oid,om,pid,pm]
    journey['workRows']=without(journey['workRows'])+[journey_row]
    for d in (geo,journey):d['manifest'].update({'workplaceTotal':20721,'catalogueSHA256':hashes})
    counts=geo['manifest']['counts'];counts['parkingReferenced']=len(journey['parking']);counts['parkingDisplayGeometries']=len(geo['parkingGeometry'])
    if not already:
        increments={'workplacesWithin150mExplicitAccessParking':bool(pid),'workplacesWithin150mAnyParking':bool(aid),'workplacesWithin150mParkingNotExplicitlyRestricted':bool(oid),'workplacesWithinRounded30mAnyParking':aid is not None and am<=30,'workplacesWithinRounded800mRail':rm<=800,'workplacesWithinRounded800mBTS':bm<=800}
        if aid:increments['nearestAnyParkingAccess_'+journey['parking'][aid]['accessClass']]=True
        for k,v in increments.items():counts[k]=counts.get(k,0)+int(v)
    write('journey-geo.json',geo);write('journey-places.json',journey)
    # Run build-cafe-streets.py separately to recompute its bounded ranked street
    # publication. Never relabel an old street cohort without recomputing its joins.
    print(json.dumps({'row':row,'detail':detail,'atlasRow':atlas_row,'journeyRow':journey_row,'files':manifest['files'],'total':57539},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
