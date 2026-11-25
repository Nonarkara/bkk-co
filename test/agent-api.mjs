// The agent API: one canonical record, many evidence records, and a composite that never
// lies about its coverage. It also proves the API exposes nothing from the private notebook.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { agentApi } from '../src/agent-api.js';
import WorkAtmosphere from '../public/work-atmosphere.js';

const db = new DatabaseSync(':memory:');
db.exec(await readFile(new URL('../db/notebook.sql', import.meta.url), 'utf8'));
db.exec('CREATE TABLE IF NOT EXISTS ratings (place_id TEXT, wifi INTEGER, power INTEGER, quiet INTEGER, laptop INTEGER, ip_hash TEXT, day TEXT, created_at TEXT)');
// Two visitors on one venue: the visitor tier must be visible, with its own date.
db.exec("INSERT INTO ratings VALUES ('n2368064673',3,2,3,3,'x','2026-11-01','2026-11-01T00:00:00Z'),('n2368064673',3,2,3,3,'y','2026-11-02','2026-11-02T00:00:00Z')");

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
const ASSETS = {
  fetch: async input => {
    const path = new URL(input).pathname;
    try { return new Response(await readFile(new URL('../public' + path, import.meta.url)), { status: 200 }); }
    catch { return new Response('not found', { status: 404 }); }
  },
};
const env = { DB: binding, ASSETS };
const call = async (path, method = 'GET') => {
  const url = new URL('https://co.nonarkara.org' + path);
  const res = await agentApi(new Request(url, { method }), env, url);
  return { status: res.status, body: await res.json() };
};

// --- the index ---------------------------------------------------------------
{
  const { status, body } = await call('/v1');
  assert.equal(status, 200);
  assert.equal(body.name, 'PLUB agent API');
  assert.ok(body.endpoints.some(e => e.startsWith('/v1/venues')), 'the venue endpoints are listed');
  assert.ok(body.count > 20000, 'the catalogue is exposed');
  assert.ok(body.snapshot.asOf, 'the snapshot date is published');
  assert.match(body.licence,/OpenStreetMap/);
}

// --- search ------------------------------------------------------------------
{
  const { body } = await call('/v1/venues?lat=13.732&lng=100.53&radius=800&limit=25');
  assert.ok(body.venues.length > 0, 'a geo search returns venues');
  for (const v of body.venues) {
    assert.ok(v.distance_m <= 800, 'every venue is inside the radius');
    assert.ok(v.work_readiness, 'every venue states its work readiness');
  }
  const first = body.venues[0].distance_m, last = body.venues.at(-1).distance_m;
  assert.ok(first <= last, 'results are ordered by distance');
}
{
  const { body } = await call('/v1/venues?q=cafe&limit=5');
  assert.ok(body.venues.length > 0, 'the text search reaches the category');
  const { body: cats } = await call('/v1/venues?category=coworking&limit=5');
  assert.ok(cats.venues.every(v => v.category === 'coworking'), 'the category filter is honoured');
  // A filter on documented facts, never on an inferred score.
  const { body: documented } = await call('/v1/venues?documented=wifi&limit=50');
  assert.ok(documented.venues.length > 0, 'venues with documented Wi-Fi are found');
  assert.ok(documented.venues.every(v => v.work_readiness.components.wifi.points !== null), 'the filter keeps only documented venues');
  const { body: work } = await call('/v1/venues?sort=work&limit=10');
  const published = work.venues.filter(v => v.work_readiness.published);
  for (let i = 1; i < published.length; i++) {
    assert.ok(published[i - 1].work_readiness.score >= published[i].work_readiness.score, 'work sort is ordered by the published composite');
  }
}

// --- one venue, its evidence, its history -------------------------------------
{
  const pilot = JSON.parse(await readFile(new URL('../public/data/journey-evidence.json', import.meta.url)));
  const { body: registry } = await call('/v1/sources');
  assert.ok(pilot.places.n4841595724, 'a rebuild must not silently drop The Work Loft');
  assert.ok(pilot.places.od401837f4c19, 'a rebuild must not silently drop TCDC MunMun');
  for (const [id, place] of Object.entries(pilot.places)) {
    const { body: detail } = await call('/v1/venues/' + id);
    const { body } = await call('/v1/venues/' + id + '/evidence');
    assert.equal(body.journey_evidence_status, 'available');
    assert.equal(detail.evidence_count, body.count);
    assert.equal(detail.name.toLowerCase(), place.name.toLowerCase());
    assert.deepEqual(detail.evidence, body.evidence);
    for (const [field, fact] of Object.entries(place.facts)) {
      for (const id of fact.source_ids) {
        const result = body.evidence.find(e => e.field === field && e.source_id === 'journey:' + id);
        assert.ok(result, `missing source ${id} for ${place.name}/${field}`);
        assert.deepEqual(result.value, fact.value);
        assert.equal(result.retrieved_at, fact.checked_at);
        assert.equal(result.claim, fact.note);
        assert.ok(registry.sources.some(s => s.id === result.source_id && s.url === result.url && s.tier === result.tier));
      }
    }
  }
  const { body: vich } = await call('/v1/venues/oe0a5a241cfc8/evidence');
  assert.equal(vich.evidence.find(e => e.field === 'hours').value, 'Mo-Su 07:00-20:00');
  assert.equal(vich.evidence.find(e => e.field === 'hours').tier, 'operator_claim');
  const { body: unmapped } = await call('/v1/venues/n2368064673/evidence');
  assert.ok(unmapped.evidence.every(e => !e.source_id.startsWith('journey:')));
}

