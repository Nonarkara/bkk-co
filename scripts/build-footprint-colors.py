#!/usr/bin/env python3
"""Retain unchanged pinned OSM Polygon components containing catalogue points.
No nearest joins, geometry simplification, footprint inflation or inferred heights.
Requires osmium-tool and Shapely2; source cache remains outside the repository.
"""
import gzip, hashlib, json, pathlib, subprocess
from shapely.geometry import Point, Polygon
from shapely import STRtree
ROOT=pathlib.Path(__file__).resolve().parent.parent
CACHE=ROOT.parent/'source-cache'
MD5='215e1ff30fe4d4adef2db3d664dab9da'
SOURCE=CACHE/'thailand-261024.osm.pbf'
DUMP=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'))
def sha(p,algorithm='sha256'):
    h=hashlib.new(algorithm)
    with p.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()
def main():
    assert sha(SOURCE,'md5')==MD5,'Pinned source changed'
    filtered=CACHE/'footprint-colors-215e1ff3.pbf';seq=filtered.with_suffix('.seq')
    if not filtered.exists():subprocess.run(['osmium','tags-filter',str(SOURCE),'wr/building','-o',str(filtered),'--no-progress'],check=True)
    if not seq.exists():subprocess.run(['osmium','export',str(filtered),'-f','geojsonseq','-a','type,id','--geometry-types','polygon','-o',str(seq),'--no-progress'],check=True)
    files=[ROOT/'public/data'/('places-'+k+'.json') for k in ('work','food')]
    rows=[r for f in files for r in json.loads(f.read_text())['rows']]
    points=[Point(r[4],r[3]) for r in rows];tree=STRtree(points)
    features=[];matched=set();components=invalid=0
    for line in seq.open():
        f=json.loads(line.strip('\x1e\n'));props=f['properties'];g=f['geometry']
        if props.get('building') in (None,'','no'):continue
        polygons=[g['coordinates']] if g['type']=='Polygon' else g['coordinates'] if g['type']=='MultiPolygon' else []
        source=props['@type'][0]+str(props['@id'])
        for component,rings in enumerate(polygons):
            components+=1;p=Polygon(rings[0],rings[1:])
            if not p.is_valid or p.is_empty:invalid+=1;continue
            ids=sorted(rows[int(i)][0] for i in tree.query(p) if p.contains(points[int(i)]))
            if not ids:continue
            matched.update(ids)
            features.append({'type':'Feature','id':source+':'+str(component),'properties':{'sourceID':source,'component':component,'cataloguePlaceIDs':ids},'geometry':{'type':'Polygon','coordinates':rings}})
    features.sort(key=lambda f:f['id'])
    manifest={'version':1,'source':'OpenStreetMap','sourceURL':'https://download.geofabrik.de/asia/thailand-261024.osm.pbf','asOf':'2026-10-24T20:20:51Z','sourceMD5':MD5,'license':'ODbL-1.0','attribution':'© OpenStreetMap contributors','licenseURL':'https://www.openstreetmap.org/copyright','crs':'EPSG:4326','catalogueSHA256':{p.name:sha(p) for p in files},'join':'strict Polygon contains of original catalogue point, holes/boundaries excluded; unchanged source ring coordinates; each disconnected component joined independently','height':'No height assigned: flat footprint overlay only','sourceComponentsChecked':components,'invalidComponentsSkipped':invalid,'matchedPlaceCount':len(matched),'cataloguePlaceCount':len(rows),'unmatchedPlaceCount':len(rows)-len(matched),'featureCount':len(features)}
    data={'type':'FeatureCollection','manifest':manifest,'features':features};raw=DUMP(data).encode();compressed=len(gzip.compress(raw,mtime=0))
    print(DUMP({'bytes':len(raw),'gzipBytes':compressed,'features':len(features)}),flush=True)
    assert len(raw)<=3_500_000 and compressed<=750_000,'Review size budget before shipping'
    (ROOT/'public/data/footprint-colors.json').write_bytes(raw)
    print(DUMP({'bytes':len(raw),'gzipBytes':compressed,**manifest}))
if __name__=='__main__':main()
