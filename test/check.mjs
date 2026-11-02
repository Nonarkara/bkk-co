// node test/check.mjs            -> catalogue, validator, hours parser
// node test/check.mjs <base-url>          -> also the live API: rejects bad input (writes nothing)
// node test/check.mjs <base-url> --write  -> also accept, rate-limit, n = rows (writes one rating: local only)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { validateScore } from '../src/validate.js';

const dir = new URL('../public/data/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', dir)));
const rows = ['work', 'food'].flatMap(f => JSON.parse(readFileSync(new URL(`places-${f}.json`, dir))).rows);
const kinds = JSON.parse(readFileSync(new URL('places-work.json', dir))).kinds;

// Conservation law: catalogue count = Σ kinds = rows served.
const byKind = {};
for (const r of rows) byKind[kinds[r[2]]] = (byKind[kinds[r[2]]] || 0) + 1;
assert.equal(rows.length, manifest.total);
assert.deepEqual(byKind, manifest.kinds);
assert.equal(Object.values(manifest.kinds).reduce((a, b) => a + b, 0), manifest.total);

const [x0, y0, x1, y1] = manifest.bounds, ids = new Set();
for (const [id, name, , lat, lng, , g, idx] of rows) {
  assert.ok(/^\d{6}$/.test(g), `metrics ${id}`);
  assert.ok(Number.isInteger(idx) && idx >= 0 && idx <= 100, `index ${id}`);
  assert.ok(name && name.trim(), `unnamed ${id}`);
  assert.ok(lng >= x0 && lng <= x1 && lat >= y0 && lat <= y1, `outside bounds ${id}`);
  assert.ok(!ids.has(id), `duplicate ${id}`); ids.add(id);
}

// Trust boundary.
const id = rows[0][0], ok = { place: id, wifi: 3, power: 2, quiet: 1, laptop: 3 };
assert.ok(validateScore(ok, ids).value);
assert.ok(validateScore({ ...ok, place: 'n0' }, ids).error);
assert.ok(validateScore({ ...ok, wifi: 4 }, ids).error);
assert.ok(validateScore({ ...ok, wifi: 2.5 }, ids).error);
assert.ok(validateScore({ ...ok, note: 'x' }, ids).error);
assert.ok(validateScore([], ids).error);

// Hours: open / closed / unknown, never guessed.
const { isOpen } = createRequire(import.meta.url)('../public/hours.js');
const at = (d, h, m = 0) => new Date(2026, 10, 1 + d, h, m); // 1 Nov 2026 is a Sunday
assert.equal(isOpen('24/7', at(0, 3)), true);
assert.equal(isOpen('08:00-18:00', at(2, 9)), true);
assert.equal(isOpen('08:00-18:00', at(2, 19)), false);
assert.equal(isOpen('Mo-Fr 08:00-18:00; Sa,Su off', at(0, 10)), false);
assert.equal(isOpen('Sa 09:00-12:00; Mo-Fr 08:00-18:00', at(6, 10)), true);
assert.equal(isOpen('Mo-Su 18:00-02:00', at(2, 1)), true);
assert.equal(isOpen('Fr 18:00-02:00', at(6, 1)), true);
assert.equal(isOpen('Fr 18:00-02:00', at(6, 3)), false);
assert.equal(isOpen('Mo-Fr 07:00-17:00; PH off', at(1, 9)), null);
assert.equal(isOpen('sunrise-sunset', at(1, 9)), null);
assert.equal(isOpen(undefined, at(1, 9)), null);

console.log(`catalogue ok: ${rows.length} places`, manifest.kinds);

const base = process.argv[2];
if (base) {
  const post = body => fetch(`${base}/api/scores`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const place = rows[Math.floor(Math.random() * rows.length)][0];
  assert.equal((await post({ ...ok, place: 'n0' })).status, 400);
  assert.equal((await post({ ...ok, place, wifi: 9 })).status, 400);
  assert.equal((await fetch(`${base}/api/scores`, { method: 'POST', body: 'x' })).status, 415);
  if (!process.argv.includes('--write')) { console.log(`api ok (read-only): ${base}`); process.exit(0); }
  assert.equal((await post({ ...ok, place })).status, 201);
  assert.equal((await post({ ...ok, place })).status, 429, 'second rating same day must be refused');
  const scores = await (await fetch(`${base}/api/scores`)).json();
  assert.equal(scores[place].n, 1, 'n shown = rows stored');
  assert.equal(scores[place].wifi, 3);
  console.log(`api ok: ${base} rated ${place}`);
}
