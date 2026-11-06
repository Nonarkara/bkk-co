#!/usr/bin/env python3
"""Offline journey support, additive to the pinned catalogue. Requires osmium, Shapely2, pyproj.
Station coordinates are original railway=station nodes, never entrances or inferred centroids.
"""
import collections, importlib.util, json, pathlib, subprocess, xml.etree.ElementTree as ET
from shapely.geometry import shape, Point, box, mapping
from shapely.ops import transform
from shapely import STRtree
from pyproj import Transformer
ROOT=pathlib.Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('contract',ROOT/'scripts/build-places.py')
C=importlib.util.module_from_spec(spec);spec.loader.exec_module(C)
F=Transformer.from_crs(4326,32647,always_xy=True).transform
B=Transformer.from_crs(32647,4326,always_xy=True).transform
DUMP=lambda d:json.dumps(d,ensure_ascii=False,separators=(',',':'))
PARK_M=150

def run(*args):subprocess.run(['osmium',*map(str,args),'--no-progress'],check=True)
def cache(name,filters,geometry=None,padding=None,relations=False):
 stem=C.SOURCE_DIR/('journey-'+C.OSM_MD5[:8]+'-'+name)
 result=stem.with_suffix('.osm' if relations else '.seq')
 if not result.exists():
  pbf=stem.with_suffix('.pbf');run('tags-filter',C.OSM_PBF,*filters,*(['-R'] if relations else []),'-o',pbf,'--overwrite')
  if padding:
   padded=[C.BOUNDS[0]-padding,C.BOUNDS[1]-padding,C.BOUNDS[2]+padding,C.BOUNDS[3]+padding]
   clipped=stem.with_suffix('.bbox.pbf');run('extract',pbf,'--bbox',','.join(map(str,padded)),'-s','complete_ways','-o',clipped,'--overwrite');pbf=clipped
  if relations:run('cat',pbf,'-f','osm','-o',result,'--overwrite')
  else:run('export',pbf,'-f','geojsonseq','-a','type,id','--geometry-types',geometry,'-o',result,'--overwrite')
 return result

def features(path):
 for l in path.open():
  f=json.loads(l.strip('\x1e\n'));p=f['properties'];f['id']=p['@type'][0]+str(p['@id']);yield f

def relation_rows(path):
 for r in ET.parse(path).getroot().findall('relation'):
  yield 'r'+r.get('id'),{t.get('k'):t.get('v') for t in r.findall('tag')},[m.get('type')[0]+m.get('ref') for m in r.findall('member')]

def systems(tags):
 # No code-prefix or geographic inference. Only explicit source network/operator/line names.
 text=' '.join(tags.get(k,'') for k in ('network','network:en','operator','operator:en','name:en'))
 out=set()
 if any(k in text for k in ('BTS','BTSC','บีทีเอส')) or tags.get('operator')=='ระบบขนส่งมวลชนกรุงเทพ':out.add('BTS')
 if 'MRT' in text or 'Metropolitan Rapid Transit' in text:out.add('MRT')
 if tags.get('network')=='ARL' or 'Airport Rail Link' in text:out.add('ARL')
 return out

def station_ineligibility(tags):
 reasons=[]
 if {v.strip() for v in tags.get('access','').split(';')} & {'no','private','permit','military'}:reasons.append('explicit restricted station access')
 inactive=('disused','proposed','construction','abandoned','demolished')
 if tags.get('railway') in inactive or tags.get('station') in inactive:reasons.append('explicit inactive railway/station status')
 for life in inactive:
  if any(tags.get(k) not in (None,'','no','false','0') for k in (life,life+':railway',life+':public_transport','railway:'+life)):
   reasons.append('explicit '+life+' status')
 return reasons

def access_class(tags):
 access=tags.get('access')
 if access in ('no','private'):return 'private_or_no'
 if access=='customers':return 'customers'
 if access in ('yes','permissive','designated'):return 'access_tagged'
 if access:return 'other_restriction'
 return 'unknown'

def display(g):
 if g.geom_type=='Point':return mapping(g)
 geom=mapping(transform(B,transform(F,g).simplify(30,preserve_topology=True)))
 def rounded(c):return [round(x,5) for x in c] if isinstance(c[0],(int,float)) else [rounded(v) for v in c]
 geom['coordinates']=rounded(geom['coordinates']);assert shape(geom).is_valid
 return geom