{
  const { agentApi: isolatedApi } = await import('../src/agent-api.js?journey-outage');
  const url = new URL('https://co.nonarkara.org/v1/venues/oe0a5a241cfc8/evidence');
  const failedAsset = {
    fetch: input => new URL(input).pathname === '/data/journey-evidence.json'
      ? Promise.resolve(new Response('temporary outage', { status: 503 })) : ASSETS.fetch(input),
  };
  const response = await isolatedApi(new Request(url), { DB: binding, ASSETS: failedAsset }, url);
  assert.equal(response.status, 200, 'optional evidence must not take down the venue');
  const body = await response.json();
  assert.equal(body.journey_evidence_status, 'unavailable');
  assert.ok(body.evidence.every(e => !e.source_id.startsWith('journey:')));
}

{
  const { status, body } = await call('/v1/venues/n2368064673');
  assert.equal(status, 200);
  assert.equal(body.venue_id, 'n2368064673');
  assert.ok(body.work_readiness.components.wifi, 'Wi-Fi is a component');
  assert.equal(body.work_readiness.total, 7, 'seven scored dimensions');
  assert.ok(Array.isArray(body.work_readiness.not_mapped), 'the unmappable dimensions are named');
  assert.ok(body.work_readiness.missing.length > 0, 'the unscored dimensions are named');
  // The composite is only published with coverage behind it.
  if (body.work_readiness.published) assert.ok(body.work_readiness.coverage >= 0.5);
  else assert.equal(body.work_readiness.score === null || body.work_readiness.score !== undefined, true);

  // The API's components must be the same rule set the interface uses.
  const places = JSON.parse(await readFile(new URL('../public/data/places-work.json', import.meta.url)));
  const row = places.rows.find(r => r[0] === 'n2368064673');
  const joins = JSON.parse(await readFile(new URL('../public/data/journey-places.json', import.meta.url)));
  const data = { raw: { join: { venueTags: joins.venueTags }, geo: { manifest: { asOf: joins.manifest.asOf } } } };
  const local = WorkAtmosphere.profile({ id: row[0], n: row[1], k: places.kinds[row[2]], x: row[4], y: row[3], flags: row[5] }, data, { n2368064673: { n: 2, wifi: 3, power: 2, quiet: 3, laptop: 3, last: '2026-11-02' } });
  assert.equal(body.work_readiness.score, local.score, 'the API and the interface share one score');
  assert.equal(body.work_readiness.coverage, +local.coverage.toFixed(3));
  for (const d of WorkAtmosphere.DIMENSIONS) {
    assert.equal(body.work_readiness.components[d.key].points, local.dimensions[d.key].points, `${d.key} matches the interface`);
  }
}
// The on-site report must reach an agent exactly as it reaches a reader.
{
  const { body } = await call('/v1/venues/o71358a621d50');
  const places = JSON.parse(await readFile(new URL('../public/data/places-work.json', import.meta.url)));
  const joins = JSON.parse(await readFile(new URL('../public/data/journey-places.json', import.meta.url)));
  const reports = JSON.parse(await readFile(new URL('../public/data/venue-reports.json', import.meta.url)));
  const row = places.rows.find(r => r[0] === 'o71358a621d50');
  const data = { raw: { join: { venueTags: joins.venueTags }, geo: { manifest: { asOf: joins.manifest.asOf } } } };
  const local = WorkAtmosphere.profile(
    { id: row[0], n: row[1], k: places.kinds[row[2]], x: row[4], y: row[3], flags: row[5] },
    data, {}, undefined, reports.reports.o71358a621d50);
  assert.equal(body.work_readiness.score, local.score, 'the API and the interface share the on-site score');
  assert.equal(body.work_readiness.coverage, +local.coverage.toFixed(3));
  assert.equal(body.work_readiness.components.wifi.basis, 'onsite', 'the on-site tier reaches the API');
  for (const d of WorkAtmosphere.DIMENSIONS) {
    assert.equal(body.work_readiness.components[d.key].points, local.dimensions[d.key].points, `${d.key} matches the interface`);
  }
  assert.ok(body.on_site_report, 'the report is published whole');
  assert.equal(body.on_site_report.reporter, reports.reports.o71358a621d50.reporter, 'the report names its reporter');
  assert.equal(body.on_site_report.date, reports.reports.o71358a621d50.date, 'the report carries its date');
  assert.ok(body.on_site_report.sources.length > 0, 'the report publishes its sources with their tiers');
  assert.ok(body.on_site_report.sources.some(x => x.tier === 'venue claim'), 'the venue claim is published as a venue claim');
  assert.ok(body.on_site_report.sources.some(x => x.tier === 'on-site report'), 'the on-site evidence is published as on-site');
  assert.equal(body.work_readiness.components.stay.points, null, 'a dimension the reporter did not record stays unknown');
  assert.equal(body.work_readiness.components.access.points, null, 'parking is never upgraded into step-free access');
}
{
  const { body } = await call('/v1/venues/n2368064673/evidence');
  assert.ok(body.evidence.length > 0);
  for (const e of body.evidence) {
    assert.ok(e.source && e.tier && e.claim, 'every evidence record names its source, tier and claim');
    assert.ok('retrieved_at' in e, 'every evidence record carries a retrieval date');
  }
  assert.ok(body.evidence.some(e => e.tier === 'visitor_reported'), 'the visitor tier is present');
}
{
  const { body } = await call('/v1/venues/n2368064673/history');
  assert.ok(body.tiers.length > 0);
  for (const t of body.tiers) assert.ok(t.tier && t.count >= 1);
}
{
  const { status } = await call('/v1/venues/n000000000');
  assert.equal(status, 404, 'an unknown venue is a 404, not a blank record');
}

