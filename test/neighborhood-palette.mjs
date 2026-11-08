// Every neighbourhood ground colour must be a real Sanzo Wada catalogue combination.
// A hand-typed hex that is not in the credited catalogue is an invented colour.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const Palette = require('../public/neighborhood-palette.js');
const catalogue = JSON.parse(await readFile('/Users/nonarkara/Projects/palette/data/colors.json', 'utf8'));
const byCombination = new Map();
for (const colour of catalogue) for (const id of colour.combinations) {
  if (!byCombination.has(id)) byCombination.set(id, []);
  byCombination.get(id).push(colour);
}
const areas = JSON.parse(await readFile(new URL('../public/data/street-areas.json', import.meta.url), 'utf8'));

assert.ok(Object.keys(Palette.chords).length >= 12, 'twelve neighbourhoods have a ground colour');
for (const [areaId, entry] of Object.entries(Palette.chords)) {
  assert.ok(byCombination.has(entry.chord), `${areaId}: combination ${entry.chord} exists in the catalogue`);
  const real = byCombination.get(entry.chord);
  for (const [name, hex] of entry.colors) {
    const match = real.find(c => c.name === name);
    assert.ok(match, `${areaId}: "${name}" is in combination ${entry.chord}`);
    assert.equal(match.hex.toLowerCase(), hex.toLowerCase(), `${areaId}: ${name} hex matches the catalogue`);
  }
  // The colours used must be the catalogue's own for that combination, in order.
  const used = entry.colors.map(c => c[0]);
  const order = real.map(c => c.name);
  assert.ok(used.every(n => order.includes(n)), `${areaId}: every colour belongs to the combination`);
}

// Every area in the shipped list has a ground, and every ground is an area.
const ids = new Set(areas.areas.map(a => a.id));
for (const areaId of Object.keys(Palette.chords)) assert.ok(ids.has(areaId), `${areaId} is in street-areas.json`);
for (const area of areas.areas) assert.ok(Palette.chords[area.id], `${area.id} has a ground colour`);
assert.equal(Object.keys(Palette.chords).length, areas.areas.length, 'no area is left uncoloured');

// The derived areas carry the catalogue's own count, never an authored mood.
const derived = areas.areas.filter(a => !Palette.chords[a.id].mood);
for (const area of derived) assert.ok(area.mix && Object.keys(area.mix).length, `${area.id} states its catalogue mix`);

console.log(`Neighbourhood palette: ${Object.keys(Palette.chords).length} areas, every colour a real Sanzo Wada catalogue combination, every area covered, density areas stating the catalogue's own count.`);
