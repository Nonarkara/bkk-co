// A source-ID seed is not a branch match. Media remains optional name-search discovery.
import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';import{createRequire}from'node:module';
createRequire(import.meta.url)('../public/talk-media.js');const M=globalThis.TalkMedia;
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url))),data=await read('public/data/talk-media.json'),manifest=await read('public/data/manifest.json');
const ids=new Set((await Promise.all(['work','food'].map(async k=>(await read('public/data/places-'+k+'.json')).rows))).flat().map(r=>r[0]));
const bytes=await readFile(new URL('../public/data/talk-media.json',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.sidecars['talk-media'].sha256);
M.use(data);assert.equal(data.entries.length,157);assert.equal(data.entries.reduce((n,e)=>n+e.videos.length,0),361);
for(const e of data.entries){if(e.location_status==='catalogue_seed')assert(ids.has(e.place_id));else assert.equal(e.place_id,null);for(const v of e.videos){assert.equal(v.platform,'youtube');assert.equal(M.youtubeEmbed(v),`https://www.youtube-nocookie.com/embed/${v.video_id}`)}}
const seed=data.entries.find(e=>e.place_id==='o9655e5b0ff0b');assert(seed.videos.some(v=>v.title.includes('Central World')),'Fixture catches real incoming wrong-branch match');
const slot=M.section(seed.place_id);assert(slot.includes('branch identity is unverified'));assert(slot.includes('data-talk-discover'));assert(!slot.includes('<iframe'));assert(!slot.includes('Central World'),'Unverified videos are not automatically attached to a venue sheet');
const block=M.block(seed);assert(!block.includes('<iframe'));assert(block.includes('Load YouTube player'));assert(block.includes('branch unverified'));assert(block.includes('Loading contacts YouTube'));
assert(!M.player({...seed.videos[0],video_id:'<bad>',embed_url:'https://evil.example/embed'}).includes('data-talk-video'));
assert(!M.player({...seed.videos[0],url:'javascript:alert(1)',channel_url:'https://youtube.com.evil.example/'}).includes('youtube.com.evil.example'));
const closed=data.entries.find(e=>e.id==='hidden-kamabokocoffeecamp');assert.equal(closed.place_id,null);assert(M.block(closed).includes('historical'));assert(M.listItem(closed).includes('Closed · May 2022'));assert(!M.listItem(closed).includes('data-talk-place'));
assert.equal(M.forPlace('unknown'),null);console.log('Talk-media:157entries/361videos, exact current seedIDs, no inferred branch match/pin, no automatic player, allowlisted click-to-load and closed-history labels pass.');