def main():
 assert C.sha(C.OSM_PBF,'md5')==C.OSM_MD5
 data=ROOT/'public/data';files=[data/f'places-{s}.json' for s in ('work','food')];hashes={p.name:C.sha(p) for p in files}
 rows=json.loads(files[0].read_text())['rows']
 expected=sum(n for kind,n in json.loads((data/'manifest.json').read_text())['kinds'].items() if kind!='restaurant')
 assert len(rows)==expected and len({r[0] for r in rows})==expected
 work_ids={r[0] for r in rows}
 routefile=cache('routes',['r/route=subway,train,light_rail,monorail'],relations=True)
 routes={};member_routes=collections.defaultdict(set)
 for rid,t,members in relation_rows(routefile):
  routes[rid]=t
  for member in members:member_routes[member].add(rid)
 area_routes=collections.defaultdict(set);area_ids=collections.defaultdict(list)
 for rid,t,members in relation_rows(cache('stopareas',['r/public_transport=stop_area'],relations=True)):
  associated=set().union(*(member_routes[m] for m in members))
  for member in members:area_routes[member].update(associated);area_ids[member].append(rid)
 stationfile=cache('stations',['n/railway=station'],geometry='point')
 stations=[]
 for f in features(stationfile):
  t=f['properties'];name=t.get('name:en') or t.get('name');fid=f['id'];x,y=f['geometry']['coordinates']
  if not name:continue
  refs=sorted(member_routes[fid]|area_routes[fid]);sys=systems(t);basis=[]
  if sys:basis.append({'sourceID':fid,'systems':sorted(sys)})
  for rid in refs:
   rsys=systems(routes[rid]);sys.update(rsys)
   if rsys:basis.append({'sourceID':rid,'systems':sorted(rsys)})
  tags={k:v for k,v in t.items() if not k.startswith('@')}
  stations.append({'id':fid,'sourceID':fid,'x':x,'y':y,'name':name,'nameTh':t.get('name:th') or t.get('name'),
                   'systems':sorted(sys),'systemBasis':basis,'lines':refs,'stopAreaIDs':area_ids[fid],
                   'eligible':not bool(station_ineligibility(t)),'ineligibility':station_ineligibility(t),
                   'network':t.get('network'),'operator':t.get('operator:en') or t.get('operator'),'ref':t.get('ref'),'tags':tags})
 stations.sort(key=lambda s:s['id']);eligible_stations=[s for s in stations if s['eligible']]
 rail_points=[transform(F,Point(s['x'],s['y'])) for s in eligible_stations];rail_tree=STRtree(rail_points)
 bts=[s for s in eligible_stations if 'BTS' in s['systems']];assert bts
 bts_points=[transform(F,Point(s['x'],s['y'])) for s in bts];bts_tree=STRtree(bts_points)
 origins=[];parking=[]
 extra=cache('extra',['nwr/amenity=parking','n/shop=hairdresser,barber'],geometry='point,polygon',padding=.002)
 bbox=box(*C.BOUNDS)
 for f in features(extra):
  t=f['properties'];g=shape(f['geometry']);fid=f['id'];tags={k:v for k,v in t.items() if not k.startswith('@')}
  if t.get('shop') in ('hairdresser','barber') and g.geom_type=='Point' and bbox.covers(g):
   name=t.get('name:en') or t.get('name')
   if name:origins.append({'id':fid,'sourceID':fid,'name':name,'nameTh':t.get('name:th') or t.get('name'),'x':g.x,'y':g.y,'kind':'hairdresser','tags':tags})
  if t.get('amenity')!='parking' or not g.is_valid or g.is_empty:continue
  parking.append({'id':fid,'tags':tags,'geometry':g,'projected':transform(F,g),'accessClass':access_class(tags)})
 parking.sort(key=lambda p:p['id']);park_tree=STRtree([p['projected'] for p in parking])
 unrestricted=[p for p in parking if p['accessClass'] in ('access_tagged','unknown')]
 unrestricted_tree=STRtree([p['projected'] for p in unrestricted])
 public_parking=[p for p in parking if p['accessClass']=='access_tagged']
 public_tree=STRtree([p['projected'] for p in public_parking])
 parking_by_id={p['id']:p for p in parking}
 venue_tags={}
 # This exact snapshot extraction is also used by the atlas; it contains complete venue ways.
 venuefile=C.SOURCE_DIR/('atlas-'+C.OSM_MD5[:8]+'-features.seq')
 if not venuefile.exists():venuefile=cache('venues',['nwr/amenity=cafe,restaurant,coworking_space,library','nwr/office=coworking'],geometry='point,polygon',padding=.002)
 for f in features(venuefile):
  if f['id'] not in work_ids:continue
  tags={k:v for k,v in f['properties'].items() if k in ('socket','power_supply','electricity','parking','capacity:parking','access','fee','air_conditioning','alcohol','serves:alcohol') or k.startswith(('socket:','power_supply:','electricity:','internet_access','parking:','access:'))}
  if tags:venue_tags[f['id']]={'sourceID':f['id'],'tags':tags}
 joins=[];used_stations=set();used_parking=set();close_parking=set();counts=collections.Counter()
 for r in rows:
  pp=transform(F,Point(r[4],r[3]));ri=int(rail_tree.nearest(pp));bi=int(bts_tree.nearest(pp))
  rail=eligible_stations[ri];bs=bts[bi];rail_m=round(pp.distance(rail_points[ri]));bts_m=round(pp.distance(bts_points[bi]));used_stations.update((rail['id'],bs['id']))
  def nearest(tree,pool):
   if not pool:return None,None
   idx=int(tree.nearest(pp));p=pool[idx];distance=pp.distance(p['projected'])
   if distance>PARK_M:return None,None
   used_parking.add(p['id'])
   if distance<=30:close_parking.add(p['id'])
   return p['id'],round(distance)
  park_id,park_m=nearest(park_tree,parking);open_id,open_m=nearest(unrestricted_tree,unrestricted)
  public_id,public_m=nearest(public_tree,public_parking)
  joins.append([r[0],rail['id'],rail_m,bs['id'],bts_m,park_id,park_m,open_id,open_m,public_id,public_m])
  if park_id:counts['nearestAnyParkingAccess_'+parking_by_id[park_id]['accessClass']]+=1
  if public_id:counts['workplacesWithin150mExplicitAccessParking']+=1
  if park_id:counts['workplacesWithin150mAnyParking']+=1
  if open_id:counts['workplacesWithin150mParkingNotExplicitlyRestricted']+=1
  if park_id and park_m<=30:counts['workplacesWithinRounded30mAnyParking']+=1
  if rail_m<=800:counts['workplacesWithinRounded800mRail']+=1
  if bts_m<=800:counts['workplacesWithinRounded800mBTS']+=1
 # Publish all station nodes within padded region, plus every referenced closest station.
 stationwindow=box(C.BOUNDS[0]-.05,C.BOUNDS[1]-.05,C.BOUNDS[2]+.05,C.BOUNDS[3]+.05)
 published_stations=[s for s in stations if s['id'] in used_stations or stationwindow.covers(Point(s['x'],s['y']))]
 used_routes={rid for s in published_stations for rid in s['lines']}
 published_routes={rid:{k:v for k,v in routes[rid].items() if k in ('name','name:en','name:th','network','operator','operator:en','ref','route','colour','from','to')} for rid in sorted(used_routes)}
 park_metadata={p['id']:{'sourceID':p['id'],'tags':p['tags'],'accessClass':p['accessClass']} for p in parking if p['id'] in used_parking}
 # Parking shapes are optional display evidence. Joins always use original geometries.
 park_geometries={p['id']:display(p['geometry']) for p in parking if p['id'] in close_parking}
 manifest={'version':1,'built':'2026-11-07','source':'OpenStreetMap','sourceURL':C.OSM_URL,'asOf':C.OSM_AS_OF,'md5':C.OSM_MD5,
  'license':'ODbL-1.0','attribution':'© OpenStreetMap contributors','licenseURL':'https://www.openstreetmap.org/copyright',
  'crs':'EPSG:4326','distanceCRS':'EPSG:32647','catalogueSHA256':hashes,'bounds':C.BOUNDS,'workplaceTotal':len(rows),
  'stationMeaning':'Named railway=station source nodes, including mainline rail. Nearest joins exclude explicit access no/private/permit/military and inactive proposed/construction/disused/abandoned/demolished stations; retained metadata marks eligible=false. Missing access is unknown, not proof of public access. Coordinates are station points, not entrances. Distances are straight-line, no walking/transfer/step-free inference.',
  'btsMeaning':'Explicit source network/operator or directly associated route via stop_area membership. All named Thai station nodes are searched, no nearest-centroid or station-code-prefix classification.',
  'lineMeaning':'OSM route relation IDs linked directly or through explicit stop_area membership. Directional relations may repeat a line. Missing association stays unknown.',
  'originMeaning':'Named original shop=hairdresser/barber node points inside catalogue bounds only. No polygon centroids/geocoding/availability claim.',
  'parkingMeaning':'Shortest straight-line to original amenity=parking geometry, zero inside; only <=150m. Closest-any, closest-not-explicitly-restricted and closest-explicit-yes/permissive/designated are distinct. Neither means venue-owned, on-site, available or reachable parking.',
  'parkingAccessMeaning':{'access_tagged':'access yes/permissive/designated in OSM; availability/fees not assured','customers':'access customers; relationship to this venue unknown','private_or_no':'access private/no; not a parking recommendation','other_restriction':'other explicit access restriction','unknown':'No access tag; not proof of public access'},
  'parkingDisplayMeaning':'Geometry only for referenced parking within30m of at least one workplace; polygon display simplified30m. Metadata for every referenced parking remains in journey-places.json; distance always uses original geometry.',
  'counts':{'stations':len(published_stations),'eligibleStations':sum(s['eligible'] for s in published_stations),'ineligibleStations':sum(not s['eligible'] for s in published_stations),'stationsBySystem':dict(collections.Counter(sys for s in published_stations for sys in s['systems'])),
            'routes':len(published_routes),'origins':len(origins),'parkingExamined':len(parking),'parkingReferenced':len(park_metadata),'parkingDisplayGeometries':len(park_geometries),
            'venueTags':len(venue_tags),**dict(counts)}}
 geo={'manifest':manifest,'stations':published_stations,'routes':published_routes,'origins':sorted(origins,key=lambda o:o['id']),'parkingGeometry':park_geometries}
 join={'manifest':{'version':1,'geo':'journey-geo.json','asOf':C.OSM_AS_OF,'license':'ODbL-1.0','workplaceTotal':len(rows),'catalogueSHA256':hashes,'built':manifest['built']},
       'workCols':['placeID','railID','railM','btsID','btsM','parkingID','parkingM','parkingNotRestrictedID','parkingNotRestrictedM','parkingExplicitAccessID','parkingExplicitAccessM'],
       'workRows':joins,'venueTags':venue_tags,'parking':park_metadata}
 # Keep geo bounded: retain all origins/stations; if necessary parking shapes move to join file.
 if len(DUMP(geo).encode())>500000:
  join['parkingGeometry']=park_geometries;geo['parkingGeometry']={}
  manifest['parkingDisplayMeaning']+=' Parking geometry is stored in journey-places.json to bound the station/origin payload.'
 assert len(DUMP(geo).encode())<=500000
 for name,obj in [('journey-geo.json',geo),('journey-places.json',join)]: (data/name).write_text(DUMP(obj)+'\n')
 assert all(C.sha(p)==hashes[p.name] for p in files)
 assert len(joins)==expected and {r[0] for r in joins}==work_ids
 station_ids={s['id'] for s in published_stations}
 for r in joins:
  assert r[1] in station_ids and r[3] in station_ids
  assert next(s for s in published_stations if s['id']==r[1])['eligible']
  assert next(s for s in published_stations if s['id']==r[3])['eligible']
  for i in (5,7,9):assert (r[i] is None)==(r[i+1] is None) and (r[i] is None or r[i] in park_metadata)
 # Regression against polygon-centroid/containment mistakes.
 rectangle=box(0,0,1000,100);assert rectangle.distance(Point(-10,50))==10 and rectangle.distance(Point(5,50))==0
 print(DUMP({'counts':manifest['counts'],'bytes':{n:(data/n).stat().st_size for n in ('journey-geo.json','journey-places.json')},'venueTagKeys':dict(collections.Counter(k for v in venue_tags.values() for k in v['tags']))}))
if __name__=='__main__':main()
