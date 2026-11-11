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
    onError: () => {},
    placeById: () => undefined,
    onSelectPlace: () => {},
    onClose: () => {}
  }, options);

  let disposed = false, scene = null, renderer = null, raf = 0, ro = null;
  const abort = new AbortController();
  let onKeyDown, onKeyUp;

  function dispose() {
    if (disposed) return;
    disposed = true;
    abort.abort();
    cancelAnimationFrame(raf);
    ro?.disconnect();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', clearInput);
    document.removeEventListener('visibilitychange', visibilityChanged);
    opt.signal?.removeEventListener('abort', dispose);
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
    delete host.dataset.ready;
    delete host.dataset.area;
    delete host.dataset.volumes;
    delete host.dataset.streets;
    host.innerHTML = '';
  }

  let clearInput = () => {};
  let visibilityChanged = () => {};
  opt.signal?.addEventListener('abort', dispose, { once: true });
  if (opt.signal?.aborted) { dispose(); return; }
  const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(20000)]);
  try {

  const res = await fetch('data/street-world.json', { signal });
  if (!res.ok) throw new Error('Street index unavailable');
  const world = await res.json();
  if (disposed) return;
  const areas = world.areas;
  if (!Array.isArray(areas) || !areas.length) throw new Error('Street index has no neighbourhoods');
  const origin = opt.origin;
  const nearest = origin && areas.reduce((best, area) => {
    const distance = Math.hypot(area.anchor.x - origin.x, area.anchor.y - origin.y);
    return distance < best.distance ? { area, distance } : best;
  }, { distance: Infinity }).area;
  const startArea = areas.find(area => area.id === opt.areaId) || nearest || areas[0];
  const areaOptions = areas.map(area => {
    const option = new Option(area.id === 'ramkhamhaeng' ? 'Ramkhamhaeng' : area.name, area.id, area.id === startArea.id, area.id === startArea.id);
    return option.outerHTML;
  }).join('');

  // Create UI shell
  host.innerHTML = `
    <canvas class="model-canvas" tabindex="0" role="img" aria-label="3D Screentoned Manga Bangkok Walkthrough"></canvas>
    <div class="model-bar">
      <label class="model-area"><span class="sr">Neighbourhood</span><select aria-label="Neighbourhood">${areaOptions}</select></label>
      <div class="model-seg model-seg--mode" role="group" aria-label="Camera mode">
        <button type="button" data-mode="sky" aria-pressed="true">Overview</button>
        <button type="button" data-mode="walk" aria-pressed="false">Street level</button>
      </div>
      <label class="model-light"><span class="sr">Light</span><select aria-label="Light"><option value="day">Day</option><option value="dusk">Dusk</option><option value="night">Night</option></select></label>
      <button type="button" class="model-close" aria-label="Back to map">Back to map</button>
      <p class="model-coverage" role="status"></p>
    </div>
    <div class="model-pins"></div>
    <div class="model-bottom">
    <div class="model-card" hidden>
      <h3 class="model-card-title"></h3>
      <p class="model-card-meta"></p>
      <div class="model-card-actions">
        <button type="button" class="model-card-stand">Street nearby</button>
        <button type="button" class="model-card-open">Open details</button>
      </div>
      <button type="button" class="model-card-close" aria-label="Close card">✕</button>
    </div>
    <div class="model-joy" hidden><span></span></div>
    <div class="model-footer">
      <div class="model-hint"></div>
      <a class="model-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>
      <a class="model-attribution" href="https://overturemaps.org/" target="_blank" rel="noopener">Places © Overture Maps</a>
    </div>
    </div>
  `;

  const canvas = host.querySelector('.model-canvas');
  const bar = host.querySelector('.model-bar');
  const coverageEl = host.querySelector('.model-coverage');
  const pinsContainer = host.querySelector('.model-pins');
  const joyEl = host.querySelector('.model-joy');
  const joyKnob = joyEl.querySelector('span');
  const hintEl = host.querySelector('.model-hint');
  const bottomBar = host.querySelector('.model-bottom');
  const cardEl = host.querySelector('.model-card');
  const closeBtn = host.querySelector('.model-close');

  closeBtn.addEventListener('click', () => {
    dispose();
    opt.onClose();
  });

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: opt.dpr < 2.01,
    powerPreference: 'high-performance'
  });
  let shaderFailed = false;
  renderer.debug.onShaderError = () => { shaderFailed = true; };
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    if (!disposed) { dispose(); opt.onError(); }
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
    uniforms: U,
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
    lightSelect.value = k;
    invalidate();
  }

  // Camera State
  const S = {
    mode: 'sky',
    px: 0, pz: 0,
    wyaw: 0, wpitch: -0.02,
    x: 0, z: 0,
    dist: 610, yaw: -0.45, pitch: 0.82,
    speed: 7
  };

  const areaSelect = bar.querySelector('.model-area select');
  const lightSelect = bar.querySelector('.model-light select');
  areaSelect.disabled = true;
  let activeArea = null, areaRequest, streetSegments = [], activePlaceIDs = [];
  let project = (lat, lng) => ({ x: 0, z: 0 });
  let unproject = (x, z) => ({ lat: 0, lng: 0 });
  let collisionGrid = new Map();
  const GR = 40;
  let currentMeshes = [];
  let placePins = [];

  function blocked(x, z) {
    if (Math.hypot(x, z) > activeArea.radiusM) return true;
    const key = Math.floor(x / GR) + ',' + Math.floor(z / GR);
    const polys = collisionGrid.get(key);
    if (!polys) return false;
    for (const rings of polys) {
      let inside = false;
      for (const ring of rings) {
        const n = ring.length / 2;
        for (let a = 0, b = n - 1; a < n; b = a++) {
          const xa = ring[a * 2], za = ring[a * 2 + 1];
          const xb = ring[b * 2], zb = ring[b * 2 + 1];
          if ((za > z) !== (zb > z) && x < (xb - xa) * (z - za) / (zb - za) + xa) inside = !inside;
        }
      }
      if (inside) return true;
    }
    return false;
  }

  function nearestStreet(x, z) {
    let nearest = null;
    for (const [a, b] of streetSegments) {
      const dx = b.x - a.x, dz = b.z - a.z;
      const lengthSquared = dx * dx + dz * dz;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSquared));
      const sx = a.x + t * dx, sz = a.z + t * dz;
      const distance = Math.hypot(sx - x, sz - z);
      if ((!nearest || distance < nearest.distance) && !blocked(sx, sz)) {
        nearest = { x: sx, z: sz, yaw: Math.atan2(-dx, -dz), distance };
      }
    }
    return nearest;
  }

  function standNear(x, z) {
    const street = nearestStreet(x, z);
    if (!street) return false;
    S.px = S.x = street.x;
    S.pz = S.z = street.z;
    S.wyaw = street.yaw;
    S.wpitch = -0.10;
    return true;
  }

  async function loadArea(area) {
    areaRequest?.abort();
    const request = new AbortController();
    areaRequest = request;
    clearInput();
    coverageEl.textContent = `Loading ${area.name}…`;
    let file;
    try {
      const areaSignal = AbortSignal.any([abort.signal, request.signal, AbortSignal.timeout(20000)]);
      const response = await fetch(`data/street-world/${area.id}.json`, { signal: areaSignal });
      if (!response.ok) throw new Error('Neighbourhood file unavailable');
      file = await response.json();
      if (file.id !== area.id || !Array.isArray(file.streetIDs) || !file.streets?.features?.length ||
          !Array.isArray(file.buildings?.features) || !Array.isArray(file.placeIDs)) {
        throw new Error('Neighbourhood geometry is incomplete');
      }
    } catch (error) {
      if (disposed || request.signal.aborted) return false;
      if (!activeArea) throw error;
      areaSelect.value = activeArea.id;
      coverageEl.textContent = `${area.name} unavailable. Still showing ${activeArea.name}.`;
      return false;
    }
    if (disposed || request.signal.aborted) return false;
    activeArea = area;
    areaSelect.value = area.id;
    cardEl.hidden = true;

    // Clean up old meshes
    for (const m of currentMeshes) {
      scene.remove(m);
      m.geometry.dispose();
      if (m.material !== matB && m.material !== matRoad && m.material !== matWater) m.material.dispose();
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
    const bList = file.buildings.features;

    const pos = [], uw = [], info = [], idx = [];
    const ground = [], groundIndices = [], outlines = [];
    let knownCount = 0;

    for (const building of bList) {
      const geometry = building.geometry;
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
      const { render3D, heightM, minHeightM } = building.properties || {};
      const baseHeight = minHeightM ?? 0;
      const known = render3D === true && Number.isFinite(heightM) && heightM > baseHeight;
      if (known) knownCount++;

      for (const polygon of polygons) {
        const rings = polygon.map(ring => ring.slice(0, -1).flatMap(([lng, lat]) => {
          const point = project(lat, lng);
          return [point.x, point.z];
        })).filter(ring => ring.length >= 6);
        if (!rings.length) continue;

        const outer = rings[0];
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (let i = 0; i < outer.length; i += 2) {
          minX = Math.min(minX, outer[i]); maxX = Math.max(maxX, outer[i]);
          minZ = Math.min(minZ, outer[i + 1]); maxZ = Math.max(maxZ, outer[i + 1]);
        }
        for (let x = Math.floor(minX / GR); x <= Math.floor(maxX / GR); x++) {
          for (let z = Math.floor(minZ / GR); z <= Math.floor(maxZ / GR); z++) {
            const key = x + ',' + z;
            if (!collisionGrid.has(key)) collisionGrid.set(key, []);
            collisionGrid.get(key).push(rings);
          }
        }

        const coords = [], holes = [];
        const wallInfo = known ? Math.floor(heightM * 2) * 4 + 2 : 0;
        for (const ring of rings) {
          if (coords.length) holes.push(coords.length / 2);
          for (let i = 0; i < ring.length; i += 2) {
            const j = (i + 2) % ring.length;
            const xa = ring[i], za = ring[i + 1], xb = ring[j], zb = ring[j + 1];
            coords.push(xa, za);
            outlines.push(xa, 0.04, za, xb, 0.04, zb);
            if (!known) continue;
            const length = Math.hypot(xb - xa, zb - za);
            const v = pos.length / 3;
            pos.push(xa, baseHeight, za, xb, baseHeight, zb, xb, heightM, zb, xa, heightM, za);
            uw.push(0, length, length, length, length, length, 0, length);
            info.push(wallInfo, wallInfo, wallInfo, wallInfo);
            idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
          }
        }
        const triangles = earcut(coords, holes);
        const groundBase = ground.length / 3;
        const roofBase = pos.length / 3;
        for (let i = 0; i < coords.length; i += 2) {
          ground.push(coords[i], 0.02, coords[i + 1]);
          if (known) {
            pos.push(coords[i], heightM, coords[i + 1]);
            uw.push(0, 0);
            info.push(wallInfo + 1);
          }
        }
        for (const i of triangles) {
          groundIndices.push(groundBase + i);
          if (known) idx.push(roofBase + i);
        }
      }
    }

    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    bGeo.setAttribute('uw', new THREE.Float32BufferAttribute(uw, 2));
    bGeo.setAttribute('info', new THREE.Float32BufferAttribute(info, 1));
    bGeo.setIndex(idx);
    bGeo.computeVertexNormals();

    const bMesh = new THREE.Mesh(bGeo, matB);
    scene.add(bMesh);
    currentMeshes.push(bMesh);

    // Draw source footprints and their holes on the ground plane.
    if (groundIndices.length) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(ground, 3));
      geometry.setIndex(groundIndices);
      const material = new THREE.MeshBasicMaterial({ color: 0xfff7ef, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      currentMeshes.push(mesh);
    }
    if (outlines.length) {
      const fpGeo = new THREE.BufferGeometry();
      fpGeo.setAttribute('position', new THREE.Float32BufferAttribute(outlines, 3));
      const fpMat = new THREE.LineBasicMaterial({ color: 0x7d133a });
      const fpMesh = new THREE.LineSegments(fpGeo, fpMat);
      scene.add(fpMesh);
      currentMeshes.push(fpMesh);
    }

    coverageEl.textContent = `${knownCount} of ${bList.length} buildings in relief · mapped heights`;
    host.dataset.area = area.id;
    host.dataset.volumes = String(knownCount);

    // The area payload owns these IDs. The index is navigation metadata.
    const smap = new Map(file.streets.features.map(f => [f.id, f]));
    streetSegments = [];
    const roadPoints = [], roadAcross = [], roadIdx = [];
    let rv = 0;

    for (const id of file.streetIDs) {
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
      for (let k = 1; k < pts.length; k++) streetSegments.push([pts[k - 1], pts[k]]);

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

    host.dataset.streets = String(streetSegments.length);
    S.x = S.z = 0;
    const street = standNear(0, 0);
    bar.querySelector('[data-mode="walk"]').disabled = !street;
    if (!street) setMode('sky');
    activePlaceIDs = file.placeIDs;
    createPins(activePlaceIDs);
    invalidate();
    return true;
  }

  for (const catalogue of opt.catalogues || []) {
    void catalogue.then(() => {
      if (disposed || !activeArea) return;
      createPins(activePlaceIDs);
      invalidate();
    }, () => {});
  }

  function createPins(ids) {
    pinsContainer.replaceChildren();
    const areaPlaces = [...new Set(ids.map(opt.placeById).filter(Boolean))]
      .sort((a, b) => Math.hypot(a.x - activeArea.anchor.x, a.y - activeArea.anchor.y) -
                      Math.hypot(b.x - activeArea.anchor.x, b.y - activeArea.anchor.y));

    placePins = areaPlaces.slice(0, 45).map(p => {
      const pt = project(p.y, p.x);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `model-pin pin-${p.k}`;
      btn.setAttribute('aria-label', p.n);
      btn.innerHTML = `<span class="pin-dot ${p.k}" aria-hidden="true"></span><span class="pin-tag"></span>`;
      btn.querySelector('.pin-tag').textContent = p.n;
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
    invalidate();
    cardEl.querySelector('.model-card-title').textContent = p.n;
    cardEl.querySelector('.model-card-meta').textContent = `✦${p.idx} Oldenburg index · ${p.k} · ${Math.round(Math.hypot(pt.x - S.px, pt.z - S.pz))} m away`;

    cardEl.querySelector('.model-card-stand').onclick = () => {
      if (standNear(pt.x, pt.z)) setMode('walk');
      cardEl.hidden = true;
    };

    cardEl.querySelector('.model-card-open').onclick = () => {
      cardEl.hidden = true;
      if (opt.onSelectPlace) opt.onSelectPlace(p);
    };

    cardEl.querySelector('.model-card-close').onclick = () => {
      cardEl.hidden = true;
      invalidate();
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
    clearInput();
    S.mode = m;
    cam.fov = m === 'walk' ? 70 : 55;
    cam.updateProjectionMatrix();
    bar.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    hintEl.textContent = m === 'walk'
      ? (matchMedia('(pointer: coarse)').matches ? 'Drag to look. Slide circle to walk.' : 'W A S D to walk · Drag to look · Shift to sprint')
      : (matchMedia('(pointer: coarse)').matches ? 'Drag to turn · Double-tap for street level' : 'Drag to rotate · Scroll to zoom · Double-click for street level');
    joyEl.hidden = !(matchMedia('(pointer: coarse)').matches && m === 'walk');
    if (m === 'walk') canvas.focus({ preventScroll: true });
    invalidate();
  }

  // Input handling
  const keys = new Set();
  onKeyDown = e => {
    if (e.target !== canvas) return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
      e.preventDefault();
      keys.add(k);
      invalidate();
    }
  };
  onKeyUp = e => {
    keys.delete(e.key.toLowerCase());
  };
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
    invalidate();
  });

  const up = e => {
    const p = ptr.get(e.pointerId);
    ptr.delete(e.pointerId);
    if (p && dragMoved < 6 && e.type === 'pointerup') {
      const now = performance.now();
      if (lastTap && now - lastTap < 350 && S.mode === 'sky') {
        // Double-click to land
        const raycaster = new THREE.Raycaster();
        const rect = canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(mouse, cam);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const hit = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, hit)) {
          if (standNear(hit.x, hit.z)) setMode('walk');
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
      invalidate();
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
    invalidate();
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
  areaSelect.addEventListener('change', () => {
    const area = areas.find(candidate => candidate.id === areaSelect.value);
    areaSelect.value = activeArea?.id || startArea.id;
    if (area) void loadArea(area).catch(() => { dispose(); opt.onError(); });
  });
  lightSelect.addEventListener('change', () => setTod(lightSelect.value));
  bar.addEventListener('click', event => {
    const mode = event.target.closest('[data-mode]');
    if (mode) setMode(mode.dataset.mode);
  });

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    invalidate();
  }
  ro = new ResizeObserver(resize);
  ro.observe(host);

  function layoutPins() {
    const w = host.clientWidth, h = host.clientHeight;
    const posVec = new THREE.Vector3();
    const cx = S.mode === 'walk' ? S.px : S.x;
    const cz = S.mode === 'walk' ? S.pz : S.z;
    const occupied = [];
    const top = bar.getBoundingClientRect().bottom + 6;
    const bottom = bottomBar.getBoundingClientRect().top - 6;
    const sizes = placePins.map(({ btn }) => [btn.offsetWidth, btn.offsetHeight]);

    for (const [index, item] of placePins.entries()) {
      const distance = Math.hypot(item.x - cx, item.z - cz);
      posVec.set(item.x, 3.5, item.z);
      posVec.project(cam);
      const [width, height] = sizes[index];
      const x = (posVec.x * 0.5 + 0.5) * w;
      const y = (-posVec.y * 0.5 + 0.5) * h - height / 2;
      const overlaps = occupied.some(other =>
        x < other.right + 4 && x + width > other.x - 4 && y < other.bottom + 4 && y + height > other.y - 4);
      item.btn.hidden = distance > 700 || Math.abs(posVec.z) > 1 || occupied.length >= 8 ||
        x < 8 || x + width > w - 8 || y < top || y + height > bottom || overlaps;
      if (item.btn.hidden) continue;
      occupied.push({ x, y, right: x + width, bottom: y + height });
      item.btn.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  // Animation Loop
  let dirty = true, prev = performance.now();
  const movementKeys = ['w','a','s','d','q','e','arrowup','arrowdown','arrowleft','arrowright'];
  function moving() {
    return S.mode === 'walk' && (movementKeys.some(key => keys.has(key)) || joy.x || joy.y);
  }
  function invalidate() {
    dirty = true;
    if (!raf && !disposed && !document.hidden) {
      prev = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }
  clearInput = () => {
    keys.clear();
    ptr.clear();
    joy = { x: 0, y: 0 };
    joyId = null;
    joyKnob.style.transform = '';
    cancelAnimationFrame(raf);
    raf = 0;
  };
  visibilityChanged = () => {
    if (document.hidden) clearInput();
    else invalidate();
  };
  canvas.addEventListener('blur', clearInput);
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', visibilityChanged);
  function loop(now) {
    raf = 0;
    if (disposed || document.hidden) return;
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
      if (shaderFailed && host.dataset.ready === 'true') { dispose(); opt.onError(); return; }
    }
    if (moving() && !raf) raf = requestAnimationFrame(loop);
  }

  // Publish readiness only after the first geometry frame has rendered.
  if (!await loadArea(startArea) || disposed) return;
  setTod('day');
  setMode('sky');
  resize();
  cancelAnimationFrame(raf);
  loop(performance.now());
  if (shaderFailed) throw new Error('3D shaders failed to compile');
  host.dataset.ready = 'true';
  areaSelect.disabled = false;
  canvas.focus({ preventScroll: true });
  return { dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
