#!/usr/bin/env python3
"""Independent raw-snapshot check after build-street-world.py (local source cache required)."""
import importlib.util,json,pathlib,math,xml.etree.ElementTree as ET
from shapely.geometry import shape,Point
from shapely.ops import transform
from pyproj import Transformer
ROOT=pathlib.Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('street_build',ROOT/'scripts/build-street-world.py');M=importlib.util.module_from_spec(spec);spec.loader.exec_module(M)
d=json.loads((ROOT/'public/data/street-world.json').read_text());cache=M.C.SOURCE_DIR/d['manifest']['cacheKey']
# Height and access falsifiers exercise rejection boundaries, not visual resemblance.
for raw in ['12-15','~12','12 ft','40 feet','three','',None,'0','-2','1001','12;14']:
 assert M.metres(raw) is None,raw
assert M.metres('12.5 m')==12.5 and M.metres('12 metres')==12
assert M.height_info({'building:levels':'20'})[:3]==(None,None,None)
assert M.height_info({'height':'12','building:height':'14'})[0] is None
assert M.height_info({'height':'12','min_height':'15'})[0] is None
assert M.height_info({'height':'12','min_height':'3'})[:3]==(12,3,'height')
for tags in [{'highway':'footway','access':' private ;yes'},{'highway':'residential','foot':'no'},{'highway':'motorway'},{'highway':'service','construction':'yes'}]:assert not M.allowed(tags)
assert M.allowed({'highway':'residential'}) # Unknown stays explicitly unknown, not certified permission.
F=Transformer.from_crs(4326,32647,always_xy=True).transform
buildings={f['id']:f for f in d['buildings']['features']};streets={f['id']:f for f in d['streets']['features']};source_buildings={};source_ways={};source_nodes={}
for area in d['areas']:
 root=ET.parse(cache/(area['id']+'.xml')).getroot()
 for n in root.findall('node'):source_nodes['n'+n.get('id')]=[float(n.get('lon')),float(n.get('lat'))]
 for w in root.findall('way'):source_ways['w'+w.get('id')]={'refs':['n'+n.get('ref') for n in w.findall('nd')],'tags':{t.get('k'):t.get('v') for t in w.findall('tag')}}
 for line in (cache/(area['id']+'.seq')).open():
  f=json.loads(line.strip('\x1e\n'));p=f['properties'];source_buildings[p['@type'][0]+str(p['@id'])]=f
for fid,f in buildings.items():
 s=source_buildings[fid];assert f['geometry']==s['geometry'],fid+' geometry moved'
 for k,v in f['properties']['tags'].items():assert s['properties'][k]==v
 h=f['properties']['heightM']
 if h is not None:assert s['properties'][f['properties']['heightBasis']]==f['properties']['tags'][f['properties']['heightBasis']]
for fid,f in streets.items():
 p=f['properties'];w=source_ways[p['sourceID']];refs=p['nodeIDs'];source=w['refs'];start=next(i for i in range(len(source)) if source[i:i+len(refs)]==refs)
 assert start>=0 and source[start:start+len(refs)]==refs,'Invented way-node join'
 assert f['geometry']['coordinates']==[source_nodes[n] for n in refs]
 for key in ('access','foot'):assert p[key]==w['tags'].get(key,'unknown')
 assert p['highway']==w['tags']['highway']
for nid,j in d['junctions'].items():assert [j['x'],j['y']]==source_nodes[nid]
# Exact café/source-line proximity in the original projected coordinates.
rows=json.loads((ROOT/'public/data/places-work.json').read_text())['rows'];places={r[0]:Point(*F(r[4],r[3])) for r in rows if r[2]==0}
for f in streets.values():
 line=transform(F,shape(f['geometry']))
 for pid in f['properties']['cafeIDs']:assert line.distance(places[pid])<=40.0001
print('Raw pinned-source equality: every footprint, street vertex/ref run, shared junction and40m cafeassociation pass; badheight/access inputs rejected.')
