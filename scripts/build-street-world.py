#!/usr/bin/env python3
"""Bounded street previews from the pinned OSM snapshot. No inferred heights or entrances.

Reads the existing four neighbourhood anchors plus Meet's exact published point;
never changes the catalogue. New road segment endpoints are original OSM nodes.
"""
import collections, gzip, hashlib, importlib.util, json, math, pathlib, re, subprocess, xml.etree.ElementTree as ET
from shapely.geometry import Point, LineString, shape, mapping
from shapely.ops import transform
from shapely import STRtree
from pyproj import Transformer

ROOT=pathlib.Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('street_contract',ROOT/'scripts/build-places.py')
C=importlib.util.module_from_spec(spec);spec.loader.exec_module(C)
F=Transformer.from_crs(4326,32647,always_xy=True).transform
B=Transformer.from_crs(32647,4326,always_xy=True).transform
RADIUS=800
ELIGIBLE={'residential','living_street','unclassified','service','pedestrian','footway','path','steps','secondary','tertiary','secondary_link','tertiary_link','cycleway'}
RESTRICTED={'no','private','customers','permit','military'}
KEEP_TAGS=('building','building:part','height','building:height','min_height','building:min_height','building:levels','building:min_level','name','name:en','name:th')
DUMP=lambda d:json.dumps(d,ensure_ascii=False,separators=(',',':'))

def run(*args):subprocess.run(['osmium',*map(str,args),'--no-progress'],check=True)
def metres(value,allow_zero=False):
    if not isinstance(value,str):return None
    m=re.fullmatch(r'\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)?\s*',value,re.I)
    if not m:return None
    v=float(m.group(1))
    return v if math.isfinite(v) and (v>=0 if allow_zero else v>0) and v<=1000 else None

def height_info(tags):
    a,b=metres(tags.get('height')),metres(tags.get('building:height'))
    if a is not None and b is not None and abs(a-b)>.01:return None,None,None,'conflicting explicit heights'
    height=a if a is not None else b;basis='height' if a is not None else 'building:height' if b is not None else None
    if height is None:return None,None,None,None
    minimum=metres(tags.get('min_height'),True)
    if minimum is None:minimum=metres(tags.get('building:min_height'),True)
    if minimum is not None and minimum>=height:return None,None,None,'minimum is not below height'
    return height,minimum if minimum is not None else 0,basis,None

def allowed(tags):
    if tags.get('highway') not in ELIGIBLE or tags.get('area')=='yes':return False
    for key in ('access','foot'):
        if {v.strip().lower() for v in tags.get(key,'').split(';')} & RESTRICTED:return False
    return not any(tags.get(k) not in (None,'','no','false','0') for k in ('construction','proposed','disused','abandoned','demolished'))

def load_areas(rows):
    areas=[]
    for h in json.loads((ROOT/'public/data/hoods.json').read_text())['hoods']:
        a=h['anchor'];areas.append({'id':h['slug'],'name':h['name'],'nameTh':h['th'],'anchor':{'sourceID':a['id'],'x':a['x'],'y':a['y']},'radiusM':RADIUS})
    r=next(r for r in rows if r[0]=='o825832f94e7f')
    areas.append({'id':'ramkhamhaeng','name':"Meet's space · Ramkhamhaeng",'nameTh':'รามคำแหง','anchor':{'sourceID':r[0],'x':r[4],'y':r[3]},'radiusM':RADIUS})
    for a in areas:
        p=Point(*F(a['anchor']['x'],a['anchor']['y']));a['_shape']=p.buffer(RADIUS);a['_extract']=p.buffer(RADIUS+100)
        a['bounds']=list(transform(B,a['_extract']).bounds)
    return areas

