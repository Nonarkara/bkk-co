// No platform-scraped data, ever.
//
// PLUB's law (AGENTS.md): "No Google-scraped data, invented pins, guessed
// building heights or invented street connectivity." The tiers PLUB does not
// hold — commercial platform fields, individual review text, social mentions,
// directory crawls — are published as absent, never filled in.
//
// Once, a Google Maps list extraction was shipped and a "PLUB Endorsed ·
// Google ★4.5 (312 reviews)" label was rendered from it. The data file was
// removed; the code that could still render such a label stayed. A rule that
// only removes data leaves the door open. These checks close it.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const repo = new URL('../', import.meta.url);
const text = async p => readFile(new URL(p, repo), 'utf8');

// --- no file carries a platform extraction ---------------------------------------
const banned = [
  'google-maps-list', 'endorsed-places', 'google-maps-scraped', 'google-review',
  'facebook', 'instagram', 'twitter-scraped', 'private-group',
];
const watched = ['public/data', 'public', 'data', 'public/media'];
const found = [];
for (const dir of watched) {
  const path = new URL(dir + '/', repo);
  if (!existsSync(path)) continue;
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const name = entry.name.toLowerCase();
    if (banned.some(b => name.includes(b))) found.push(`${dir}/${entry.name}`);
  }
}
assert.deepEqual(found, [], `a platform extraction is shipped again: ${found.join(', ')}`);

// --- no shipped code can render a platform rating --------------------------------
// A dead branch is still a door. The field names PLUB does not hold must not
// appear in anything the browser runs.
const fieldNames = ['googleRating', 'googleReviews', 'googlePlaceId', 'endorsed', 'nomadScore'];
const code = ['public/app.js', 'public/views.js', 'public/street-world.js', 'public/street-world-3d.js',
  'public/atlas.js', 'public/discovery.js', 'public/footprint-palette.js', 'public/work-atmosphere.js',
  'public/day.js', 'public/research.js'];
for (const file of code) {
  const body = await text(file);
  for (const field of fieldNames) {
    assert.ok(!body.includes(field), `${file} still reads "${field}" — a platform field PLUB does not hold`);
  }
}

// --- and no source can call a platform API ---------------------------------------
for (const file of code) {
  const body = await text(file);
  assert.ok(!/maps\.googleapis\.com\/maps\/api\/place/i.test(body), `${file} calls the Google Places API`);
  assert.ok(!/graph\.facebook\.com/i.test(body), `${file} calls Facebook`);
}
const worker = await text('src/worker.js');
assert.ok(!/maps\.googleapis\.com\/maps\/api\/place/i.test(worker), 'the Worker calls the Google Places API');

// --- the agent API publishes those tiers as absent --------------------------------
const api = await text('src/agent-api.js');
assert.ok(/single_report/.test(api), 'the API names the tiers it does not hold');
assert.ok(!/googleRating/.test(api), 'the API must not publish a platform rating');

// --- the catalogue carries no platform field ---------------------------------------
const places = JSON.parse(await text('public/data/places-work.json'));
const row = places.rows.find(r => String(r).toLowerCase().includes('google'));
assert.equal(row, undefined, 'a catalogue row carries a platform field');
for (const key of Object.keys(places)) {
  assert.ok(!/google|endorse/i.test(key), `the catalogue publishes a platform key: ${key}`);
}

console.log('No platform-scraped data ships, no shipped code can render a platform rating, and the catalogue carries no platform field.');
