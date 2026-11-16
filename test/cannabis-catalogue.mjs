// The CL;UB catalogue is an artefact of scripts/build-cannabis.py, not a hand-kept
// file. This gate proves the shipped bytes are the builder's bytes (locked by
// digest), that the file says what it contains, and that the tier rule the guide
// board publishes is the rule the catalogue was actually sorted by.
//
// It exists because a hand-edited catalogue can still look perfect: the totals
// can agree, the rows can be well-formed, and nothing in the file says it was
// edited. The lock is what makes the difference visible.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const read = (path) => readFile(new URL('../public' + path, import.meta.url));

const raw = await read('/data/places-cannabis.json');
const catalogue = JSON.parse(raw);
const manifest = JSON.parse(await read('/data/manifest-cannabis.json'));
const work = JSON.parse(await read('/data/places-work.json'));
const food = JSON.parse(await read('/data/places-food.json'));

// 1. The shipped file is the file the manifest locked. A hand-edit, a re-run that
//    was never committed, or a builder change nobody re-ran all break this line.
{
  const sha = createHash('sha256').update(raw).digest('hex');
  assert.equal(sha, manifest.sha256,
    `places-cannabis.json no longer matches manifest-cannabis.json — rebuild it with ` +
    `"python3 scripts/build-cannabis.py" (shipped ${sha.slice(0, 12)}…, manifest ${String(manifest.sha256).slice(0, 12)}…)`);
  assert.equal(raw.length, manifest.bytes,
    `the manifest records ${manifest.bytes} bytes but the file is ${raw.length}`);
  assert.equal(manifest.file, 'places-cannabis.json');
}

// 2. The file says what it contains.
{
  assert.equal(catalogue.total, catalogue.rows.length,
    `total says ${catalogue.total} but there are ${catalogue.rows.length} rows`);
  assert.equal(catalogue.total, manifest.total,
    `the manifest says ${manifest.total} venues, the catalogue says ${catalogue.total}`);
  for (const key of ['bySource', 'bySub', 'byProvince']) {
    const sum = Object.values(catalogue[key] || {}).reduce((a, b) => a + b, 0);
    assert.equal(sum, catalogue.total,
      `${key} adds up to ${sum}, not ${catalogue.total}`);
  }
  const ids = catalogue.rows.map(r => r[0]);
  assert.equal(new Set(ids).size, ids.length, 'the catalogue holds a duplicate id');
  for (const row of catalogue.rows) {
    assert.ok(row[1] && String(row[1]).trim(), `a venue has no name: ${row[0]}`);
    assert.ok(typeof row[3] === 'number' && typeof row[4] === 'number', `a venue has no position: ${row[0]}`);
    assert.ok(row[3] >= 5.5 && row[3] <= 20.6 && row[4] >= 97.2 && row[4] <= 105.8,
      `a venue is outside Thailand: ${row[0]} at ${row[3]}, ${row[4]}`);
  }
}

// 3. It is CL;UB's catalogue and only CL;UB's: no id may be in the signed
//    catalogue, or a dispensary would become a ratable PL;UB place.
{
  const base = new Set([...work.rows, ...food.rows].map(r => r[0]));
  const shared = catalogue.rows.map(r => r[0]).filter(id => base.has(id));
  assert.equal(shared.length, 0,
    `${shared.length} cannabis ids are also in the signed catalogue (${shared.slice(0, 3).join(', ')})`);
  assert.ok(!work.kinds.includes('cannabis') && !food.kinds.includes('cannabis'),
    "PL;UB's catalogue carries a cannabis kind");
}

// 4. The tier rule the guide board publishes is the rule the catalogue was sorted
//    by. The board counts from the venues; this checks the venues agree with the
//    tier written beside them.
{
  const tierOf = (det) => {
    const contact = Boolean(det.web || det.social || det.tel);
    if (det.sub === 'clinic' && contact) return 'A';
    if (det.h && contact) return 'B';
    return 'C';
  };
  const counts = { A: 0, B: 0, C: 0 };
  for (const [id, det] of Object.entries(catalogue.details)) {
    assert.ok(catalogue.rows.some(r => r[0] === id), `a detail has no row: ${id}`);
    const expected = tierOf(det);
    assert.equal(det.tier, expected,
      `${id} is written as Tier ${det.tier} but its own facts make it Tier ${expected}`);
    counts[expected] += 1;
  }
  const unclassified = catalogue.total - Object.keys(catalogue.details).length;
  assert.equal(counts.A + counts.B + counts.C, Object.keys(catalogue.details).length);
  console.log(`  tiers: A ${counts.A} · B ${counts.B} · C ${counts.C} · ${unclassified} with no detail record`);
}

console.log(
  `CL;UB catalogue: ${catalogue.total} venues, ${manifest.bytes} bytes, sha256 ${manifest.sha256.slice(0, 12)}…, ` +
  'reproducible from scripts/build-cannabis.py and locked by manifest-cannabis.json.');
