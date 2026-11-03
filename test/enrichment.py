import importlib.util, pathlib, json, hashlib, tempfile, shutil
root=pathlib.Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('enrich',root/'scripts/enrich-places.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
p=dict(id='n1',n='Café Amazon',k='cafe',x=100.5,y=13.7,src='osm');s=dict(id='a',x=100.5,y=13.7)
assert m.match([p],[s])==[(s,p)]
for other in [dict(p,n='Independent Café'),dict(p,k='restaurant'),dict(p,src='hand'),dict(p,x=100.501)]:assert not m.match([other],[s])
assert not m.match([p,dict(p,id='n2')],[s]),'ambiguous target must reject'
assert not m.match([p],[s,dict(s,id='b')]),'ambiguous source must reject'
assert m.amazon('คาเฟ่ อเมซอน สาขาX')
with tempfile.TemporaryDirectory() as tmp:
 d=pathlib.Path(tmp)/'data';shutil.copytree(root/'public/data',d)
 before={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in d.glob('places-*.json')}
 originals={f.name:json.loads(f.read_text()) for f in (d/'cells').glob('*.json')}
 m.enrich(d);once={f.name:f.read_bytes() for f in (d/'cells').glob('*.json')};report=(d/'enrichment.json').read_bytes();m.enrich(d)
 assert report==(d/'enrichment.json').read_bytes(),'idempotent audit'
 assert all(f.read_bytes()==once[f.name] for f in (d/'cells').glob('*.json'))
 assert before=={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in d.glob('places-*.json')},'pins/hours/rankings immutable'
 for f in (d/'cells').glob('*.json'):
  current_cell=json.loads(f.read_text())
  for pid,detail in originals[f.name].items():
   current=current_cell[pid]
   assert all(current[k]==v for k,v in detail.items()),'existing facts preserved'
report=json.loads((root/'public/data/enrichment.json').read_text());assert report['filled']['addr']>0 and report['filled']['tel']>0
print('Unique brand/location matching, ambiguity/distance rejection, immutable catalogue, original facts and repeatable enrichment pass.')
