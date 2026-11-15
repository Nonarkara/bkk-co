// Two bureaus, two catalogues. The separation has to be real, not documented:
// a PL;UB request must never load the cannabis file, a dispensary must not be a
// ratable PL;UB place, and no shared link may present a dispensary as a Great
// Good Place. This drives the Worker itself and counts what it fetched.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import worker, { resolvePlace, placePreview, knownIds } from '../src/worker.js';

const read = (path) => readFile(new URL('../public' + path, import.meta.url));
const cannabis = JSON.parse(await read('/data/places-cannabis.json'));
const work = JSON.parse(await read('/data/places-work.json'));
const food = JSON.parse(await read('/data/places-food.json'));
const clubId = cannabis.rows[0][0];
const clubName = cannabis.rows[0][1];
const workId = work.rows[0][0];

// The base catalogue must hold no dispensary at all. PL;UB refuses a dispensary
// because it is not in that catalogue, so this is the fact the refusal rests
// on: checked here, not assumed.
{
  const base = new Set([...work.rows, ...food.rows].map(r => r[0]));
  const cannabisIds = new Set(cannabis.rows.map(r => r[0]));
  const shared = [...cannabisIds].filter(id => base.has(id));
  assert.equal(shared.length, 0,
    `${shared.length} dispensary ids are in PL;UB's catalogue (${shared.slice(0, 3).join(', ')}) — a dispensary would be a ratable PL;UB place`);
  assert.ok(!work.kinds.includes('cannabis') && !food.kinds.includes('cannabis'),
    "PL;UB's catalogue carries a cannabis kind");
}

const fetched = [];
const ASSETS = {
  fetch: async input => {
    const path = new URL(input).pathname;
    fetched.push(path);
    try { return new Response(await read(path), { status: 200 }); }
    catch { return new Response('not found', { status: 404 }); }
  },
};

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE ratings (place_id TEXT, wifi INTEGER, power INTEGER, quiet INTEGER, laptop INTEGER, ip_hash TEXT, day TEXT, created_at TEXT)');
const binding = {
  prepare(sql) {
    let values = [];
    const s = {
      bind(...v) { values = v; return s; },
      async first() { return db.prepare(sql).get(...values) || null; },
      async all() { return { results: db.prepare(sql).all(...values) }; },
      async run() { const r = db.prepare(sql).run(...values); return { meta: { changes: Number(r.changes) } }; },
    };
    return s;
  },
  async batch(statements) { return Promise.all(statements.map(s => s.run())); },
};
const env = { DB: binding, ASSETS, IP_SALT: 'local-unit-test-salt' };

const rate = async (origin, place, ip) => {
  fetched.length = 0;
  const res = await worker.fetch(new Request(origin + '/api/scores', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
    body: JSON.stringify({ place, wifi: 3, power: 2, quiet: 3, laptop: 3 }),
  }), env);
  return { status: res.status, body: await res.json(), fetched: [...fetched] };
};

// 1. A PL;UB request never touches the cannabis catalogue.
{
  const r = await rate('https://co.nonarkara.org', clubId, '203.0.113.1');
  assert.equal(r.status, 400, 'a dispensary is not a PL;UB place');
  assert.equal(r.body.error, 'unknown place');
  assert.ok(!r.fetched.includes('/data/places-cannabis.json'), 'PL;UB did not load the cannabis file');
  assert.ok(r.fetched.includes('/data/places-work.json'), 'PL;UB did load its own catalogue');
}

// 2. CL;UB loads the cannabis file, and still refuses to score a dispensary:
//    there are no working conditions there to rate.
{
  const r = await rate('https://club.nonarkara.org', clubId, '203.0.113.2');
  assert.ok(r.fetched.includes('/data/places-cannabis.json'), 'CL;UB did load the cannabis file');
  assert.equal(r.status, 400);
  assert.match(r.body.error, /not rated for working conditions/);
}

