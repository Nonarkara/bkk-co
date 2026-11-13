#!/usr/bin/env python3
"""Independent raw-snapshot check of the shipped street world (local source cache required).

The geometry that ships must be the OpenStreetMap geometry, byte for byte: no moved
footprint, no invented street node, no invented junction, no widened café association.
This test reads the pinned snapshot's own extraction cache and compares it to what the
repository ships, area by area. It is not in CI because it needs the 329MB local snapshot,
but it must still run — a check that cannot run is not a check.
"""
import importlib.util,json,pathlib,math,xml.etree.ElementTree as ET
from shapely.geometry import shape,Point
from shapely.ops import transform
from pyproj import Transformer
ROOT=pathlib.Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('street_build',ROOT/'scripts/build-street-world.py');M=importlib.util.module_from_spec(spec);spec.loader.exec_module(M)
d=json.loads((ROOT/'public/data/street-world.json').read_text());cache=M.C.SOURCE_DIR/d['manifest']['cacheKey']
# The provenance key must name the extraction that actually holds this geometry.
# It used to be carried over from an older manifest, naming a five-area cache
# that held none of the other seven neighbourhoods' source geometry.
ispec=importlib.util.spec_from_file_location('street_index',ROOT/'scripts/write-street-world-index.py');I=importlib.util.module_from_spec(ispec);ispec.loader.exec_module(I)
area_list=json.loads((ROOT/'public/data/street-areas.json').read_text())['areas']
assert d['manifest']['cacheKey']==I.cache_key(area_list,d['manifest']['md5']),'Manifest names the wrong source extraction cache'
assert cache.is_dir(),'The named extraction cache does not exist'
for a in area_list:
 for ext in ('.osm.pbf','.xml','.seq'):assert (cache/(a['id']+ext)).exists(),'Missing source for '+a['id']+ext
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
buildings={};streets={};junctions={};source_ways={};source_nodes={};source_buildings={}
for area in area_list:
 aid=area['id'];shipped=json.loads((ROOT/'public/data/street-world'/f'{aid}.json').read_text())
 root=ET.parse(cache/(aid+'.xml')).getroot()
 for n in root.findall('node'):source_nodes['n'+n.get('id')]=[float(n.get('lon')),float(n.get('lat'))]
 for w in root.findall('way'):source_ways['w'+w.get('id')]={'refs':['n'+n.get('ref') for n in w.findall('nd')],'tags':{t.get('k'):t.get('v') for t in w.findall('tag')}}
 for line in (cache/(aid+'.seq')).open():
  f=json.loads(line.strip('\x1e\n'));p=f['properties'];source_buildings[p['@type'][0]+str(p['@id'])]=f
 for f in shipped['buildings']['features']:
  assert f['id'] not in buildings,'Building shipped twice';buildings[f['id']]=f
 for f in shipped['streets']['features']:
  assert f['id'] not in streets,'Street shipped twice';streets[f['id']]=f
 for nid,j in shipped['junctions'].items():
  assert nid not in junctions,'Junction shipped twice';junctions[nid]=j
assert set(buildings)=={f['id'] for a in area_list for f in json.loads((ROOT/'public/data/street-world'/f"{a['id']}.json").read_text())['buildings']['features']}
for fid,f in buildings.items():
 s=source_buildings[fid];assert f['geometry']==s['geometry'],fid+' geometry moved'
 for k,v in f['properties']['tags'].items():assert s['properties'][k]==v
 h=f['properties']['heightM']
 if h is not None:assert s['properties'][f['properties']['heightBasis']]==f['properties']['tags'][f['properties']['heightBasis']]
 # A height may never appear where the source has none.
 if h is None:assert f['properties']['heightBasis'] is None
for fid,f in streets.items():
 p=f['properties'];w=source_ways[p['sourceID']];refs=p['nodeIDs'];source=w['refs'];start=next(i for i in range(len(source)) if source[i:i+len(refs)]==refs)
 assert start>=0 and source[start:start+len(refs)]==refs,'Invented way-node join'
 assert f['geometry']['coordinates']==[source_nodes[n] for n in refs]
 for key in ('access','foot'):assert p[key]==w['tags'].get(key,'unknown')
 assert p['highway']==w['tags']['highway']
for nid,j in junctions.items():assert [j['x'],j['y']]==source_nodes[nid]
# Exact café/source-line proximity in the original projected coordinates.
rows=json.loads((ROOT/'public/data/places-work.json').read_text())['rows'];places={r[0]:Point(*F(r[4],r[3])) for r in rows if r[2]==0}
for f in streets.values():
 line=transform(F,shape(f['geometry']))
 for pid in f['properties']['cafeIDs']:assert line.distance(places[pid])<=40.0001
# The manifest must agree with what actually shipped.
assert d['manifest']['buildingCount']==len(buildings)
assert d['manifest']['explicitHeightCount']==sum(1 for f in buildings.values() if f['properties']['heightM'] is not None)
assert d['manifest']['renderedHeightCount']==sum(1 for f in buildings.values() if f['properties']['render3D'])
print('Raw pinned-source equality: every footprint, street vertex/ref run, shared junction and 40m cafe association pass; bad height/access inputs rejected; manifest agrees with the shipped geometry.')