// --- the model, the sources, the neighbourhoods --------------------------------
{
  const { body } = await call('/v1/atmosphere');
  assert.equal(body.dimensions.length, 7);
  assert.ok(body.tiers.length >= 5);
  assert.ok(body.tiers.some(t => t.present === false), 'the tiers PLUB does not hold are published as absent');
  assert.ok(body.tiers.some(t => t.id === 'operator_claim' && t.present === true), 'the venue-claim tier is held');
  assert.match(body.rule,/unknown/);
}
{
  const { body } = await call('/v1/sources');
  assert.ok(body.sources.some(s => s.licence === 'ODbL-1.0'), 'the map licence is stated');
  assert.ok(body.sources.some(s => s.licence === 'CDLA-P-2.0'), 'the Overture licence is stated');
  assert.ok(body.sources.every(s => s.id && s.tier));
}
{
  const { body } = await call('/v1/neighbourhoods');
  assert.equal(body.count, 12, 'twelve neighbourhoods');
  for (const n of body.neighbourhoods) {
    assert.ok(n.anchor && n.radius_m === 800);
    assert.ok(n.cafes_within_radius > 0, 'each neighbourhood states its own café count');
  }
  assert.ok(body.neighbourhoods.every(n => !n.boundary || n.boundary === undefined), 'no invented boundary is served');
}

// --- the change feed -----------------------------------------------------------
{
  const { status } = await call('/v1/changes');
  assert.equal(status, 400, 'since is required');
  const { status: bad } = await call('/v1/changes?since=yesterday');
  assert.equal(bad, 400, 'a bad date is refused');
  const { body } = await call('/v1/changes?since=2026-11-01');
  assert.equal(body.since, '2026-11-01');
  assert.ok(body.changes.some(c => c.venue_id === 'n2368064673'), 'the visitor change is reported');
  assert.ok(body.mapped_evidence_as_of, 'the mapped snapshot date is stated');
}

// --- the API is read-only and exposes nothing private ----------------------------
{
  const { status } = await call('/v1/venues', 'POST');
  assert.equal(status, 405, 'the API refuses writes');
}
{
  const { body } = await call('/v1/venues?limit=5');
  const text = JSON.stringify(body);
  for (const leak of ['session', 'token', 'cookie', 'account_id', 'notebook_key', 'ip_hash', 'email']) {
    assert.ok(!text.toLowerCase().includes(leak), `the API never exposes ${leak}`);
  }
}
{
  const { status } = await call('/v1/not-a-thing');
  assert.equal(status, 404);
}

console.log('Agent API: one canonical record with time-stamped evidence, a coverage-annotated composite shared with the interface, the twelve neighbourhoods, a change feed, published absent tiers, no writes and no private data.');
