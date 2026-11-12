// Workspace atmosphere: a dimension with no evidence stays unknown, never zero, and the
// composite never appears without its coverage. These assertions exist because the failure
// mode of an atmosphere model is a confident-looking number built from nothing.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const WorkAtmosphere = require('../public/work-atmosphere.js');
const JourneyModel = require('../public/journey-model.js');

const AS_OF = '2026-10-24T20:20:51Z';
const data = (venueTags = {}, evidence = {}) => ({
  stationById: new Map(), joinById: new Map(), parkingById: new Map(),
  evidence: new Map(Object.entries(evidence)),
  raw: { geo: { manifest: { asOf: AS_OF } }, join: { venueTags }, evidence: { sources: {} } },
});
const place = (id, kind = 'cafe') => ({ id, n: 'Test venue', k: kind, x: 100.5, y: 13.7, flags: 0 });

// --- an undocumented place ------------------------------------------------------
{
  const p = place('n1');
  const r = WorkAtmosphere.profile(p, data({}), {});
  assert.equal(r.score, null, 'no evidence means no score');
  assert.equal(r.publishable, false, 'a place with nothing documented is not scored');
  assert.equal(r.coverage, 0);
  assert.equal(r.missing.length, WorkAtmosphere.DIMENSIONS.length, 'every dimension is named as missing');
  for (const d of WorkAtmosphere.DIMENSIONS) {
    assert.equal(r.dimensions[d.key].points, null, `${d.key} is unknown, not zero`);
    assert.equal(r.dimensions[d.key].value, null, `${d.key} carries no value`);
    assert.equal(r.dimensions[d.key].basis, 'unknown');
  }
  // The brief's dimensions that public map data does not carry are still named.
  assert.ok(r.notMapped.includes('Meeting rooms'));
  assert.ok(r.notMapped.includes('Phone booths'));
}

// --- a fully mapped café --------------------------------------------------------
{
  const p = place('n2');
  const tags = { n2: { sourceID: 'n2', tags: { internet_access: 'wlan', socket: 'yes', capacity: '40', outdoor_seating: 'yes', wheelchair: 'yes', fee: 'no', access: 'yes', opening_hours: '08:00-23:00' } } };
  const r = WorkAtmosphere.profile(p, data(tags), {});
  assert.equal(r.publishable, true, 'a mapped café is scoreable');
  assert.ok(r.coverage >= WorkAtmosphere.MIN_COVERAGE, `coverage ${r.coverage}`);
  assert.equal(r.dimensions.wifi.points, 100);
  assert.equal(r.dimensions.power.points, 60, 'a documented socket is supply, not a perfect score');
  assert.equal(r.dimensions.seating.points, 100, 'capacity 40 is a large venue');
  assert.equal(r.dimensions.access.points, 100);
  assert.equal(r.dimensions.value.points, 100, 'fee=no');
  assert.equal(r.dimensions.stay.points, 90, 'open access plus a 23:00 close');
  assert.equal(r.dimensions.focus.points, null, 'no visitor report means focus stays unknown');
  assert.ok(r.missing.includes('Noise & focus'), 'the missing dimension is named');
  // Every published dimension carries a source.
  for (const d of WorkAtmosphere.DIMENSIONS) {
    if (r.dimensions[d.key].points !== null) {
      assert.ok(r.dimensions[d.key].sources.length > 0, `${d.key} has a source`);
      assert.ok(r.dimensions[d.key].note.length > 10, `${d.key} explains itself`);
    }
  }
  // The composite is the weighted mean over the evidenced dimensions only.
  const evidenced = WorkAtmosphere.DIMENSIONS.filter(d => r.dimensions[d.key].points !== null);
  const w = evidenced.reduce((a, d) => a + d.weight, 0);
  const expect = Math.round(evidenced.reduce((a, d) => a + d.weight * r.dimensions[d.key].points, 0) / w);
  assert.equal(r.score, expect, 'the composite is the weighted mean of what is documented');
  assert.ok(r.score > 0 && r.score <= 100);
}

// --- coverage floor -------------------------------------------------------------
{
  const p = place('n3');
  const tags = { n3: { sourceID: 'n3', tags: { internet_access: 'wlan' } } };
  const r = WorkAtmosphere.profile(p, data(tags), {});
  assert.ok(r.coverage > 0 && r.coverage < WorkAtmosphere.MIN_COVERAGE, `coverage ${r.coverage}`);
  assert.equal(r.publishable, false, 'one documented dimension is not enough to publish a number');
  assert.ok(r.score !== null || r.publishable === false);
}

// --- visitor reports are a tier of their own --------------------------------------
{
  const p = place('n4');
  const scores = { n4: { n: 3, wifi: 3, power: 2, quiet: 3, laptop: 3, last: '2026-11-01' } };
  const r = WorkAtmosphere.profile(p, data({}), scores);
  assert.equal(r.dimensions.wifi.basis, 'visitor');
  assert.equal(r.dimensions.wifi.points, 100);
  assert.equal(r.dimensions.power.points, 50, 'an "OK" average is not a full mark');
  assert.equal(r.dimensions.focus.points, 100, 'quiet reports answer the focus dimension');
  assert.equal(r.dimensions.focus.basis, 'visitor');
  assert.ok(r.dimensions.focus.sources.length > 0);
}