// 3. A work place is still a ratable place on both hosts.
{
  const a = await rate('https://co.nonarkara.org', workId, '203.0.113.3');
  assert.equal(a.status, 201, 'PL;UB rates a work place');
  const b = await rate('https://club.nonarkara.org', workId, '203.0.113.4');
  assert.equal(b.status, 201, 'CL;UB rates a work place');
}

// 4. The trust boundary itself: the id set the notebook, the community feed and
//    the rating endpoint all validate against. A dispensary is a known place in
//    CL;UB mode and an unknown one on PL;UB.
{
  const main = await knownIds(env, new URL('https://co.nonarkara.org/'));
  const club = await knownIds(env, new URL('https://club.nonarkara.org/'));
  assert.equal(main.has(clubId), false, 'a dispensary is not a known place on PL;UB');
  assert.equal(main.has(workId), true, 'a work place is a known place on PL;UB');
  assert.equal(club.has(clubId), true, 'a dispensary is a known place in CL;UB mode');
  assert.equal(club.has(workId), true, 'a work place is a known place in CL;UB mode');
}

// 5. A shared link resolves in one catalogue only, and never calls a dispensary
//    a Great Good Place.
{
  const onClub = await resolvePlace(env, new URL('https://club.nonarkara.org/'), clubId);
  assert.ok(onClub, 'CL;UB resolves the dispensary');
  assert.equal(onClub.kind, 'cannabis');
  const onPlub = await resolvePlace(env, new URL('https://co.nonarkara.org/'), clubId);
  assert.equal(onPlub, null, 'PL;UB does not resolve the dispensary');
  const workOnPlub = await resolvePlace(env, new URL('https://co.nonarkara.org/'), workId);
  assert.ok(workOnPlub, 'PL;UB resolves a work place');
  assert.equal(workOnPlub.kind, work.kinds[work.rows[0][2]]);

  const club = placePreview(onClub, 'CLUB');
  assert.match(club.title, new RegExp(clubName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(club.desc, /CL;UB/);
  assert.ok(!/Great Good Place index/.test(club.desc), 'no PL;UB index on a dispensary');
  const plub = placePreview(workOnPlub, 'PLUB');
  assert.match(plub.desc, /Great Good Place index/);
}

// 6. The client agrees with the server: a dispensary is never labelled a Great
//    Good Place, and never asks for working conditions.
{
  const app = (await read('/app.js')).toString();
  const views = (await read('/views.js')).toString();
  const notebook = (await read('/notebook.js')).toString();
  assert.match(app, /Source details · .* of 4 fields/);
  assert.doesNotMatch(app, /Licensed medical cannabis clinic/);
  assert.match(views, /p\.k === 'cannabis' \? '' : `<details class="work-q">/, 'a dispensary asks no working questions');
  assert.match(notebook, /mode=club/, 'the notebook tells the server which catalogue it is in');
}

db.close();
console.log('PL;UB never loads the cannabis catalogue, a dispensary is not a ratable place, CL;UB says so on the wire, and neither surface calls a dispensary a Great Good Place.');

// Regression: the bare Overture clinic classification used to admit this
// physiotherapy practice and call explicit dispensaries clinics.
assert.ok(!cannabis.rows.some(row => row[1].includes('เทวาคลินิกกายภาพบำบัด')));
const meters = (a, b) => Math.hypot((a[4] - b[4]) * 111320 *
  Math.cos((a[3] + b[3]) * 0.5 * Math.PI / 180), (a[3] - b[3]) * 110540);
for (const row of cannabis.rows) {
  const d = cannabis.details[row[0]];
  assert.equal(row[7], [d.h, d.web || d.social, d.tel, d.addr].filter(Boolean).length);
  assert.equal(d.hub1km, cannabis.rows.filter(other => other !== row && meters(row, other) <= 1000).length);
}
for (const h of cannabis.hotspots) {
  const anchor = cannabis.rows.find(row => row[3] === h.lat && row[4] === h.lng && row[1] === h.name);
  assert.ok(anchor, 'hotspot is anchored on the named source record');
  assert.equal(h.count, cannabis.rows.filter(row => meters(anchor, row) <= 1500).length);
}
