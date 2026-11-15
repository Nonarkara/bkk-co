// The hotspot layer is a hat monotile tessellation. This checks the patch is a real tiling:
// one 13-gon, both orientations, no interior overlaps, and area conserved on a grid.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
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
assert.ok(atlas.includes("type: 'heatmap'")&&atlas.includes('atlas-hats'),'Both earned heatmap and optional tiles are retained');
assert.ok(atlas.includes('Smith, Myers, Kaplan'));
const D=createRequire(import.meta.url)('../public/hat-density.js');
for(const [bounds,zoom]of[[[100.48,13.7,100.6,13.8],12.5],[[100.6,13.74,100.7,13.82],13],[[100.531,13.742,100.539,13.748],17]]){
 const g=D.geometry(bounds,zoom,H),points=[];
 for(let x=0;x<30;x++)for(let y=0;y<30;y++)points.push({id:'p'+x+'-'+y,x:bounds[0]+(bounds[2]-bounds[0])*(x+.31)/30,y:bounds[1]+(bounds[3]-bounds[1])*(y+.43)/30});
 const counts=D.tally(g,points);assert.equal(counts.reduce((a,b)=>a+b,0),points.length,'Every sampled geographic point counted once');
 const fc=D.featureCollection(g,counts);assert.equal(fc.features.reduce((a,f)=>a+f.properties.n,0),points.length);assert(fc.features.every(f=>f.geometry.coordinates[0].length===14));
 assert(D.covers(g,bounds,zoom));assert(!D.covers(g,bounds,zoom+1),'Zoom must rebuild geometry');
 const moved=[bounds[0]+.5,bounds[1],bounds[2]+.5,bounds[3]];assert(!D.covers(g,moved,zoom),'Pan out of patch must rebuild');
 const replacement=points.slice(0,30).map((p,i)=>({...p,id:'different'+i,x:bounds[0]+.001,y:bounds[1]+.001}));assert.notDeepEqual([...D.tally(g,replacement)],[...counts],'Different place sets change counts, without a prefix/suffix hash shortcut');
}
assert.ok(atlas.includes("m.on('moveend', () => {updateDock();syncHats()})"),'Movement triggers actual retally/rebuild');
// Exercise the browser module's selection path: the geometry tests above can pass
// even when the UI drops every non-café before tallying.
for (const kind of ['cannabis', 'coworking']) {
 const window={};
 const state={clubMode:kind==='cannabis',kinds:new Set([kind]),flags:new Set(['wifi'])};
 const places=[{id:'selected',k:kind},{id:'other',k:'cafe'}], visible=[];
 runInNewContext(atlas,{window,state,AtlasModel:{},refresh:()=>{
   visible.splice(0,visible.length,...places.filter(p=>state.kinds.has(p.k)&&window.Atlas.includes(p)).map(p=>p.id));
 }});
 await window.Atlas.toggleHats();
 assert.equal(window.Atlas.lens,'hats');
 assert.deepEqual(visible,['selected'],`Tiles must count the selected ${kind} map`);
 assert.deepEqual([...state.flags],['wifi']);
 await window.Atlas.toggleHats();
 assert.equal(window.Atlas.lens,'all');
 assert.deepEqual(visible,['selected']);
}
console.log(`hat patch L2: ${patch.hats.length} tiles, grid cover ${(inside / samples).toFixed(3)}, samples ${samples}`);
