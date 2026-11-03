// Sidecar contract: talk-media loads, closed venues stay closed, catalogue bytes do not move,
// and the place sheet markup appears only when a catalogue seed actually has a video.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('../public/talk-media.js');
const { TalkMedia } = globalThis;

const read = file => readFile(new URL(file, import.meta.url));
const EXPECTED = {
  work: '0bb9a767b51606ee5a785bf441daefe387ea50b377ff847dcd747e18296ebc30',
  food: 'df43c22e5ea54a151e25c7abdda8bc6ae876114df5a5da9755625749428df29a',
};

const manifest = JSON.parse(await read('../public/data/manifest.json'));
for (const name of ['work', 'food']) {
  const bytes = await read(`../public/data/places-${name}.json`);
  const hex = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hex, EXPECTED[name], `places-${name}.json hash moved`);
  assert.equal(hex, manifest.files[name].sha256);
  assert.equal(bytes.length, manifest.files[name].bytes);
}

const raw = await read('../public/data/talk-media.json');
const sidecar = manifest.sidecars['talk-media'];
assert.equal(sidecar.role, 'enrichment');
assert.equal(createHash('sha256').update(raw).digest('hex'), sidecar.sha256);
assert.equal(raw.length, sidecar.bytes);
assert.match(String(sidecar.note), /Not a catalogue/);

const json = JSON.parse(raw);
TalkMedia.use(json);
assert.equal(json.version, 1);
assert.equal(json.entries.length, 157);
assert.equal(json.counts.venues_with_video, 102);
assert.equal(json.counts.total_videos, 361);
assert.equal(json.counts.tiktok_candidates, 0);

const walk = value => {
  if (Array.isArray(value)) value.forEach(walk);
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!['lat', 'lng', 'latitude', 'longitude', 'coordinates'].includes(key), key);
      walk(child);
    }
  }
};
walk(json);

let videos = 0, withVideo = 0;
for (const entry of json.entries) {
  const n = (entry.videos || []).length;
  videos += n;
  if (n) withVideo += 1;
  assert.equal((entry.tiktok_candidates || []).length, 0);
  if (entry.location_status === 'candidate_only') assert.equal(entry.place_id, null);
  if (entry.location_status === 'catalogue_seed') assert.equal(typeof entry.place_id, 'string');
  for (const video of entry.videos || []) {
    assert.equal(video.platform, 'youtube');
    assert.equal(video.embed_url, `https://www.youtube-nocookie.com/embed/${video.video_id}`);
    assert.equal(TalkMedia.youtubeEmbed(video), video.embed_url);
    assert.equal(video.oembed_ok, true);
  }
}
assert.equal(withVideo, 102);
assert.equal(videos, 361);

const drink = json.entries.find(entry => entry.place_id === 'n13030672887');
assert.equal(drink.location_status, 'catalogue_seed');
assert.ok(drink.videos.length >= 1);
const slot = TalkMedia.section(drink.place_id);
const sheet = `<section id="sheet"><h1>${drink.name}</h1>${slot}<nav class="links"></nav></section>`;
assert.match(sheet, /id="sheet"/);
assert.match(sheet, /class="talk"/);
assert.match(sheet, /Watch \/ talk/);
assert.match(sheet, /data-talk-status="catalogue"/);
assert.match(sheet, new RegExp(`youtube-nocookie.com/embed/${drink.videos[0].video_id}`));
assert.match(sheet, new RegExp(drink.videos[0].channel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(sheet, /If the player stays blank/);
assert.match(sheet, /https:\/\/www\.tiktok\.com\/search/);
assert.doesNotMatch(sheet, /<iframe[^>]+tiktok/i);
assert.doesNotMatch(sheet, /Unmatched/);
assert.doesNotMatch(sheet, /Open now/);

const blocked = TalkMedia.block({ ...drink, videos: [{ ...drink.videos[0], embed_url: 'https://www.youtube.com/embed/' + drink.videos[0].video_id }] });
assert.doesNotMatch(blocked, /<iframe/);
assert.match(blocked, /can’t be embedded here/);
assert.match(blocked, /youtube\.com\/watch\?v=/);

const tiktok = TalkMedia.block({ ...drink, tiktok_candidates: [{ url: 'https://www.tiktok.com/@example/video/1', title: 'clip' }] });
assert.match(tiktok, /tiktok\.com\/@example\/video\/1/);
assert.equal((tiktok.match(/<iframe/g) || []).length, 1);

const kamaboko = json.entries.find(entry => entry.id === 'hidden-kamabokocoffeecamp');
assert.equal(kamaboko.name, 'Kamaboko Coffee Camp');
assert.equal(kamaboko.place_id, null);
assert.equal(kamaboko.location_status, 'candidate_only');
assert.equal(TalkMedia.forPlace(kamaboko.id), null);
assert.ok(kamaboko.videos.length >= 1);
const closed = TalkMedia.block(kamaboko);
const row = TalkMedia.listItem(kamaboko);
for (const html of [closed, row]) {
  assert.match(html, /Closed · May 2022/);
  assert.match(html, /Unmatched · discovery/);
  assert.doesNotMatch(html, /Open now/);
  assert.doesNotMatch(html, /data-talk-place/);
  assert.doesNotMatch(html, /<iframe[^>]+tiktok/i);
}
assert.match(closed, /historical/);
assert.match(closed, /Not shown as open/);
assert.match(closed, /Not a map pin/);
assert.match(closed, /data-talk-status="unmatched"/);
assert.match(closed, /youtube-nocookie.com\/embed\//);
assert.match(TalkMedia.rowsFor(json, 'unmatched', 'kamaboko').map(entry => entry.id).join(','), /hidden-kamabokocoffeecamp/);
assert.equal(TalkMedia.rowsFor(json, 'map', 'kamaboko').length, 0);
assert.equal(TalkMedia.section('not-a-place'), '');
assert.equal(TalkMedia.block({ ...kamaboko, videos: [] }), '');

for (const entry of json.entries) {
  if (entry.location_status !== 'candidate_only') continue;
  assert.equal(TalkMedia.forPlace(entry.id), null);
  for (const hint of entry.catalogue_name_candidates || []) {
    const hit = TalkMedia.forPlace(hint.place_id);
    if (hit) {
      assert.equal(hit.location_status, 'catalogue_seed');
      assert.equal(hit.place_id, hint.place_id);
      assert.notEqual(hit.id, entry.id);
    }
  }
}

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
assert.match(app, /TalkMedia\?\.section\(p\.id\)/);
assert.match(app, /TalkMedia\?\.attach\(sheet, p\)/);
const page = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
assert.match(page, /talk-media\.js/);

console.log(`talk-media ok: ${json.entries.length} entries, ${withVideo} with video, catalogue hashes unchanged`);