// --- a visitor report and a mapped tag that disagree --------------------------------
{
  const p = place('n5');
  const tags = { n5: { sourceID: 'n5', tags: { internet_access: 'no' } } };
  const scores = { n5: { n: 2, wifi: 3, quiet: 2, last: '2026-11-01' } };
  const r = WorkAtmosphere.profile(p, data(tags), scores);
  assert.match(r.dimensions.wifi.note, /disagrees/, 'the conflict is stated, not hidden');
  assert.equal(r.dimensions.wifi.basis, 'visitor');
}

// --- the venue's own claim is a tier, and is not a score -----------------------------
{
  const p = place('n6');
  const tags = { n6: { sourceID: 'n6', tags: { website: 'https://example.test/cafe', operator: 'Example Coffee', brand: 'Example', description: 'A quiet room upstairs.' } } };
  const r = WorkAtmosphere.profile(p, data(tags), {});
  assert.equal(r.claims.items.find(i => i.label === 'Operator').value, 'Example Coffee');
  assert.ok(r.claims.sources.some(s => s.url === 'https://example.test/cafe'));
  assert.ok(r.claims.sources.every(s => s.tier === 'venue claim'));
  // A claim never becomes a dimension score.
  assert.equal(r.dimensions.seating.points, null);
}

// --- the four tiers stay separate ---------------------------------------------------
{
  const p = place('n7');
  const tiers = new Set();
  const tags = { n7: { sourceID: 'n7', tags: { internet_access: 'wlan', fee: 'no' } } };
  const scores = { n7: { n: 1, quiet: 2, last: '2026-11-01' } };
  const r = WorkAtmosphere.profile(p, data(tags), scores);
  for (const d of WorkAtmosphere.DIMENSIONS) tiers.add(r.dimensions[d.key].basis);
  assert.ok(tiers.has('mapped'), 'the map tier is present');
  assert.ok(tiers.has('visitor'), 'the visitor tier is present');
  assert.ok(tiers.has('unknown'), 'the unknown tier is present');
  for (const d of WorkAtmosphere.DIMENSIONS) {
    const basis = r.dimensions[d.key].basis;
    assert.ok(['mapped', 'venue', 'visitor', 'publisher', 'editorial', 'first_party', 'unknown'].includes(basis), `tier ${basis}`);
  }
}

// --- opening hours parsing -------------------------------------------------------------
assert.equal(WorkAtmosphere.lateClose('08:00-23:00'), '23:00');
assert.equal(WorkAtmosphere.lateClose('Mo-Fr 08:00-17:00; Sa 09:00-21:00'), null, 'a 21:00 close is not a late close');
assert.equal(WorkAtmosphere.lateClose('24/7'), 'always');
assert.equal(WorkAtmosphere.lateClose(''), null);
assert.equal(WorkAtmosphere.lateClose('10:00-14:00,16:00-23:30'), '23:30');

// --- rendering ----------------------------------------------------------------------------
{
  const p = place('n8');
  const tags = { n8: { sourceID: 'n8', tags: { internet_access: 'wlan', socket: 'yes', wheelchair: 'yes' } } };
  const html = WorkAtmosphere.render(p, data(tags), {});
  assert.match(html, /Workspace atmosphere/);
  assert.match(html, /Not scored|100/);
  assert.match(html, /not documented/i, 'an unknown dimension is visible in the surface');
  assert.match(html, /not a rating|not how good the place is|documentation, not quality/i);
  assert.match(html, /openstreetmap\.org\/node\/8/, 'the mapped source is linked');
  assert.ok(!/NaN|undefined|Infinity/.test(html), 'no broken numbers reach the surface');
  // A reader must understand the rules: plain words, no shouting, and the rule stated once.
  assert.ok(!/text-transform/.test(html), 'the surface carries no shouted styling');
  assert.match(html, /What "documented" means/, 'the rule is stated in plain words');
  assert.match(html, /on the map|visitors report|the venue says/, 'each row says who documented it');
  assert.doesNotMatch(html, /MISSING|Not scored/i, 'no all-caps verdict');
  assert.match(html, /<dl class="wa-grid">/, 'the dimensions are a list, not a wall of text');
}

// --- ranking puts documented places first, and never reorders silently --------------------
{
  const rows = [{ p: place('n9') }, { p: place('n10') }];
  const tags = { n10: { sourceID: 'n10', tags: { internet_access: 'wlan', socket: 'yes', wheelchair: 'yes', fee: 'no', access: 'yes', capacity: '30' } } };
  const ranked = WorkAtmosphere.rank(rows, data(tags), {});
  assert.equal(ranked[0].p.id, 'n10', 'the documented place leads');
  assert.equal(ranked[1].p.id, 'n9');
  assert.equal(ranked[0].atmosphereOrder, 1, 'the original order is preserved as the tiebreak');
}

// --- the model survives an empty place and an absent data set ----------------------------
{
  const r = WorkAtmosphere.profile({ id: 'x' }, null, {});
  assert.equal(r.score, null);
  assert.equal(r.publishable, false);
  const html = WorkAtmosphere.render({ id: 'x' }, null, {});
  assert.ok(!/NaN|undefined/.test(html));
}

console.log('Workspace atmosphere: unknowns stay unknown, the composite needs its coverage, visitor/mapped/venue tiers stay apart, coverage floor holds, and the surface carries no broken numbers.');
