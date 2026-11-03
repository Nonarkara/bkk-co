#!/usr/bin/env node
// Validate curated branch evidence before publishing the runtime copy.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export function validateEvidence(data,catalogue){
 const sources=new Map(data.sources.map(s=>[s.id,s]));
 assert.equal(sources.size,data.sources.length,'Duplicate evidence source ID');
 const ids=new Set(),attrs=['editorial','discussion','architecture','shophouse'];
 for(const s of sources.values()){
  assert.equal(new URL(s.url).protocol,'https:');assert(s.title&&s.publisher&&s.checked_at&&s.evidence_type);
  assert(s.published_at===null||/^\d{4}-\d{2}-\d{2}$/.test(s.published_at),'Unknown publication date must remain null');
 }
 for(const p of data.places){
  assert(!ids.has(p.place_id),'Duplicate evidence place');ids.add(p.place_id);
  const row=catalogue.get(p.place_id);assert(row,'Evidence must resolve to an existing catalogue pin');assert.equal(row[2],0,'Evidence cohort is cafés');
  assert(p.evidence.length,'Evidence requires source entries');const editorial=new Set(),discussion=new Set(),supported=new Set();
  for(const e of p.evidence){
   const s=sources.get(e.source_id);assert(s,'Unknown source ID');assert.equal(e.source_url,s.url);assert.equal(e.evidence_type,s.evidence_type);assert.equal(e.published_at,s.published_at);
   assert(e.checked_at&&e.identity?.publisher_location&&e.identity?.catalogue_location&&e.identity?.reason,'Branch identity evidence required');
   assert.equal(e.identity.catalogue_name,row[1],'Identity must match the existing catalogue name');
   assert(Array.isArray(e.attributes));for(const a of e.attributes){assert(attrs.includes(a),'Unknown evidence attribute');supported.add(a)}
   if(e.evidence_type==='public_discussion'){
    discussion.add(e.source_url);assert(e.attributes.includes('discussion'));assert(!e.attributes.includes('editorial'),'Discussion is not publisher coverage');assert(e.comment_url,'Discussion needs a comment/thread permalink');
   }else{editorial.add(e.source_url);assert(e.attributes.includes('editorial'))}
   if(e.attributes.some(a=>a==='architecture'||a==='shophouse'))assert(e.attribute_basis?.trim(),'Built-form attributes require explicit source basis');
  }
  assert.equal(p.editorial_count,editorial.size,'Publisher pages counted distinctly');assert.equal(p.discussion_count,discussion.size,'Threads counted distinctly');
  for(const a of attrs){assert.equal(typeof p.attributes[a],'boolean');assert.equal(p.attributes[a],supported.has(a),'Attribute must have supporting evidence')}
 }
 return data;
}
async function main(){
 const rows=(await Promise.all(['work','food'].map(async s=>JSON.parse(await readFile(path.join(root,`public/data/places-${s}.json`),'utf8')).rows))).flat();
 const data=validateEvidence(JSON.parse(await readFile(path.join(root,'data/atlas-evidence.json'),'utf8')),new Map(rows.map(r=>[r[0],r])));
 await writeFile(path.join(root,'public/data/atlas-evidence.json'),JSON.stringify(data,null,2)+'\n');
 console.log(`Published ${data.places.length} verified café evidence records from ${data.sources.length} sources.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
