// Every colour that marks a place is a colour the Sanzo Wada catalogue actually owns.
//
// A hand-typed hex is an invented colour. It was invented once already: a fifth
// data role was given "#b39ddb Wisteria", which appears nowhere in the credited
// catalogue, and was written into STYLE.md as if it were credited. The legend
// then showed five swatches while its own source sentence named four.
//
// These checks read the proved catalogue and compare, so the door closes.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repo = new URL('../', import.meta.url);
const read = async p => readFile(new URL(p, repo), 'utf8');

const proof = JSON.parse(await read('docs/stroll-2026-11-07/zoom-mood-provenance.json'));
const real = new Map();                       // hex (lower) -> catalogue name
for (const [plate, cols] of Object.entries(proof.combinations)) {
  for (const c of cols) if (!real.has(c.hex.toLowerCase())) real.set(c.hex.toLowerCase(), `${c.name} (plate ${plate})`);
}

// --- the data-role chord ---------------------------------------------------------
const palette = await read('public/footprint-palette.js');
const chordBlock = palette.match(/const chord=\[(.*?)\];/s);
assert.ok(chordBlock, 'the footprint palette still declares its chord');
const chord = [...chordBlock[1].matchAll(/\{kind:'([^']+)',name:'([^']+)',color:'([^']+)'\}/g)]
  .map(m => ({ kind: m[1], name: m[2], color: m[3] }));
assert.ok(chord.length >= 4, 'the chord still carries the four data roles');

for (const role of chord) {
  assert.ok(real.has(role.color.toLowerCase()),
    `the "${role.name}" mark uses ${role.color}, which the catalogue does not own — an invented colour`);
}
// No two data roles may wear the same colour: a colour has one job.
const seen = new Map();
for (const role of chord) {
  assert.ok(!seen.has(role.color.toLowerCase()),
    `"${role.name}" and "${seen.get(role.color.toLowerCase())}" share ${role.color}`);
  seen.set(role.color.toLowerCase(), role.name);
}

// --- the legend names the colours it shows ---------------------------------------
const sentence = palette.match(/Sanzo Wada combination (\d+): ([^.]*)\./);
assert.ok(sentence, 'the legend still states which plate its colours come from');
const plate = Number(sentence[1]);
const plateNames = new Set((proof.combinations[plate] || []).map(c => c.name));
const named = sentence[2].split(',').map(s => s.trim()).filter(Boolean);
for (const role of chord) {
  const catalogueName = (proof.combinations[plate] || []).find(c => c.hex.toLowerCase() === role.color.toLowerCase());
  assert.ok(catalogueName, `"${role.name}" uses ${role.color}, which is not a colour of plate ${plate}`);
  assert.ok(named.includes(catalogueName.name),
    `the legend shows a "${role.name}" swatch but its source sentence does not name ${catalogueName.name}`);
}
assert.equal(named.length, chord.length,
  `the legend's source sentence names ${named.length} colours but the key shows ${chord.length}`);

// --- and the interface tokens are catalogue colours too --------------------------
const style = await read('public/style.css');
const tokens = [...style.matchAll(/--(cat-[a-z]+|ink|ink-80|ink-45|rule|guide|accent):\s*(#[0-9a-fA-F]{6})/g)]
  .map(m => ({ name: m[1], hex: m[2].toLowerCase() }));
assert.ok(tokens.length >= 8, 'the interface still declares its colour tokens');

// An ink step is a proven blend of the ink toward white, not a new hue.
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const ink = tokens.find(t => t.name === 'ink');
assert.ok(ink, 'the ink token exists');
const blendOf = (hex, base, toward = [255, 255, 255]) => {
  const a = rgb(hex), b = rgb(base), w = toward;
  const ts = a.map((v, i) => (b[i] === w[i] ? 0 : (v - w[i]) / (b[i] - w[i])));
  return ts.every(t => Math.abs(t - ts[0]) < 0.02) ? ts[0] : null;
};
for (const t of tokens) {
  if (t.name.startsWith('ink')) {
    const k = blendOf(t.hex, ink.hex);
    assert.ok(k !== null, `--${t.name} is ${t.hex}, which is not a blend of the ink toward white — an invented colour`);
    continue;
  }
  assert.ok(real.has(t.hex), `--${t.name} is ${t.hex}, which the catalogue does not own — an invented colour`);
}

// --- the accent has exactly one job ------------------------------------------------
const accent = tokens.find(t => t.name === 'accent');
assert.ok(accent, 'the accent token still exists');
const accentUses = [...style.matchAll(/var\(--accent\)/g)].length;
assert.ok(accentUses <= 4, `the accent wears ${accentUses} jobs in one stylesheet; it has one`);
const otherFiles = ['public/list-tools.css', 'public/discovery.css', 'public/street-world-3d.css', 'public/views.js', 'public/app.js'];
for (const file of otherFiles) {
  const body = await read(file);
  const uses = (body.match(/var\(--accent\)|#f99d1b/g) || []).length;
  assert.ok(uses <= 3, `${file} uses the accent ${uses} times; it has one job`);
}

console.log(`Data-role palette: ${chord.length} marks, every colour a real catalogue colour, the legend names exactly what the key shows.`);
