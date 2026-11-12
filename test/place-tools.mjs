// Catalogue re-signed 2026-11-04 after scripts/clean-catalogue.py (74 dropped, 86 twins merged after independent review; every decision in public/data/cleanup.json, old ids in aliases.json).
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);require('../public/place-tools.js');
const {normalize,matches,symbol}=globalThis.PlaceTools;
assert(matches({n:"Meet's space Cafe"},'meets space'));
assert(matches({n:"Meet’s space Café"},'space meet\'s cafe'));
assert.equal(normalize('รามคำแหง'), 'รามคําแหง'); // Thai vowel/tonal marks remain meaningful after Unicode decomposition.
assert.equal(normalize('ที่'), 'ที่');
assert.equal(PlaceTools.query("https://www.google.com/maps/place/meet's+space+cafe/data=!4m2!"),"meet's space cafe");
assert(!matches({n:'Cafe'},'car park'));
for(const kind of ['cafe','coworking','library','restaurant'])assert(symbol(kind).includes('aria-hidden="true"'));
const load=async n=>JSON.parse(await readFile(new URL('../public/data/'+n,import.meta.url)));
const work=await load('places-work.json'),food=await load('places-food.json'),manifest=await load('manifest.json');
const id='o825832f94e7f',p=work.rows.find(r=>r[0]===id);assert(p);assert.equal(p[1],"Meet's space Cafe");assert.equal(work.kinds[p[2]],'cafe');assert.deepEqual(p.slice(3,5),[13.76998,100.61656]);assert.equal(p[5],16,'No inferred Wi-Fi/parking/hours/stars');
// The reviewed 4 November cleaned catalogue excluding this one inclusion must retain its signed values.
const old={...work,rows:work.rows.filter(r=>r[0]!==id)};
assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'),'b3ae88a7f500f07f45d3d59dcdf98216dabb29c20d3a58cca50e9ce85a8ed849');
assert.equal(old.rows.length+food.rows.length,57378);assert.equal(manifest.total,57379);
const details=(await load('cells/275-2012.json'))[id];assert.equal(details.provenance.sourceID,'825832f9-4e7f-441a-af0e-eb4b86f65e6d');assert.deepEqual(details.provenance.originalPoint,[100.61656422,13.7699849]);assert.equal(details.provenance.sourceTaxonomy,'halal_restaurant');assert(!details.web);
console.log('Cleaned57,379place catalogue, reviewedMeet source correction, Unicode/token search and distinct type glyphs pass.');
