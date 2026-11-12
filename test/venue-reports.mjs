// The on-site report tier: a named, dated first-hand account is evidence, never a grade.
//
// These checks exist because the model once ran beside the report without reading it,
// and because the signed catalogue once absorbed curated facts. Both are locked here.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import WorkAtmosphere from '../public/work-atmosphere.js';

const repo = new URL('../', import.meta.url);
const read = async p => JSON.parse(await readFile(new URL(p, repo), 'utf8'));

const reports = await read('public/data/venue-reports.json');
const places = await read('public/data/places-work.json');
const joins = await read('public/data/journey-places.json');
const BRIDGE = 'o71358a621d50';

// --- the catalogue stays signed --------------------------------------------------
// Curated visit evidence lives in the report file. It must never be written back
// into the catalogue rows, which carry a hash the manifest publishes.
for (const [file, want] of Object.entries(joins.manifest.catalogueSHA256)) {
  const got = createHash('sha256').update(await readFile(new URL(`public/data/${file}`, repo))).digest('hex');
  assert.equal(got, want, `${file} does not match the catalogue hash the manifest publishes`);
}
const bridgeRow = places.rows.find(r => r[0] === BRIDGE);
assert.ok(bridgeRow, 'the Bridge must stay in the catalogue');
assert.equal(bridgeRow[5], 16, 'the Bridge keeps its catalogue flags: Overture only, no hand-pin or Wi-Fi flag');
assert.equal(bridgeRow[7], 70, 'the Bridge keeps its published index; a visit report does not rescore a place');
assert.equal(bridgeRow.length, 8, 'no curated hours column is written into the catalogue row');

const modelData = { raw: { join: { venueTags: {} }, geo: { manifest: { asOf: '2026-10-24' } } } };
const asPlace = { id: BRIDGE, n: bridgeRow[1], k: 'cafe', y: bridgeRow[3], x: bridgeRow[4], flags: bridgeRow[5], idx: bridgeRow[7] };

// --- a report is read by the shared model ----------------------------------------
const report = reports.reports[BRIDGE];
assert.ok(report, 'the Bridge report must exist');
const r = WorkAtmosphere.profile(asPlace, modelData, {}, undefined, report);

assert.equal(r.publishable, true, 'a report that covers most of the weight is publishable');
assert.equal(r.coverage, 0.85, 'coverage counts only the documented weight');
assert.equal(r.scored, 5, 'five of the seven dimensions are documented');
assert.deepEqual(r.missing, ['Long-stay policy', 'Step-free access'],
  'the two dimensions the reporter did not record stay unknown and are named');
assert.equal(r.score, 93, 'the composite is the weighted mean over the evidenced dimensions');

// Unknown is never zero, and never quietly filled in.
for (const key of ['stay', 'access']) {
  assert.equal(r.dimensions[key].points, null, `${key} must stay unknown, never scored 0`);
  assert.equal(r.dimensions[key].basis, 'unknown', `${key} must stay in the unknown tier`);
}
assert.equal(r.dimensions.wifi.basis, 'onsite', 'a reported dimension carries the on-site tier');
assert.equal(r.dimensions.wifi.points, 100);
assert.ok(r.dimensions.wifi.note.includes(report.reporter), 'the note names the reporter');
assert.ok(r.dimensions.wifi.sources.some(s => s.tier === 'on-site report'), 'the source carries its tier');
assert.ok(r.dimensions.wifi.sources.some(s => s.date === report.date), 'the source carries its date');

// --- the four dimensions no map records -------------------------------------------
const byLabel = Object.fromEntries(r.notMappedDetail.map(n => [n.label, n.reported]));
assert.equal(byLabel['Meeting rooms'], true, 'the report covers meeting rooms');
assert.equal(byLabel['Download / upload speed'], true, 'the report covers measured speed');
assert.equal(byLabel['Phone booths'], false, 'a dimension the reporter did not record is still not covered');
assert.equal(byLabel['Table type'], false);

// --- a report cannot invent a dimension -------------------------------------------
const wifiOnly = {
  reporter: 'Test', date: '2026-11-12',
  facts: { wifi: { band: 'excellent', detail: 'Fast.' } },
};
const partial = WorkAtmosphere.profile(asPlace, modelData, {}, undefined, wifiOnly);
assert.equal(partial.dimensions.wifi.points, 100, 'the reported dimension is scored');
for (const key of ['seating', 'power', 'focus', 'stay', 'value', 'access']) {
  assert.equal(partial.dimensions[key].points, null, `${key} must stay unknown when the report says nothing about it`);
}
assert.equal(partial.coverage, 0.25, 'coverage reflects only what was actually reported');

// --- a report with a null band leaves the dimension unknown ------------------------
const blank = {
  reporter: 'Test', date: '2026-11-12',
  facts: { focus: { band: null, detail: 'Nobody reported the noise level.' } },
};
const bl = WorkAtmosphere.profile(asPlace, modelData, {}, undefined, blank);
assert.equal(bl.dimensions.focus.points, null, 'a null band never becomes a score');
assert.ok(bl.dimensions.focus.sources.some(s => s.tier === 'on-site report'),
  'the reader still learns that someone looked and did not record it');

// --- the rendered surface says the same thing --------------------------------------
const html = WorkAtmosphere.render(asPlace, modelData, {}, undefined, report);
assert.ok(html.includes('Work readiness 93 out of 100'), 'the sheet states the score it computed');
assert.ok(html.includes('Still not documented: Long-stay policy, Step-free access'),
  'the sheet names what it could not score');
assert.ok(html.includes('The on-site report covers'), 'the sheet stops telling the reader to ask for what a report already covers');
assert.ok(html.includes('reported on site'), 'the sheet names the tier in plain words');
assert.ok(!html.includes('No public map records these at all'), 'the old blanket claim is gone once a report covers them');

// --- the bands are a stated scale, not a number that appeared from nowhere ---------
assert.deepEqual(Object.keys(WorkAtmosphere.REPORT_BANDS).sort(),
  ['absent', 'excellent', 'fair', 'good', 'poor', 'very good']);
for (const [id, rep] of Object.entries(reports.reports)) {
  assert.ok(rep.reporter, `report ${id} must name its reporter`);
  assert.ok(rep.date, `report ${id} must carry its date`);
  for (const [key, fact] of Object.entries(rep.facts || {})) {
    assert.ok(fact.band === null || Object.hasOwn(WorkAtmosphere.REPORT_BANDS, fact.band),
      `report ${id}.${key} has a band the scale does not define`);
    assert.ok(fact.detail, `report ${id}.${key} must carry the reporter's words`);
  }
}

console.log('On-site reports fold into the shared model; unknowns stay unknown; the catalogue stays signed.');