def extracts(areas):
    key=hashlib.sha256(DUMP([(a['id'],a['bounds']) for a in areas]).encode()).hexdigest()[:10]
    cache=C.SOURCE_DIR/('street-world-'+C.OSM_MD5[:8]+'-'+key);cache.mkdir(exist_ok=True)
    config=cache/'extracts.json'
    config.write_text(DUMP({'directory':str(cache),'extracts':[{'output':a['id']+'.osm.pbf','bbox':a['bounds']} for a in areas]}))
    if not all((cache/(a['id']+'.osm.pbf')).exists() for a in areas):run('extract',C.OSM_PBF,'-c',config,'-s','smart','--overwrite')
    for a in areas:
        stem=cache/a['id'];filtered=stem.with_suffix('.filtered.pbf');xml=stem.with_suffix('.xml');seq=stem.with_suffix('.seq')
        if not filtered.exists():run('tags-filter',cache/(a['id']+'.osm.pbf'),'wr/building','wr/building:part','w/highway','-o',filtered,'--overwrite')
        if not xml.exists():run('cat',filtered,'-f','osm','-o',xml,'--overwrite')
        if not seq.exists():run('export',filtered,'-f','geojsonseq','-a','type,id','--geometry-types','linestring,polygon','-o',seq,'--overwrite')
        a['_xml']=xml;a['_seq']=seq
    return cache

