#!/usr/bin/env node
// The anchor of a street-sketch area must be a cafe you can actually start a walk from.
//
// The area rule picks the highest-index cafe in the busiest circle. Sometimes that cafe sits on
// a through road: every cafe in the cluster is then "near" that one arterial, and the mapped
// lane network offers no stroll at all. The anchor then moves to another real cafe in the same
// cluster, chosen because a connected lane route actually leaves it.
//
// The walk test is the shipped street model's own route function, not a copy of it.
//
//   node scripts/select-street-anchors.mjs
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const M = require('../public/street-model.js');
const areasUrl = new URL('../public/data/street-areas.json', import.meta.url);
const payload = JSON.parse(await readFile(areasUrl, 'utf8'));
const work = JSON.parse(await readFile(new URL('../public/data/places-work.json', import.meta.url), 'utf8'));
const rows = work.rows, kinds = work.kinds;
const out = [];

for (const area of payload.areas) {
  // An authored neighbourhood's anchor is a station or a named venue: a deliberate choice, and
  // it is never replaced. Only a density-chosen cafe anchor may move.
  if (area.kind !== 'cluster') {
    out.push(`${area.id}: authored anchor kept`);
    continue;
  }
  let file;
  try {
    file = JSON.parse(await readFile(new URL(`../public/data/street-world/${area.id}.json`, import.meta.url), 'utf8'));
  } catch {
    out.push(`${area.id}: no built area file, anchor unchanged`);
    continue;
  }
  const idx = M.index(file), scope = { id: area.id, streetIDs: file.streetIDs };
  const ids = new Set(file.placeIDs);
  const cafes = rows.filter(r => kinds[r[2]] === 'cafe' && ids.has(r[0]))
    .map(r => ({ id: r[0], n: r[1], x: r[4], y: r[3], idx: r[7] }));
  const walks = p => {
    const o = M.nearest(idx, [p.x, p.y], scope);
    if (!o) return 0;
    return M.routes(idx, scope, o, cafes).length;
  };
  const current = cafes.find(c => c.id === area.anchor.sourceID);
  let count = current ? walks(current) : 0;
  let moved = null;
  if (!count) {
    for (const c of [...cafes].sort((a, b) => b.idx - a.idx)) {
      const w = walks(c);
      if (w) { moved = c; count = w; break; }
    }
    if (moved) {
      area.anchor = { sourceID: moved.id, x: moved.x, y: moved.y };
      area.anchorName = moved.n;
      area.anchorNote = 'The anchor moved to another real cafe in this circle because the first choice offered no mapped lane to walk.';
    }
  } else if (current) {
    area.anchorName = current.n;
  }
  out.push(`${area.id}: ${count} connected strolls${moved ? ` — anchor moved to ${moved.n}` : ''}`);
}
payload.manifest.anchorRule = 'The anchor is a real cafe inside the area circle with a connected mapped lane route. Where the highest-index cafe offers no stroll, another cafe in the same circle is used and the change is recorded.';
await writeFile(areasUrl, JSON.stringify(payload, null, 2) + '\n');
console.log(out.join('\n'));
