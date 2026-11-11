// The 3D Screentoned Manga City Walkthrough for Bangkok (PLUB).
// Built with Three.js and custom GLSL halftone screentone & ink edge shaders,
// inspired by the Shanghai model at miaoshen.nonarkara.org.
// Uses real OpenStreetMap footprints, heights, and streets from data/street-world.json.

import * as THREE from './vendor/three/three.module.min.js';
import earcut from './vendor/three/earcut.js';

THREE.ColorManagement.enabled = false;

const TOD = {
  day:   { paper: '#f9c1ce', ink: '#7d133a', sun: [-0.55, 0.62, 0.55], invert: 0, sky: 0.5 },
  dusk:  { paper: '#ffefae', ink: '#7d133a', sun: [0.82, 0.16, -0.35], invert: 0, sky: 0.85 },
  night: { paper: '#064f6e', ink: '#a7d4e4', sun: [0.2, 0.7, -0.3],    invert: 1, sky: 0.9 }
};

const EYE = 1.65;
const CELL = 400;

const GLSL = `
uniform vec3 uPaper, uInk, uSun, uCam;
uniform float uCell, uLine, uInvert, uFogNear, uFogFar;

float ht(vec2 fc, float t, float cell) {
  vec2 p = mat2(.7071,.7071,-.7071,.7071) * fc / cell;
  vec2 g = fract(p) - .5;
  float r = sqrt(clamp(1. - t, 0., 1.) * .3183);
  float aa = fwidth(p.x) * .7 + .001;
  return 1. - smoothstep(r - aa, r + aa, length(g));
}

float hatch(vec2 fc, float cell) {
  float d = (fc.x - fc.y) / (cell * 1.3);
  float f = abs(fract(d) - .5);
  return 1. - smoothstep(.1, .2, f);
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
`;

const BUILD_V = `
varying vec3 vW;
varying vec2 vUw;
flat varying float vInfo;
attribute vec2 uw;
attribute float info;

void main() {
  vec4 w = modelMatrix * vec4(position, 1.);
  vW = w.xyz;
  vUw = uw;
  vInfo = info;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const BUILD_F = GLSL + `
varying vec3 vW;
varying vec2 vUw;
flat varying float vInfo;

void main() {
  float kind = mod(vInfo, 2.);
  float known = mod(floor(vInfo / 2.), 2.);
  float h = floor(vInfo / 4.) * .5;
  vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
  if (dot(n, vW - uCam) > 0.) n = -n;
  float lit = clamp(dot(n, uSun) * .5 + .5, 0., 1.);
  float t = kind > .5 ? mix(.8, .96, lit) : mix(.15, .8, smoothstep(.2, .95, lit));
  float tt = mix(t, 1. - t * .9, uInvert);
  vec2 fc = gl_FragCoord.xy;
  float cell = uCell * (known > .5 ? 1. : 1.3);
  float ink = ht(fc, tt, cell);
  if (kind < .5 && uInvert < .5 && t < .36) ink = max(ink, hatch(fc, uCell) * .85);
  float e = 0.;
  if (kind < .5) {
    float L = vUw.y, du = min(vUw.x, L - vUw.x);
    float fu = max(fwidth(vUw.x), 1e-4), fv = max(fwidth(vW.y), 1e-4);
    float px = min(min(du / fu, (h - vW.y) / fv), vW.y / fv);
    e = 1. - smoothstep(uLine * .55, uLine * 1.35, px);
  }
  vec3 col = mix(uPaper, uInk, clamp(max(ink, e), 0., 1.));
  if (uInvert > .5 && kind < .5) {
    vec2 c = vec2(floor(vUw.x / 3.), floor(vW.y / 3.3));
    float r = hash21(c);
    float win = step(.78, r) * step(.25, fract(vUw.x / 3.)) * step(fract(vUw.x / 3.), .75) * step(.3, fract(vW.y / 3.3)) * step(fract(vW.y / 3.3), .8);
    col = mix(col, vec3(1., .82, .45), win * (1. - e) * .9);
  }
  float f = smoothstep(uFogNear, uFogFar, length(vW - uCam));
  gl_FragColor = vec4(mix(col, uPaper, f), 1.);
}
`;

const FLAT_V = `
varying vec3 vW;
varying float vA;
attribute float across;

