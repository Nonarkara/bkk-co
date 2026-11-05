// The manga style must survive the real OpenMapTiles schema, not the draft that looked like one.
// These assertions exist because a previous prototype of this style was never run: it named a
// vector source with a .pbf template, used source-layers the feed does not have, and wrote
// ["in","class",...] where MapLibre reads a literal, not a property. It failed silently.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const style = JSON.parse(await readFile(new URL('../public/styles/plub-manga.json', import.meta.url), 'utf8'));
const lens = await readFile(new URL('../public/manga-lens.js', import.meta.url), 'utf8');

assert.equal(style.version, 8, 'style version');
assert.ok(style.layers.length >= 15, 'a style with layers');
assert.equal(style.layers[0].id, 'manga-ground', 'the ground is the first layer: a background drawn above the fills would cover them');
assert.equal(style.layers[0].type, 'background', 'the ground is a background layer');

// Source layers the OpenFreeMap/OpenMapTiles feed actually serves.
const SOURCE_LAYERS = new Set(['transportation', 'transportation_name', 'place', 'water', 'waterway', 'landuse', 'landcover', 'park', 'building', 'water_name']);
const ids = new Set();
for (const layer of style.layers) {
  assert.ok(layer.id.startsWith('manga-'), `layer id is namespaced: ${layer.id}`);
  assert.ok(!ids.has(layer.id), `layer id is unique: ${layer.id}`);
  ids.add(layer.id);
  assert.ok(!layer.source || layer.source === 'openmaptiles', `the lens reuses the basemap source, it does not add one: ${layer.id}`);
  if (layer['source-layer']) assert.ok(SOURCE_LAYERS.has(layer['source-layer']), `source-layer exists in the feed: ${layer.id} -> ${layer['source-layer']}`);
  // A filter may only test a property through ["get", prop]. ["in","class",[...]] compares a literal.
  const walk = node => {
    if (!Array.isArray(node)) return;
    if (node[0] === 'in' && typeof node[1] === 'string') assert.fail(`filter reads a literal instead of a property: ${JSON.stringify(node)}`);
    if (node[0] === '==' && typeof node[1] === 'string') assert.fail(`filter compares a literal instead of a property: ${JSON.stringify(node)}`);
    for (const child of node) walk(child);
  };
  walk(layer.filter);
  if (layer.filter) {
    const text = JSON.stringify(layer.filter);
    assert.ok(!/"class"/.test(text) || text.includes('["get","class"]'), `class is read as a property: ${layer.id}`);
  }
  // The style is a drawing. It never states a height, a height source or an entrance.
  const paint = JSON.stringify(layer.paint || {});
  const layout = JSON.stringify(layer.layout || {});
  for (const claim of ['render_height', 'render_min_height', 'heightM', 'render3D', 'fill-extrusion']) {
    assert.ok(!paint.includes(claim) && !layout.includes(claim), `the manga style states no height: ${layer.id} -> ${claim}`);
  }
  assert.notEqual(layer.type, 'fill-extrusion', `the manga style is a drawing; heights live in the street world: ${layer.id}`);
}
assert.ok(!style.sources || !Object.keys(style.sources).length, 'the lens adds no vector source of its own');
assert.ok(!JSON.stringify(style).includes('.pbf'), 'a vector source must resolve TileJSON, never a .pbf template');

// Screentone is drawn at runtime. Every pattern the style asks for must be a tone the lens makes.
const toneIds = new Set([...lens.matchAll(/'(manga-tone-[a-z]+)':/g)].map(m => m[1]));
assert.equal(toneIds.size, 4, 'four screentone tiles: ' + [...toneIds].join(', '));
for (const layer of style.layers) {
  if (!layer.paint || !layer.paint['fill-pattern']) continue;
  assert.ok(toneIds.has(layer.paint['fill-pattern']), `the pattern exists: ${layer.id} -> ${layer.paint['fill-pattern']}`);
}
for (const id of toneIds) assert.ok(lens.includes(`'${id}'`), `the lens draws the tone: ${id}`);

// The lens hides the basemap, never the catalogue. Pins, rings, atlas lenses and routes survive.
const hideFilter = lens.match(/\.filter\(l => (.+?)\)\s*\.map/s);
assert.ok(hideFilter, 'the lens has a base-layer filter');
const baseRule = hideFilter[1];
assert.ok(baseRule.includes("!l.id.startsWith('manga-')"), 'the base list excludes the manga layers it owns');
assert.ok(baseRule.includes("l.type === 'background'"), 'the basemap ground is part of the base list');
assert.ok(baseRule.includes("l.source === 'openmaptiles'"), 'the vector basemap is part of the base list');
assert.ok(baseRule.includes("l.source === 'ne2_shaded'"), 'the shaded relief is part of the base list');
for (const forbidden of ["l.source === 'places'", "l.source === 'hoods'", "l.source === 'route'", "l.source === 'atlas-hats'"]) {
  assert.ok(!baseRule.includes(forbidden), `the lens never hides the app's own layers: ${forbidden}`);
}

console.log('Manga style: version, namespaced layer ids, ground at the bottom, real OpenMapTiles source-layers, property filters (not literals), no declared height, no vector source of its own, four runtime screentone tiles, and a basemap-only hide list pass.');
