// The hotspot layer is a hat monotile tessellation. This checks the patch is a real tiling:
// one 13-gon, both orientations, no interior overlaps, and area conserved on a grid.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const H = createRequire(import.meta.url)('../public/einstein-hat.js');
const pip = (x, y, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i],
      [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const patch = H.patch(2);
assert.ok(patch.hats.length > 8, 'substitution should build more than the four seed hats');
assert.ok(patch.hats.some((h) => h.reflected) && patch.hats.some((h) => !h.reflected), 'the hat tiling uses reflections');
const proto = patch.hatArea;
for (const h of patch.hats) {
  assert.equal(h.ring.length, 13);
  assert.ok(Math.abs(Math.abs(H.area(h.ring)) - proto) / proto < 1e-6);
  assert.equal(new Set(h.ring.map((p) => p.join(','))).size, 13);
}

const cell = patch.hatSpan / 10;
const bins = new Map();
patch.hats.forEach((h, i) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of h.ring) {
    x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
  }
  h.box = [x0, y0, x1, y1];
  for (let ix = Math.floor(x0 / cell); ix <= Math.floor(x1 / cell); ix++)
    for (let iy = Math.floor(y0 / cell); iy <= Math.floor(y1 / cell); iy++) {
      const k = ix + ',' + iy;
      const a = bins.get(k);
      if (a) a.push(i);
      else bins.set(k, [i]);
    }
});
let inside = 0, multi = 0, samples = 0;
for (let x = patch.minX + cell / 2; x < patch.maxX; x += cell)
  for (let y = patch.minY + cell / 2; y < patch.maxY; y += cell) {
    samples++;
    const hits = bins.get(Math.floor(x / cell) + ',' + Math.floor(y / cell)) || [];
    let n = 0;
    for (const i of hits) {
      const b = patch.hats[i].box;
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      if (pip(x, y, patch.hats[i].ring)) n++;
    }
    if (n > 1) multi++;
    if (n === 1) inside++;
  }
assert.equal(multi, 0, 'hat interiors overlap');
const hatArea = patch.hats.length * proto;
const gridArea = inside * cell * cell;
assert.ok(gridArea > hatArea * 0.9 && gridArea < hatArea * 1.08, `grid ${gridArea} vs hats ${hatArea}`);
assert.ok(inside / samples > 0.45, 'the patch should cover most of its own bounds');

const atlas = await readFile(new URL('../public/atlas.js', import.meta.url), 'utf8');
const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
assert.equal(atlas.includes("type: 'heatmap'"), false, 'the hotspot blur is replaced by hat tiles');
assert.ok(atlas.includes('atlas-hats') && atlas.includes('Smith, Myers, Kaplan'));
assert.ok(app.includes('arxiv.org/abs/2303.10798'));
assert.ok(H.legendSVG().includes('fill="#7d133a"') && !H.legendSVG().includes('rect'));
console.log(`hat patch L2: ${patch.hats.length} tiles, grid cover ${(inside / samples).toFixed(3)}, samples ${samples}`);