void main() {
  vec4 w = modelMatrix * vec4(position, 1.);
  vW = w.xyz;
  vA = across;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const FLAT_F = GLSL + `
varying vec3 vW;
varying float vA;
uniform int uMode;

void main() {
  vec2 fc = gl_FragCoord.xy;
  float ink = 0.;
  if (uMode == 0) { // road
    float fa = max(fwidth(vA), 1e-4);
    float px = min(vA, 1. - vA) / fa;
    ink = 1. - smoothstep(uLine * .5, uLine * 1.2, px);
    ink = max(ink, ht(fc, .9, uCell * 1.1) * .65);
  } else if (uMode == 1) { // water / canal
    float y = fc.y / (uCell * .8) + sin(fc.x * .045) * .12;
    float f = abs(fract(y) - .5);
    ink = 1. - smoothstep(.07, .17, f);
    ink *= .85;
  }
  vec3 col = mix(uPaper, uInk, clamp(ink, 0., 1.));
  float f = smoothstep(uFogNear, uFogFar, length(vW - uCam));
  gl_FragColor = vec4(mix(col, uPaper, f), 1.);
}
`;

const SKY_V = `
varying vec3 vD;
void main() {
  vD = position;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.);
  gl_Position.z = gl_Position.w * .9999;
}
`;

const SKY_F = GLSL + `
varying vec3 vD;
uniform float uSky;
void main() {
  vec3 d = normalize(vD);
  float e = d.y;
  vec3 col = uPaper;
  if (e > 0.) {
    vec2 fc = gl_FragCoord.xy;
    float t = 1. - uSky * smoothstep(.0, .85, e) * .62;
    float ink = ht(fc, t, uCell * 1.5);
    if (uInvert > .5) {
      vec2 c = floor(fc / (uCell * .9));
      ink = ink * .35 + step(.992, hash21(floor(fc / (uCell * .8)))) * .9;
    }
    col = mix(uPaper, uInk, clamp(ink, 0., 1.));
  }
  gl_FragColor = vec4(col, 1.);
}
`;

export async function start(host, options = {}) {
  const opt = Object.assign({
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    areaId: 'ari',
    onSelectPlace: () => {},
    onClose: () => {}
  }, options);

  let disposed = false, scene = null, raf = 0, ro = null;
  const abort = new AbortController();

  function dispose() {
    if (disposed) return;
    disposed = true;
    abort.abort();
    cancelAnimationFrame(raf);
    ro?.disconnect();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('keydown', onEscape, { capture: true });
    if (scene) {
      scene.traverse(o => {
        o.geometry?.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
        }
      });
    }
    renderer?.dispose();
    renderer?.forceContextLoss();
    host.innerHTML = '';
  }

  // Load street data
  let world;
  try {
    const res = await fetch('data/street-world.json', { signal: abort.signal });
    if (!res.ok) throw new Error('data/street-world.json not reachable');
    world = await res.json();
  } catch (err) {
    if (disposed) return;
    host.innerHTML = `<div class="street-3d-error"><p>Could not load 3D street data.</p><button type="button" class="street-3d-close-btn">Return to Map</button></div>`;
    host.querySelector('.street-3d-close-btn')?.addEventListener('click', opt.onClose);
    return { dispose };
  }

  // Create UI shell
  host.innerHTML = `
    <canvas class="model-canvas" tabindex="0" role="img" aria-label="3D Screentoned Manga Bangkok Walkthrough"></canvas>
    <div class="model-bar">
      <div class="model-seg model-seg--area" role="group" aria-label="Neighborhood">
        ${world.areas.map(a => `<button type="button" data-area="${a.id}" ${a.id === opt.areaId ? 'aria-pressed="true"' : ''}>${a.name}</button>`).join('')}
      </div>
      <div class="model-seg model-seg--mode" role="group" aria-label="Camera mode">
        <button type="button" data-mode="walk" aria-pressed="true">Walk (1.65m)</button>
        <button type="button" data-mode="sky">Sky (Flyover)</button>
      </div>
      <div class="model-seg model-seg--tod" role="group" aria-label="Light">
        <button type="button" data-tod="day" aria-pressed="true">Day</button>
        <button type="button" data-tod="dusk">Dusk</button>
        <button type="button" data-tod="night">Night</button>
      </div>
      <span class="model-coverage" aria-live="polite"></span>
      <button type="button" class="model-close" aria-label="Close 3D walkthrough">✕ Map</button>
    </div>
    <div class="model-pins"></div>
    <div class="model-joy" hidden><span></span></div>
    <div class="model-hint">W A S D to walk · Drag to look · Shift to sprint · Double click to land</div>
    <div class="model-card" hidden>
      <h3 class="model-card-title"></h3>
      <p class="model-card-meta"></p>
      <div class="model-card-actions">
        <button type="button" class="model-card-stand">Stand here</button>
        <button type="button" class="model-card-open">Open details</button>
      </div>
      <button type="button" class="model-card-close" aria-label="Close card">✕</button>
    </div>
  `;

  const canvas = host.querySelector('.model-canvas');
  const bar = host.querySelector('.model-bar');
  const coverageEl = host.querySelector('.model-coverage');
  const pinsContainer = host.querySelector('.model-pins');
  const joyEl = host.querySelector('.model-joy');
  const joyKnob = joyEl.querySelector('span');
  const hintEl = host.querySelector('.model-hint');
  const cardEl = host.querySelector('.model-card');
  const closeBtn = host.querySelector('.model-close');

  closeBtn.addEventListener('click', () => {
    dispose();
    opt.onClose();
  });

  const onEscape = e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      dispose();
      opt.onClose();
    }
  };
  window.addEventListener('keydown', onEscape, { capture: true });

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: opt.dpr < 2.01,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(opt.dpr);

  scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(70, 1, 0.5, 4000);

  const U = {
    uPaper:   { value: new THREE.Color() },
    uInk:     { value: new THREE.Color() },
    uSun:     { value: new THREE.Vector3() },
    uCam:     { value: cam.position },
    uCell:    { value: 4.5 * opt.dpr },
    uLine:    { value: 1.15 * opt.dpr },
    uInvert:  { value: 0 },
    uFogNear: { value: 700 },
    uFogFar:  { value: 2400 },
    uSky:     { value: 0.5 }
  };

  const matB = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: BUILD_V,
    fragmentShader: BUILD_F,
    side: THREE.DoubleSide
  });

  const matRoad = new THREE.ShaderMaterial({
    uniforms: Object.assign({ uMode: { value: 0 } }, U),
    vertexShader: FLAT_V,
    fragmentShader: FLAT_F,
    side: THREE.DoubleSide
  });

  const matWater = new THREE.ShaderMaterial({
    uniforms: Object.assign({ uMode: { value: 1 } }, U),
    vertexShader: FLAT_V,
    fragmentShader: FLAT_F,
    side: THREE.DoubleSide
  });

  const skyMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({ uSky: U.uSky }, U),
    vertexShader: SKY_V,
    fragmentShader: SKY_F,
    side: THREE.BackSide,
    depthWrite: false
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 24, 12), skyMat);
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  scene.add(sky);

  // Time of Day
  let tod = 'day';
  function setTod(k) {
    tod = k;
    const t = TOD[k];
    U.uPaper.value.set(t.paper);
    U.uInk.value.set(t.ink);
    U.uSun.value.set(...t.sun).normalize();
    U.uInvert.value = t.invert;
    U.uSky.value = t.sky;
    renderer.setClearColor(t.paper);
    bar.querySelectorAll('[data-tod]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tod === k)));
    dirty = true;
  }

  // Camera State
  const S = {
    mode: 'walk',
    px: 0, pz: 0,
    wyaw: 0, wpitch: -0.02,
    x: 0, z: 0,
    dist: 350, yaw: -0.45, pitch: 0.6,
    speed: 7
  };

  let activeArea = world.areas.find(a => a.id === opt.areaId) || world.areas[0];
  let project = (lat, lng) => ({ x: 0, z: 0 });
  let unproject = (x, z) => ({ lat: 0, lng: 0 });
  let collisionGrid = new Map();
  const GR = 40;
  let currentMeshes = [];
  let placePins = [];

  function blocked(x, z) {
    const key = Math.floor(x / GR) + ',' + Math.floor(z / GR);
    const polys = collisionGrid.get(key);
    if (!polys) return false;
    for (const poly of polys) {
      let inside = false;
      const n = poly.length / 2;
      for (let a = 0, b = n - 1; a < n; b = a++) {
        const xa = poly[a * 2], za = poly[a * 2 + 1];
        const xb = poly[b * 2], zb = poly[b * 2 + 1];
        if ((za > z) !== (zb > z) && x < (xb - xa) * (z - za) / (zb - za) + xa) {
          inside = !inside;
        }
      }
      if (inside) return true;
    }
    return false;
  }

  function freeSpot(x, z) {
    if (!blocked(x, z)) return [x, z];
    for (let r = 3; r <= 80; r += 3) {
      for (let a = 0; a < 16; a++) {
        const xx = x + Math.cos(a / 16 * Math.PI * 2) * r;
        const zz = z + Math.sin(a / 16 * Math.PI * 2) * r;
        if (!blocked(xx, zz)) return [xx, zz];
      }
    }
    return [x, z];
  }

  async function loadArea(area) {
    activeArea = area;
    bar.querySelectorAll('[data-area]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.area === area.id)));
    // One file per neighbourhood: the index carries the list, the area file carries the geometry.
    try {
      const res = await fetch(`data/street-world/${area.id}.json`, { signal: abort.signal });
      if (!res.ok) throw new Error('area file not reachable');
      const file = await res.json();
      world.buildings = file.buildings; world.streets = file.streets;
      world.placeIDs = file.placeIDs || [];
    } catch (err) {
      if (!disposed) console.warn('Area file unavailable', area.id, err);
      return;
    }

    // Clean up old meshes
    for (const m of currentMeshes) {
      scene.remove(m);
      m.geometry.dispose();
    }
    currentMeshes = [];
    collisionGrid.clear();
    pinsContainer.innerHTML = '';
    placePins = [];

    const origin = [area.anchor.y, area.anchor.x];
    const MX = 111320 * Math.cos(origin[0] * Math.PI / 180), MY = 110574;
    project = (lat, lng) => ({ x: (lng - origin[1]) * MX, z: -(lat - origin[0]) * MY });
    unproject = (x, z) => ({ lat: origin[0] - z / MY, lng: origin[1] + x / MX });

    // Extrude buildings in area
    // The area file holds exactly this neighbourhood's footprints.
    const bList = world.buildings.features.slice();

    // Prepare vertex buffers
    let nv = 0, ni = 0;
    for (const b of bList) {
      const geom = b.geometry;
      const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
      for (const poly of polys) {
        const ring = poly[0];
        if (ring.length < 3) continue;
        const n = ring.length;
        nv += 4 * n + n;
        ni += 6 * n + 3 * (n - 2);
      }
    }

    const pos = new Float32Array(nv * 3);
    const uw = new Float32Array(nv * 2);
    const info = new Float32Array(nv);
    const idx = new Uint32Array(ni);

    let v = 0, t = 0;
    const flat = [];
    // Flat footprint lines for every building (urban fabric, zero invented height)
    const fpPos = [], fpIdx = [];
    let fpv = 0, knownCount = 0;

    for (const b of bList) {
      const geom = b.geometry;
      const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
      const known = b.properties?.heightM != null;
      const h = known ? Math.max(3.5, b.properties.heightM) : 0;
      const wi = known ? Math.floor(h * 2) * 4 + 2 : 0;

      for (const poly of polys) {
        const ring = poly[0];
        if (ring.length < 3) continue;
        flat.length = 0;
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;

        for (let k = 0; k < ring.length; k++) {
          const pt = ring[k];
          const p = project(pt[1], pt[0]);
          flat.push(p.x, p.z);
          x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
          z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z);
        }

        // Spatial collision hash for all footprints
        for (let gx = Math.floor(x0 / GR); gx <= Math.floor(x1 / GR); gx++) {
          for (let gz = Math.floor(z0 / GR); gz <= Math.floor(z1 / GR); gz++) {
            const key = gx + ',' + gz;
            if (!collisionGrid.has(key)) collisionGrid.set(key, []);
            collisionGrid.get(key).push(flat.slice());
          }
        }

        // Flat footprint outline for every building — visible city fabric, no invented height
        const n = ring.length - 1;
        for (let k = 0; k < n; k++) {
          const xa = flat[k * 2], za = flat[k * 2 + 1];
          const xb = flat[(k + 1) % n * 2], zb = flat[(k + 1) % n * 2 + 1];
          fpPos.push(xa, 0.05, za, xb, 0.05, zb);
          fpIdx.push(fpv, fpv + 1);
          fpv += 2;
        }

        if (!known) continue;
        knownCount++;

        // Walls
        for (let k = 0; k < n; k++) {
          const xa = flat[k * 2], za = flat[k * 2 + 1];
          const xb = flat[(k + 1) * 2], zb = flat[(k + 1) * 2 + 1];
          const L = Math.hypot(xb - xa, zb - za);
          const p = v * 3;
          pos.set([xa, 0, za, xb, 0, zb, xb, h, zb, xa, h, za], p);
          uw.set([0, L, L, L, L, L, 0, L], v * 2);
          info[v] = info[v + 1] = info[v + 2] = info[v + 3] = wi;
          idx[t++] = v; idx[t++] = v + 1; idx[t++] = v + 2;
          idx[t++] = v; idx[t++] = v + 2; idx[t++] = v + 3;
          v += 4;
        }

        // Roof
        const tris = earcut(flat);
        const base = v;
        for (let k = 0; k < ring.length; k++) {
          pos.set([flat[k * 2], h, flat[k * 2 + 1]], v * 3);
          info[v] = wi + 1;
          v++;
        }
        for (let k = 0; k < tris.length; k++) {
          idx[t++] = base + tris[k];
        }
      }
    }

    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, v * 3), 3));
    bGeo.setAttribute('uw', new THREE.BufferAttribute(uw.subarray(0, v * 2), 2));
    bGeo.setAttribute('info', new THREE.BufferAttribute(info.subarray(0, v), 1));
    bGeo.setIndex(new THREE.BufferAttribute(idx.subarray(0, t), 1));
    bGeo.computeVertexNormals();

    const bMesh = new THREE.Mesh(bGeo, matB);
    scene.add(bMesh);
    currentMeshes.push(bMesh);

    // Flat footprint outlines for every building — visible city fabric, no invented height
    if (fpPos.length) {
      const fpGeo = new THREE.BufferGeometry();
      fpGeo.setAttribute('position', new THREE.Float32BufferAttribute(fpPos, 3));
      const fpMat = new THREE.LineBasicMaterial({ color: 0x20201d });
      const fpMesh = new THREE.LineSegments(fpGeo, fpMat);
      scene.add(fpMesh);
      currentMeshes.push(fpMesh);
    }

    // Coverage indicator: how many buildings have explicit, sourced heights
    const total = bList.length;
    if (coverageEl) {
      coverageEl.textContent = knownCount + ' / ' + total + ' mapped heights';
      coverageEl.style.fontSize = '11px';
      coverageEl.style.color = 'var(--muted, #575951)';
      coverageEl.style.padding = '0 8px';
      coverageEl.style.borderLeft = '1px solid var(--rule, #d5d7cf)';
      coverageEl.style.marginLeft = '8px';
    }

    // Build road ribbons
    const smap = new Map(world.streets.features.map(f => [f.id, f]));
    const roadPoints = [], roadAcross = [], roadIdx = [];
    let rv = 0;

    for (const id of area.streetIDs) {
      const s = smap.get(id);
      if (!s) continue;
      const coords = s.geometry.coordinates;
      if (coords.length < 2) continue;
      const hw = s.properties?.highway || '';
      const w = ['primary', 'secondary', 'trunk'].includes(hw) ? 4.5 : ['footway', 'pedestrian', 'path'].includes(hw) ? 1.8 : 3.0;

      const pts = [];
      for (const pt of coords) {
        const p = project(pt[1], pt[0]);
        if (!pts.length || Math.hypot(p.x - pts[pts.length - 1].x, p.z - pts[pts.length - 1].z) > 0.5) {
          pts.push(p);
        }
      }
      if (pts.length < 2) continue;

      for (let k = 0; k < pts.length; k++) {
        const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
        let dx = b.x - a.x, dz = b.z - a.z;
        const l = Math.hypot(dx, dz) || 1;
        dx /= l; dz /= l;
        roadPoints.push(pts[k].x - dz * w, 0.05, pts[k].z + dx * w, pts[k].x + dz * w, 0.05, pts[k].z - dx * w);
        roadAcross.push(0, 1);
        if (k > 0) {
          const b0 = rv + (k - 1) * 2;
          roadIdx.push(b0, b0 + 1, b0 + 2, b0 + 1, b0 + 3, b0 + 2);
        }
      }
      rv += pts.length * 2;
    }

    if (roadPoints.length) {
      const rGeo = new THREE.BufferGeometry();
      rGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPoints, 3));
      rGeo.setAttribute('across', new THREE.Float32BufferAttribute(roadAcross, 1));
      rGeo.setIndex(roadIdx);
      const rMesh = new THREE.Mesh(rGeo, matRoad);
      scene.add(rMesh);
      currentMeshes.push(rMesh);
    }

    // Position player on nearest free spot to area anchor
    const [startPx, startPz] = freeSpot(0, 0);
    S.px = startPx;
    S.pz = startPz;
    S.x = startPx;
    S.z = startPz;
    S.wyaw = 0;

    // Load Places for this area
    createPins(area);
    dirty = true;
  }

  function createPins(area) {
    if (!window.state?.places) return;
    const places = window.state.places;
    const areaPlaces = places.filter(p => {
      const pt = project(p.y, p.x);
      return Math.hypot(pt.x, pt.z) <= (area.radiusM || 800);
    });

    placePins = areaPlaces.slice(0, 45).map(p => {
      const pt = project(p.y, p.x);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `model-pin pin-${p.k}`;
      btn.setAttribute('aria-label', p.n);
      btn.innerHTML = `<span class="pin-dot ${p.k}"></span><span class="pin-tag">${p.n.slice(0, 18)}</span>`;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openCard(p, pt);
      });
      pinsContainer.appendChild(btn);
      return { p, x: pt.x, z: pt.z, btn };
    });
  }

  function openCard(p, pt) {
    cardEl.hidden = false;
    cardEl.querySelector('.model-card-title').textContent = p.n;
    cardEl.querySelector('.model-card-meta').textContent = `✦${p.idx} Oldenburg index · ${p.k} · ${Math.round(Math.hypot(pt.x - S.px, pt.z - S.pz))} m away`;

    cardEl.querySelector('.model-card-stand').onclick = () => {
      const [fx, fz] = freeSpot(pt.x, pt.z + 12);
      S.px = fx;
      S.pz = fz;
      S.x = fx;
      S.z = fz;
      cardEl.hidden = true;
      dirty = true;
    };

    cardEl.querySelector('.model-card-open').onclick = () => {
      cardEl.hidden = true;
      if (opt.onSelectPlace) opt.onSelectPlace(p);
    };

    cardEl.querySelector('.model-card-close').onclick = () => {
      cardEl.hidden = true;
    };
  }

  // Camera positioning
  function placeCamera() {
    if (S.mode === 'sky') {
      const cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
      cam.position.set(S.x + Math.sin(S.yaw) * cp * S.dist, Math.max(10, sp * S.dist), S.z + Math.cos(S.yaw) * cp * S.dist);
      cam.lookAt(S.x, 0, S.z);
      U.uFogNear.value = 1200;
      U.uFogFar.value = 4000;
    } else {
      cam.position.set(S.px, EYE, S.pz);
      cam.rotation.order = 'YXZ';
      cam.rotation.set(S.wpitch, S.wyaw, 0);
      U.uFogNear.value = 500;
      U.uFogFar.value = 2400;
    }
  }

  function setMode(m) {
    S.mode = m;
    cam.fov = m === 'walk' ? 70 : 55;
    cam.updateProjectionMatrix();
    bar.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    hintEl.textContent = m === 'walk'
      ? (matchMedia('(pointer: coarse)').matches ? 'Drag to look. Slide circle to walk.' : 'W A S D to walk · Drag to look · Shift to sprint')
      : (matchMedia('(pointer: coarse)').matches ? 'Drag to turn · Pinch to zoom · Double-tap to stand' : 'Drag to rotate · Scroll to zoom · Double-click to land');
    joyEl.hidden = !(matchMedia('(pointer: coarse)').matches && m === 'walk');
    dirty = true;
  }

  // Input handling
  const keys = new Set();
  function onKeyDown(e) {
    if (e.target.matches('input, select, textarea')) return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
      keys.add(k);
    }
  }
  function onKeyUp(e) {
    keys.delete(e.key.toLowerCase());
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  let ptr = new Map(), dragMoved = 0, lastTap = 0;
  canvas.addEventListener('pointerdown', e => {
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(e.pointerId);
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragMoved = 0;
  });

  canvas.addEventListener('pointermove', e => {
    const p = ptr.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    dragMoved += Math.hypot(dx, dy);
    p.x = e.clientX;
    p.y = e.clientY;

    if (S.mode === 'sky') {
      S.yaw -= dx * 0.005;
      S.pitch = Math.max(0.12, Math.min(1.4, S.pitch + dy * 0.004));
    } else {
      S.wyaw -= dx * 0.0045;
      S.wpitch = Math.max(-1.15, Math.min(1.15, S.wpitch - dy * 0.004));
    }
    dirty = true;
  });

  const up = e => {
    const p = ptr.get(e.pointerId);
    ptr.delete(e.pointerId);
    if (p && dragMoved < 6 && e.type === 'pointerup') {
      const now = performance.now();
      if (now - lastTap < 350 && S.mode === 'sky') {
        // Double-click to land
        const raycaster = new THREE.Raycaster();
        const rect = canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(mouse, cam);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const hit = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, hit)) {
          const [fx, fz] = freeSpot(hit.x, hit.z);
          S.px = fx; S.pz = fz; S.x = fx; S.z = fz;
          setMode('walk');
        }
      }
      lastTap = now;
    }
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (S.mode === 'sky') {
      S.dist = Math.max(40, Math.min(1500, S.dist * Math.exp(e.deltaY * 0.0012)));
      dirty = true;
    }
  }, { passive: false });

  // Touch joystick
  let joy = { x: 0, y: 0 }, joyId = null, joyCx = 0, joyCy = 0;
  joyEl.addEventListener('pointerdown', e => {
    joyId = e.pointerId;
    joyEl.setPointerCapture(joyId);
    const r = joyEl.getBoundingClientRect();
    joyCx = r.left + r.width / 2;
    joyCy = r.top + r.height / 2;
    moveJoy(e);
    e.stopPropagation();
  });
  function moveJoy(e) {
    if (e.pointerId !== joyId) return;
    let dx = (e.clientX - joyCx) / 44, dy = (e.clientY - joyCy) / 44;
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    joy = { x: dx, y: dy };
    joyKnob.style.transform = `translate(${dx * 32}px, ${dy * 32}px)`;
  }
  joyEl.addEventListener('pointermove', moveJoy);
  const endJoy = e => {
    if (e.pointerId !== joyId) return;
    joyId = null;
    joy = { x: 0, y: 0 };
    joyKnob.style.transform = '';
  };
  joyEl.addEventListener('pointerup', endJoy);
  joyEl.addEventListener('pointercancel', endJoy);

  // Bar interactions
  bar.addEventListener('click', e => {
    const areaBtn = e.target.closest('[data-area]');
    if (areaBtn) {
      const a = world.areas.find(x => x.id === areaBtn.dataset.area);
      if (a) void loadArea(a);
      return;
    }
    const modeBtn = e.target.closest('[data-mode]');
    if (modeBtn) {
      setMode(modeBtn.dataset.mode);
      return;
    }
    const todBtn = e.target.closest('[data-tod]');
    if (todBtn) {
      setTod(todBtn.dataset.tod);
      return;
    }
  });

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    dirty = true;
  }
  ro = new ResizeObserver(resize);
  ro.observe(host);

  function layoutPins() {
    const w = host.clientWidth, h = host.clientHeight;
    const posVec = new THREE.Vector3();
    const cx = S.mode === 'walk' ? S.px : cam.position.x;
    const cz = S.mode === 'walk' ? S.pz : cam.position.z;

    for (const item of placePins) {
      const dist = Math.hypot(item.x - cx, item.z - cz);
      if (dist > 450) {
        item.btn.hidden = true;
        continue;
      }
      posVec.set(item.x, 3.5, item.z);
      posVec.project(cam);
      if (posVec.z > 1 || posVec.z < -1) {
        item.btn.hidden = true;
        continue;
      }
      const sx = (posVec.x * 0.5 + 0.5) * w;
      const sy = (-posVec.y * 0.5 + 0.5) * h;
      item.btn.hidden = false;
      item.btn.style.transform = `translate(${sx}px, ${sy}px)`;
    }
  }

  // Animation Loop
  let dirty = true, prev = performance.now();
  function loop(now) {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;

    if (S.mode === 'walk') {
      let f = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - joy.y;
      let s = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0) + joy.x;
      const turn = (keys.has('q') ? 1 : 0) - (keys.has('e') ? 1 : 0);
      if (turn) {
        S.wyaw += turn * dt * 1.6;
        dirty = true;
      }
      if (f || s) {
        const sp = S.speed * (keys.has('shift') ? 2.5 : 1);
        const sy = Math.sin(S.wyaw), cy = Math.cos(S.wyaw);
        const dx = (-sy * f + cy * s) * sp * dt;
        const dz = (-cy * f - sy * s) * sp * dt;
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.4));
        for (let i = 0; i < steps; i++) {
          const nx = S.px + dx / steps;
          const nz = S.pz + dz / steps;
          if (!blocked(nx, nz)) {
            S.px = nx; S.pz = nz;
          } else if (!blocked(nx, S.pz)) {
            S.px = nx;
          } else if (!blocked(S.px, nz)) {
            S.pz = nz;
          }
        }
        S.x = S.px; S.z = S.pz;
        dirty = true;
      }
    }

    if (dirty) {
      dirty = false;
      placeCamera();
      sky.position.copy(cam.position);
      renderer.render(scene, cam);
      layoutPins();
    }
  }

  // Initialize
  setTod('day');
  setMode('walk');
  await loadArea(activeArea);
  resize();
  requestAnimationFrame(() => canvas.focus({ preventScroll: true }));
  raf = requestAnimationFrame(loop);

  return {
    dispose,
    setArea: id => {
      const a = world.areas.find(x => x.id === id);
      if (a) void loadArea(a);
    },
    standAt: (lat, lng) => {
      const pt = project(lat, lng);
      const [fx, fz] = freeSpot(pt.x, pt.z);
      S.px = fx; S.pz = fz; S.x = fx; S.z = fz;
      dirty = true;
    }
  };
}