def main():
    assert C.sha(C.OSM_PBF,'md5')==C.OSM_MD5,'Unreviewed OSM source'
    work=ROOT/'public/data/places-work.json';rows=json.loads(work.read_text())['rows'];areas=load_areas(rows);cache=extracts(areas)
    buildings={};streets={};node_positions={};suppressed=collections.Counter()
    cafes=[r for r in rows if r[2]==0];cafe_points=[Point(*F(r[4],r[3])) for r in cafes];tree=STRtree(cafe_points)
    for area in areas:
        area['placeIDs']=[r[0] for r in rows if area['_shape'].covers(Point(*F(r[4],r[3])))];area['buildingIDs']=[];area['streetIDs']=[]
        root=ET.parse(area['_xml']).getroot()
        positions={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in root.findall('node')}
        for way in root.findall('way'):
            tags={t.get('k'):t.get('v') for t in way.findall('tag')}
            if not allowed(tags):continue
            source='w'+way.get('id');refs=[n.get('ref') for n in way.findall('nd')]
            if any(n not in positions for n in refs):suppressed['incompleteWay']+=1;continue
            # Split only at existing nodes; never synthesize a boundary point or connect separate runs.
            runs=[];run_refs=[]
            for n in refs:
                inside=area['_shape'].covers(Point(*F(*positions[n])))
                if inside:run_refs.append(n)
                else:
                    if len(run_refs)>=2:runs.append(run_refs)
                    run_refs=[]
            if len(run_refs)>=2:runs.append(run_refs)
            for ns in runs:
                coords=[positions[n] for n in ns]
                if len(set(tuple(c) for c in coords))<2:continue
                fid=source+'-'+ns[0]+'-'+ns[-1];g=LineString(coords);projected=transform(F,g)
                near=sorted(cafes[int(i)][0] for i in tree.query(projected.buffer(40)) if cafe_points[int(i)].distance(projected)<=40)
                props={'sourceID':source,'name':tags.get('name:en') or tags.get('name') or '', 'nameTh':tags.get('name:th') or '',
                  'highway':tags['highway'],'access':tags.get('access','unknown'),'foot':tags.get('foot','unknown'),'surface':tags.get('surface','unknown'),
                  'nodeIDs':['n'+n for n in ns],'cafeIDs':near,'lengthM':round(projected.length,3)}
                feature={'type':'Feature','id':fid,'properties':props,'geometry':{'type':'LineString','coordinates':coords}}
                if fid in streets:assert streets[fid]==feature,'Unstable source street segment'
                streets[fid]=feature;area['streetIDs'].append(fid)
                for n in ns:node_positions['n'+n]=positions[n]
        for line in area['_seq'].open():
            f=json.loads(line.strip('\x1e\n'));tags=f['properties'];g=shape(f['geometry'])
            if not any(tags.get(k) not in (None,'','no') for k in ('building','building:part')):continue
            if g.geom_type not in ('Polygon','MultiPolygon') or not g.is_valid or g.is_empty:continue
            if not transform(F,g).intersects(area['_shape']):continue
            fid=tags['@type'][0]+str(tags['@id']);kept={k:tags[k] for k in KEEP_TAGS if k in tags}
            height,minimum,basis,warning=height_info(kept)
            props={'sourceID':fid,'heightM':height,'minHeightM':minimum,'heightBasis':basis,'isPart':tags.get('building:part') not in (None,'','no'),
             'heightWarning':warning,'tags':kept}
            feature={'type':'Feature','id':fid,'properties':props,'geometry':f['geometry']}
            if fid in buildings:assert buildings[fid]==feature,'Unstable source building'
            buildings[fid]=feature;area['buildingIDs'].append(fid)
        area['buildingIDs']=sorted(set(area['buildingIDs']));area['streetIDs']=sorted(set(area['streetIDs']))
        for key in list(area):
            if key.startswith('_'):del area[key]
    uses=collections.defaultdict(set)
    for fid,f in streets.items():
        for n in f['properties']['nodeIDs']:uses[n].add(fid)
    junctions={n:{'x':node_positions[n][0],'y':node_positions[n][1],'streetIDs':sorted(ids)} for n,ids in sorted(uses.items()) if len(ids)>1}
    features=sorted(buildings.values(),key=lambda f:f['id']);road_features=sorted(streets.values(),key=lambda f:f['id'])
    # Native extrusion must not cover mapped building parts with a second parent box.
    part_geometries=[shape(f['geometry']) for f in features if f['properties']['isPart'] and f['properties']['heightM'] is not None]
    part_tree=STRtree(part_geometries) if part_geometries else None
    displayed=set()
    for f in features:
        props=f['properties'];g=shape(f['geometry']);reason=None
        if props['heightM'] is None:reason='height unknown'
        elif not props['isPart'] and part_tree is not None and any(g.covers(part_geometries[int(i)].representative_point()) and g.intersection(part_geometries[int(i)]).area>=part_geometries[int(i)].area*.99 for i in part_tree.query(g)):
            reason='parent outline has mapped height-bearing building parts'
        signature=g.wkb
        if reason is None and signature in displayed:reason='duplicate source footprint'
        props['render3D']=reason is None;props['flatReason']=reason
        if props['render3D']:displayed.add(signature)
    known=sum(f['properties']['heightM'] is not None for f in features)
    rendered=sum(f['properties']['render3D'] for f in features)
    data={'manifest':{'version':1,'built':'2026-11-04','source':'OpenStreetMap','sourceURL':C.OSM_URL,'asOf':C.OSM_AS_OF,'md5':C.OSM_MD5,
      'license':'ODbL-1.0','attribution':'© OpenStreetMap contributors','licenseURL':'https://www.openstreetmap.org/copyright','crs':'EPSG:4326','distanceCRS':'EPSG:32647',
      'catalogueSHA256':C.sha(work),'radiusM':RADIUS,'areas':len(areas),'buildingCount':len(features),'explicitHeightCount':known,'unknownHeightCount':len(features)-known,
      'renderedHeightCount':rendered,'cacheKey':cache.name,'streetCount':len(streets),'junctionCount':len(junctions),'suppressed':dict(suppressed),
      'heightMeaning':'Only explicit positive metre height/building:height tags; no floor conversion, area/use estimate, renderer default or generated details. Unknown height remains null/flat. Missing minimum uses display ground zero only when height is known.',
      'streetMeaning':'Original OSM way-node runs inside the area, no synthetic joins or endpoints. Shared node IDs establish source topology only, not safe/legal pedestrian access. Unknown access remains unknown. Streets with explicit foot/access restrictions and fast-road/construction classes excluded.',
      'cafeMeaning':'Existing catalogue cafe points within40m straight-line of this source line; not entrances, frontage or same-side access.'},
      'areas':areas,'buildings':{'type':'FeatureCollection','features':features},'streets':{'type':'FeatureCollection','features':road_features},'junctions':junctions}
    assert all(a['buildingIDs'] and a['streetIDs'] and a['placeIDs'] for a in areas),'A known area lost its mapped source geometry'
    assert known>0 and streets and junctions,'Street world source extraction unexpectedly empty'
    raw=DUMP(data).encode();assert len(gzip.compress(raw,mtime=0))<=1_000_000,'Compressed street-world exceeds1MBbudget'
    out=ROOT/'public/data/street-world.json';out.write_bytes(raw)
    print(json.dumps({'bytes':len(raw),'gzipBytes':len(gzip.compress(raw,mtime=0)),'buildings':len(features),'explicitHeight':known,'renderedHeight':rendered,'streets':len(streets),'junctions':len(junctions),'cache':str(cache)}))

if __name__=='__main__':main()
