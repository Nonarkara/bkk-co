// The 3D Screentoned Manga & Rokehan-Inspired Architectural City Walkthrough for Bangkok (PLUB).
// Built with Three.js and custom GLSL halftone screentone, cel-shading, window-grid,
// storefront-glow, wet-asphalt reflection, and architectural ink-edge shaders.
// Uses real OpenStreetMap footprints, heights, floor counts, and streets from data/street-world/*.json.

import * as THREE from './vendor/three/three.module.min.js';
import earcut from './vendor/three/earcut.js';

THREE.ColorManagement.enabled = false;

// 5 Time-of-Day presets inspired by Rokehan (Day, Dusk, Misty dusk, Night, Late night)
const TOD = {
  day:   {
    paper: '#f7f3eb', ink: '#231924', skyTop: '#cfe2f3', skyHor: '#f7efe6',
    wallLit: '#fcf9f2', wallShade: '#d8cfc4', roof: '#ede6dc', road: '#464b56',
    emissive: '#ffe29a', sun: [-0.55, 0.68, 0.48], invert: 0, sky: 0.45, night: 0.0, wet: 0.0, fogMul: 1.0
  },
  dusk:  {
    paper: '#b5decc', ink: '#34454c', skyTop: '#709390', skyHor: '#ffdfae',
    wallLit: '#ffe9d6', wallShade: '#8ca59b', roof: '#c4decf', road: '#3c534c',
    emissive: '#ffd478', sun: [0.82, 0.22, -0.35], invert: 0, sky: 0.80, night: 0.45, wet: 0.15, fogMul: 0.85
  },
  misty: {
    paper: '#dce8e0', ink: '#344c47', skyTop: '#9ea8b8', skyHor: '#d4e7dc',
    wallLit: '#e8f0e9', wallShade: '#9fb8ad', roof: '#ccded5', road: '#465850',
    emissive: '#ffd88a', sun: [0.65, 0.28, 0.45], invert: 0, sky: 0.75, night: 0.35, wet: 0.1, fogMul: 0.42
  },
  night: {
    paper: '#0b2b40', ink: '#a7d4e4', skyTop: '#061524', skyHor: '#133b54',
    wallLit: '#1c3b52', wallShade: '#0d2030', roof: '#163146', road: '#0a1622',
    emissive: '#ffdf8e', sun: [0.2, 0.7, -0.3], invert: 1, sky: 0.90, night: 0.88, wet: 0.35, fogMul: 0.8
  },
  late:  {
    paper: '#08101c', ink: '#9cc4dc', skyTop: '#040811', skyHor: '#112236',
    wallLit: '#182738', wallShade: '#0b131e', roof: '#132030', road: '#070c14',
    emissive: '#ffcf6e', sun: [-0.25, 0.65, 0.35], invert: 1, sky: 0.95, night: 1.0, wet: 0.85, fogMul: 0.72
  }
};

// Look modes:
// 0 = Color (Rokehan architectural anime palette)
// 1 = Paper (Wada 202 Turquoise Green paper and Slate Color ink)
// 2 = Gray (Monochrome manga sumi ink)
// 3 = Clay (Architectural white/warm clay model)
const LOOK_CODES = { color: 0, paper: 1, gray: 2, clay: 3 };

// Finish modes:
// 0 = Lines + tone (Halftone screentone + ink outlines)
// 1 = Plain + lines (Smooth cel-shaded surfaces + ink outlines)
// 2 = Line art (Pure technical/manga ink line drawing)
const FINISH_CODES = { tone: 0, plain: 1, lineart: 2 };

const LENS_FOV = { '18': 84, '24': 70, '35': 54, '50': 40 };

const EYE = 1.65;

const GLSL = `
uniform vec3 uPaper, uInk, uSkyTop, uSkyHor, uWallLit, uWallShade, uRoof, uRoad, uEmissive, uSun, uCam;
uniform float uCell, uLine, uInvert, uFogNear, uFogFar, uNight, uWet;
uniform int uLook, uFinish;

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

vec3 applyLook(vec3 col, float inkMask, float shadeTone) {
  if (uFinish == 2) {
    // Pure line art
    vec3 bg = uLook == 1 ? vec3(0.710, 0.871, 0.800) : (uInvert > 0.5 ? uPaper : vec3(0.97, 0.96, 0.94));
    vec3 fg = uLook == 1 ? vec3(0.204, 0.271, 0.298) : (uInvert > 0.5 ? uInk : vec3(0.12, 0.10, 0.14));
    return mix(bg, fg, clamp(inkMask, 0., 1.));
  }
  if (uLook == 1) {
    // Wada 202 paper and ink
    vec3 wp = uInvert > 0.5 ? uPaper : vec3(0.710, 0.871, 0.800);
    vec3 wi = uInvert > 0.5 ? uInk : vec3(0.204, 0.271, 0.298);
    return mix(wp, wi, clamp(max(shadeTone, inkMask), 0., 1.));
  }
  if (uLook == 2) {
    // Monochrome Gray manga
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 gp = uInvert > 0.5 ? vec3(0.06, 0.07, 0.09) : vec3(0.95, 0.94, 0.92);
    vec3 gi = uInvert > 0.5 ? vec3(0.84, 0.87, 0.90) : vec3(0.11, 0.11, 0.13);
    float m = uFinish == 0 ? max(shadeTone, inkMask) : clamp(1.0 - luma, 0.0, 1.0);
    return mix(gp, gi, clamp(max(m * 0.85, inkMask), 0., 1.));
  }
  if (uLook == 3) {
    // Clay architectural model
    vec3 cp = uInvert > 0.5 ? vec3(0.12, 0.14, 0.18) : vec3(0.94, 0.91, 0.87);
    vec3 cs = uInvert > 0.5 ? vec3(0.05, 0.06, 0.08) : vec3(0.72, 0.67, 0.61);
    vec3 ci = uInvert > 0.5 ? vec3(0.75, 0.78, 0.82) : vec3(0.22, 0.19, 0.17);
    vec3 base = mix(cs, cp, clamp(1.0 - shadeTone * 0.75, 0.0, 1.0));
    return mix(base, ci, clamp(inkMask, 0., 1.));
  }
  return col;
}
`;

const BUILD_V = `
varying vec3 vW;
varying vec2 vUw;
flat varying float vInfo;
flat varying float vSeed;
attribute vec2 uw;
attribute float info;
attribute float seed;

void main() {
  vec4 w = modelMatrix * vec4(position, 1.);
  vW = w.xyz;
  vUw = uw;
  vInfo = info;
  vSeed = seed;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const BUILD_F = GLSL + `
varying vec3 vW;
varying vec2 vUw;
flat varying float vInfo;
flat varying float vSeed;

void main() {
  float isRoof = mod(vInfo, 2.);
  float tier = mod(floor(vInfo / 2.), 4.); // 0 = indicative shophouse, 1 = OSM levels, 2 = explicit heightM, 3 = tree/prop
  float h = floor(vInfo / 8.) * .5;

  vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
  if (dot(n, vW - uCam) > 0.) n = -n;
  float lit = clamp(dot(n, uSun) * .5 + .5, 0., 1.);
  vec2 fc = gl_FragCoord.xy;

  // Tree canopy / foliage prop (tier == 3)
  if (tier > 2.5) {
    vec3 leafLit = uInvert > 0.5 ? vec3(0.14, 0.34, 0.28) : vec3(0.46, 0.72, 0.54);
    vec3 leafShade = uInvert > 0.5 ? vec3(0.06, 0.18, 0.15) : vec3(0.26, 0.48, 0.36);
    float tone = ht(fc, mix(0.25, 0.85, lit), uCell * 1.05);
    vec3 col = mix(leafLit, leafShade, uFinish == 0 ? tone * 0.65 : (1.0 - lit) * 0.65);
    float rim = 1.0 - abs(dot(n, normalize(uCam - vW)));
    float e = smoothstep(0.62, 0.82, rim);
    col = mix(col, uInk, e * 0.85);
    col = applyLook(col, e, tone * 0.6);
    float f = smoothstep(uFogNear, uFogFar, length(vW - uCam));
    gl_FragColor = vec4(mix(col, uSkyHor, f), 1.);
    return;
  }

  float t = isRoof > .5 ? mix(.78, .96, lit) : mix(.18, .84, smoothstep(.18, .92, lit));
  float tt = mix(t, 1. - t * .88, uInvert);
  float cell = uCell * (tier > 0.5 ? 1.0 : 1.22);
  float ink = ht(fc, tt, cell);
  if (isRoof < .5 && uInvert < .5 && t < .36) ink = max(ink, hatch(fc, uCell) * .75);
  if (uFinish == 1) ink *= 0.18; // Plain + lines keeps surfaces clean

  // Architectural edges, floor bands, storefront awnings, and multi-story window grid
  float e = 0.;
  float winGlow = 0.;
  float winFrame = 0.;
  float storefrontBand = 0.;

  if (isRoof < .5) {
    float L = vUw.y, du = min(vUw.x, L - vUw.x);
    float fu = max(fwidth(vUw.x), 1e-4), fv = max(fwidth(vW.y), 1e-4);
    float pxEdge = min(min(du / fu, (h - vW.y) / fv), vW.y / fv);
    e = 1. - smoothstep(uLine * .55, uLine * 1.4, pxEdge);

    // Roof parapet line (0.7m below top of wall)
    if (h > 6.0) {
      float parapetPx = abs((h - 0.7) - vW.y) / fv;
      e = max(e, (1. - smoothstep(uLine * .45, uLine * 1.15, parapetPx)) * 0.75);
    }

    // Ground-floor storefront lintel at y = 3.6m
    if (h > 5.0 && L > 3.5) {
      float lintelPx = abs(vW.y - 3.6) / fv;
      e = max(e, (1. - smoothstep(uLine * .45, uLine * 1.2, lintelPx)) * 0.85);
      if (vW.y > 0.25 && vW.y < 3.35 && du > 0.6) {
        storefrontBand = 1.0;
        float bay = fract(vUw.x / 2.8);
        if (bay > 0.08 && bay < 0.92) {
          float sHash = hash21(vec2(floor(vUw.x / 2.8) + vSeed * 17.0, floor(vSeed * 31.0)));
          if (uNight > 0.1 && sHash > 0.28) {
            winGlow = uNight * mix(0.55, 1.0, sHash);
          } else {
            winFrame = 0.22;
          }
        }
      }
    }

    // Upper-story window grid (y from 4.0m to h - 1.0m)
    if (vW.y >= 4.0 && vW.y <= h - 1.0 && L > 3.2 && du > 0.7) {
      float floorIdx = floor((vW.y - 3.6) / 3.3);
      float fy = fract((vW.y - 3.6) / 3.3);
      float bayIdx = floor(vUw.x / 2.6);
      float bx = fract(vUw.x / 2.6);
      if (fy > 0.22 && fy < 0.78 && bx > 0.18 && bx < 0.82) {
        float wHash = hash21(vec2(bayIdx + vSeed * 23.0, floorIdx * 7.0 + vSeed * 13.0));
        if (uNight > 0.1 && wHash > (1.0 - 0.46 * uNight)) {
          winGlow = uNight * mix(0.45, 0.95, wHash);
        } else {
          winFrame = 0.28;
        }
        // Subtle window sill/frame line
        float wBorder = min(min(bx - 0.18, 0.82 - bx), min(fy - 0.22, 0.78 - fy));
        if (wBorder < 0.05) e = max(e, 0.42);
      }
    }
  } else {
    // Roof surface: subtle perimeter inset line
    float roofGrid = abs(fract(vW.x * 0.12) - 0.5) + abs(fract(vW.z * 0.12) - 0.5);
    if (roofGrid > 0.92) e = max(e, 0.18);
  }

  // Subtle tint variation per building from vSeed
  vec3 tint = vec3(
    sin(vSeed * 12.3) * 0.035,
    cos(vSeed * 19.7) * 0.025,
    sin(vSeed * 31.1) * 0.03
  );
  vec3 baseWall = mix(uWallShade, uWallLit, lit) + tint;
  if (tier < 0.5 && uInvert < 0.5) {
    // Indicative shophouse massing has a warm architectural paper wash
    baseWall = mix(baseWall, uPaper, 0.18);
  }
  vec3 baseCol = isRoof > .5 ? (uRoof + tint * 0.6) : baseWall;

  if (winFrame > 0.0 && winGlow <= 0.02) {
    vec3 glassCol = uInvert > 0.5 ? vec3(0.08, 0.16, 0.24) : vec3(0.68, 0.76, 0.84);
    baseCol = mix(baseCol, glassCol, winFrame);
  }

  // Apply screentone shadow & ink outlines
  vec3 tonedCol = mix(baseCol, uInk, clamp(ink * (uInvert > 0.5 ? 0.38 : 0.46), 0., 1.));
  vec3 col = mix(tonedCol, uInk, clamp(e, 0., 1.));

  col = applyLook(col, max(e, winFrame * 0.7), ink);

  // Night / Dusk emissive windows & ground-floor storefronts (glows even in Paper/Color/Gray modes)
  if (winGlow > 0.01 && uFinish != 2) {
    vec3 glowColor = mix(uEmissive, vec3(1.0, 0.95, 0.82), storefrontBand * 0.35);
    col = mix(col, glowColor, clamp(winGlow * 0.92, 0., 1.));
  }

  float f = smoothstep(uFogNear, uFogFar, length(vW - uCam));
  vec3 fogCol = uLook == 1 ? uPaper : uSkyHor;
  gl_FragColor = vec4(mix(col, fogCol, f), 1.);
}
`;

const FLAT_V = `
varying vec3 vW;
varying vec2 vAcrossAlong;
attribute vec2 across;

void main() {
  vec4 w = modelMatrix * vec4(position, 1.);
  vW = w.xyz;
  vAcrossAlong = across;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const FLAT_F = GLSL + `
varying vec3 vW;
varying vec2 vAcrossAlong;
uniform int uMode;

void main() {
  vec2 fc = gl_FragCoord.xy;
  float vA = fract(vAcrossAlong.x);
  float isMainRoad = step(1.5, vAcrossAlong.x);
  float vAlong = vAcrossAlong.y;
  float ink = 0.;
  vec3 col = uRoad;

  if (uMode == 0) { // road + sidewalk curbs + crosswalks + wet late-night reflections
    float fa = max(fwidth(vA), 1e-4);
    float px = min(vA, 1. - vA) / fa;
    float edgeLine = 1. - smoothstep(uLine * .5, uLine * 1.25, px);

    // Sidewalk curb lines at 13% and 87% across
    float curbPx = min(abs(vA - 0.13), abs(vA - 0.87)) / fa;
    float curbLine = (1. - smoothstep(uLine * .35, uLine * 1.0, curbPx)) * 0.55;
    bool onSidewalk = (vA < 0.13 || vA > 0.87);

    float tone = ht(fc, onSidewalk ? 0.84 : 0.62, uCell * 1.1);
    ink = max(edgeLine, curbLine);
    if (uFinish == 0) ink = max(ink, tone * 0.45);

    vec3 sidewalkCol = uInvert > 0.5 ? vec3(0.16, 0.22, 0.30) : vec3(0.86, 0.83, 0.78);
    col = onSidewalk ? sidewalkCol : uRoad;

    // Center dashed lane line on primary/secondary streets
    if (!onSidewalk && isMainRoad > 0.5) {
      float centerPx = abs(vA - 0.5) / fa;
      float dash = step(0.45, fract(vAlong / 9.0));
      if (centerPx < 1.3 && dash > 0.5 && vAlong > 6.0) {
        vec3 laneCol = uInvert > 0.5 ? vec3(0.55, 0.68, 0.78) : vec3(0.95, 0.93, 0.88);
        col = mix(col, laneCol, 0.75);
      }
    }

    // Zebra crosswalk + yellow tactile strip near junctions (1.2m to 4.4m along segment)
    if (vAlong > 1.2 && vAlong < 4.4) {
      if (!onSidewalk && vA > 0.16 && vA < 0.84) {
        float stripe = step(0.42, fract(vA * 7.5));
        vec3 zebraCol = uInvert > 0.5 ? vec3(0.78, 0.86, 0.92) : vec3(0.98, 0.97, 0.95);
        col = mix(col, zebraCol, stripe * 0.88);
      } else if (onSidewalk && vAlong > 2.2 && vAlong < 3.4) {
        // Yellow tactile paving strip on the sidewalk ramp
        col = mix(col, vec3(0.95, 0.76, 0.18), 0.9);
      }
    }

    // Wet asphalt vertical specular reflections in Dusk / Night / Late night
    if (!onSidewalk && uWet > 0.05 && uFinish != 2) {
      float streakX = floor(fc.x / 3.0);
      float shimmer = hash21(vec2(streakX, floor(vW.x * 0.25 + vW.z * 0.25)));
      float wave = 0.5 + 0.5 * sin(fc.y * 0.18 + streakX * 1.7);
      if (shimmer > 0.58) {
        vec3 reflCol = shimmer > 0.78 ? uEmissive : vec3(0.45, 0.78, 0.95);
        col = mix(col, reflCol, uWet * (shimmer - 0.5) * wave * 0.85);
      }
    }

    col = mix(col, uInk, clamp(ink, 0., 1.));
    col = applyLook(col, max(edgeLine, curbLine), tone);
  } else if (uMode == 1) { // water / canal
    float y = fc.y / (uCell * .8) + sin(fc.x * .045) * .12;
    float f = abs(fract(y) - .5);
    ink = (1. - smoothstep(.07, .17, f)) * .85;
    vec3 waterCol = uInvert > 0.5 ? vec3(0.07, 0.24, 0.36) : vec3(0.68, 0.85, 0.92);
    col = mix(waterCol, uInk, clamp(ink * 0.55, 0., 1.));
    col = applyLook(col, ink * 0.5, ink);
  }

  float f = smoothstep(uFogNear, uFogFar, length(vW - uCam));
  vec3 fogCol = uLook == 1 ? uPaper : uSkyHor;
  gl_FragColor = vec4(mix(col, fogCol, f), 1.);
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
  float e = clamp(d.y, 0.0, 1.0);
  vec2 fc = gl_FragCoord.xy;
  vec3 grad = mix(uSkyHor, uSkyTop, smoothstep(0.0, 0.65, e));
  float t = 1. - uSky * smoothstep(.0, .85, e) * .62;
  float ink = ht(fc, t, uCell * 1.5);
  if (uInvert > .5) {
    ink = ink * .28 + step(.994, hash21(floor(fc / (uCell * .85)))) * .85;
  }
  vec3 col = grad;
  if (uFinish == 0) {
    col = mix(grad, uInk, clamp(ink * (uLook == 1 ? 0.85 : 0.22), 0., 1.));
  }
  if (uLook == 1) {
    col = mix(uPaper, uInk, clamp(ink, 0., 1.));
  } else if (uLook == 2 || uLook == 3) {
    col = applyLook(grad, 0.0, ink * 0.35);
  }
  gl_FragColor = vec4(col, 1.);
}
`;

function hashStr(str, seed = 0) {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

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
    delete host.dataset.massingVolumes;
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
  const mostRelief = areas.reduce((best, area) => (area.heightVolumes || 0) > (best.heightVolumes || 0) ? area : best);
  const startArea = areas.find(area => area.id === opt.areaId) ||
    ((nearest?.heightVolumes ?? 0) >= 10 ? nearest : mostRelief);
  const areaOptions = areas.map(area => {
    const option = new Option(area.id === 'ramkhamhaeng' ? 'Ramkhamhaeng' : area.name, area.id, area.id === startArea.id, area.id === startArea.id);
    return option.outerHTML;
  }).join('');

  // Create UI shell with Rokehan-inspired Look, Finish, Time of Day, Lens, 2-Point Perspective, Re-roll & Minimap
  host.innerHTML = `
    <canvas class="model-canvas" tabindex="0" role="img" aria-label="3D Screentoned Manga Bangkok Walkthrough"></canvas>
    <div class="model-bar">
      <label class="model-area"><span class="sr">Neighbourhood</span><select aria-label="Neighbourhood">${areaOptions}</select></label>
      <div class="model-seg model-seg--mode" role="group" aria-label="Camera perspective">
        <button type="button" data-mode="sky" data-preset="aerial" aria-pressed="true">Aerial</button>
        <button type="button" data-mode="sky" data-preset="rooftop" aria-pressed="false">Rooftop</button>
        <button type="button" data-mode="walk" aria-pressed="false">Street</button>
      </div>
      <button type="button" class="model-hunt-hud" data-act-hunt hidden title="Show the next virtual hunt stop"><span class="hunt-dot" aria-hidden="true"></span><span class="hunt-label">Hunt</span></button>
      <details class="model-appearance"><summary>Appearance</summary><div class="model-appearance-controls">
      <label class="model-light"><span class="sr">Light</span><select aria-label="Light">
        <option value="day">Day</option>
        <option value="dusk">Dusk</option>
        <option value="misty">Misty dusk</option>
        <option value="night">Night</option>
        <option value="late">Late night</option>
      </select></label>
      <label class="model-look"><span class="sr">Look</span><select aria-label="Look" title="Surface palette (Rokehan Color, Wada Paper, Gray manga, Clay model)">
        <option value="color">Look: Color</option>
        <option value="paper">Look: Wada Paper</option>
        <option value="gray">Look: Gray</option>
        <option value="clay">Look: Clay</option>
      </select></label>
      <label class="model-finish"><span class="sr">Finish</span><select aria-label="Finish" title="Shader finish (Screentone + lines, Plain + lines, Line art)">
        <option value="tone">Lines + tone</option>
        <option value="plain">Plain + lines</option>
        <option value="lineart">Line art</option>
      </select></label>
      <label class="model-lens"><span class="sr">Camera lens</span><select aria-label="Camera lens" title="Focal length">
        <option value="18">18mm</option>
        <option value="24" selected>24mm</option>
        <option value="35">35mm</option>
        <option value="50">50mm</option>
      </select></label>
      <button type="button" class="model-tool-btn" data-act-2pt aria-pressed="false" title="Keep vertical building lines parallel (2-point architectural perspective)">2-pt</button>
      <button type="button" class="model-tool-btn" data-act-avatar aria-pressed="true" title="Show/hide 3rd-person walking character in Street mode">Avatar</button>
      </div></details>
      <button type="button" class="model-close" aria-label="Back to map">Back to map</button>
      <div class="model-coverage"><p role="status"></p><button type="button" class="model-relief" hidden></button><span class="sr" data-hunt-status aria-live="polite"></span></div>
    </div>
    <div class="model-pins"></div>
    <canvas class="model-minimap" width="136" height="136" title="Click radar to jump camera to street"></canvas>
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
  const coverageEl = host.querySelector('.model-coverage [role=status]');
  const reliefBtn = host.querySelector('.model-relief');
  const pinsContainer = host.querySelector('.model-pins');
  const minimapCanvas = host.querySelector('.model-minimap');
  const minimapCtx = minimapCanvas.getContext('2d');
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
    uPaper:     { value: new THREE.Color() },
    uInk:       { value: new THREE.Color() },
    uSkyTop:    { value: new THREE.Color() },
    uSkyHor:    { value: new THREE.Color() },
    uWallLit:   { value: new THREE.Color() },
    uWallShade: { value: new THREE.Color() },
    uRoof:      { value: new THREE.Color() },
    uRoad:      { value: new THREE.Color() },
    uEmissive:  { value: new THREE.Color() },
    uSun:       { value: new THREE.Vector3() },
    uCam:       { value: cam.position },
    uCell:      { value: 4.4 * opt.dpr },
    uLine:      { value: 1.18 * opt.dpr },
    uInvert:    { value: 0 },
    uFogNear:   { value: 700 },
    uFogFar:    { value: 2400 },
    uSky:       { value: 0.5 },
    uNight:     { value: 0.0 },
    uWet:       { value: 0.0 },
    uLook:      { value: 0 },
    uFinish:    { value: 0 }
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
  const huntGroup = new THREE.Group();
  scene.add(huntGroup);

  // Rokehan-inspired 3rd-person walking character (Nong Plub on PL;UB, Dr Non on CL;UB)
  const avatarGroup = new THREE.Group();
  const isClub = () => Boolean(window.state?.clubMode);
  const avCoatMat = new THREE.MeshBasicMaterial({ color: isClub() ? 0x819238 : 0x3f4256 });
  const avSkinMat = new THREE.MeshBasicMaterial({ color: 0xf3cfaa });
  const avHairMat = new THREE.MeshBasicMaterial({ color: isClub() ? 0x2c2927 : 0x7b4a2d });
  const avLegL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.18), new THREE.MeshBasicMaterial({ color: 0x253122 }));
  const avLegR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.18), new THREE.MeshBasicMaterial({ color: 0x253122 }));
  avLegL.position.set(-0.12, 0.34, 0);
  avLegR.position.set(0.12, 0.34, 0);
  const avTorso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.66, 0.24), avCoatMat);
  avTorso.position.y = 0.98;
  const avHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), avSkinMat);
  avHead.position.y = 1.52;
  const avHair = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), avHairMat);
  avHair.position.y = 1.55;
  avatarGroup.add(avLegL, avLegR, avTorso, avHead, avHair);
  avatarGroup.visible = false;
  scene.add(avatarGroup);
  let showAvatar = true, walkPhase = 0;

  let huntTargets = [];
  const huntBtn = bar.querySelector('[data-act-hunt]');
  const huntStatus = bar.querySelector('[data-hunt-status]');
  const huntProgress = new Map();
  const huntStorageKey = () => `plub_hunt_${activeArea?.id || 'bkk'}`;
  function getFoundHunt() {
    const key = huntStorageKey();
    if (!huntProgress.has(key)) {
      let ids = [];
      try { ids = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
      huntProgress.set(key, new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []));
    }
    return huntProgress.get(key);
  }
  function saveFoundHunt(found) {
    try { localStorage.setItem(huntStorageKey(), JSON.stringify([...found])); } catch {}
  }
  function updateHuntHud(msg) {
    const found = getFoundHunt();
    const done = huntTargets.filter(t => found.has(t.p.id)).length;
    const total = huntTargets.length;
    if (huntBtn) {
      huntBtn.hidden = !total;
      huntBtn.querySelector('.hunt-label').textContent = total && done === total ? `Hunt ${done}/${total} ✓` : `Hunt ${done}/${total}`;
      huntBtn.classList.toggle('is-complete', total > 0 && done === total);
    }
    if (msg) huntStatus.textContent = msg;
  }
  function markHuntFound(p) {
    if (!huntTargets.some(t => t.p.id === p.id)) return false;
    const found = getFoundHunt();
    if (found.has(p.id)) return false;
    found.add(p.id);
    saveFoundHunt(found);
    const t = huntTargets.find(x => x.p.id === p.id);
    if (t?.beacon) t.beacon.visible = false;
    if (t?.btn) {
      t.btn.classList.add('is-found');
      t.btn.querySelector('.pin-tag').textContent = `✓ ${p.n}`;
    }
    const done = huntTargets.filter(x => found.has(x.p.id)).length;
    updateHuntHud(done === huntTargets.length
      ? `District Hunt complete! ${done}/${huntTargets.length} spots found — ${p.n}`
      : `Hunt ${done}/${huntTargets.length}: found ${p.n}`);
    invalidate();
    return true;
  }

  // Camera & Style State
  const S = {
    mode: 'sky',
    px: 0, pz: 0,
    wyaw: 0, wpitch: -0.02,
    x: 0, z: 0,
    dist: 460, yaw: -0.45, pitch: 0.72,
    speed: 7,
    lens: '24',
    twoPoint: false
  };
  let hasRelief = false;
  let tod = 'day';
  let lookMode = 'color';
  let finishMode = 'tone';

  const areaSelect = bar.querySelector('.model-area select');
  const lightSelect = bar.querySelector('.model-light select');
  const lookSelect = bar.querySelector('.model-look select');
  const finishSelect = bar.querySelector('.model-finish select');
  const lensSelect = bar.querySelector('.model-lens select');
  const twoPtBtn = bar.querySelector('[data-act-2pt]');
  areaSelect.disabled = true;

  let groundMat = null;
  let outlineMat = null;

  function setTod(k) {
    tod = TOD[k] ? k : 'day';
    const t = TOD[tod];
    U.uPaper.value.set(t.paper);
    U.uInk.value.set(t.ink);
    U.uSkyTop.value.set(t.skyTop);
    U.uSkyHor.value.set(t.skyHor);
    U.uWallLit.value.set(t.wallLit);
    U.uWallShade.value.set(t.wallShade);
    U.uRoof.value.set(t.roof);
    U.uRoad.value.set(t.road);
    U.uEmissive.value.set(t.emissive);
    U.uSun.value.set(...t.sun).normalize();
    U.uInvert.value = t.invert;
    U.uSky.value = t.sky;
    U.uNight.value = t.night;
    U.uWet.value = t.wet;
    if (groundMat) {
      groundMat.color.set(t.invert > 0.5 ? '#0e1926' : (lookMode === 'paper' ? '#e3f2eb' : '#f3eee4'));
    }
    if (outlineMat) {
      outlineMat.color.set(t.invert > 0.5 ? '#527994' : (lookMode === 'paper' ? '#34454c' : '#3a2d38'));
    }
    renderer.setClearColor(t.skyHor);
    lightSelect.value = tod;
    invalidate();
  }

  function setLook(k) {
    lookMode = LOOK_CODES[k] !== undefined ? k : 'color';
    U.uLook.value = LOOK_CODES[lookMode];
    lookSelect.value = lookMode;
    setTod(tod);
  }

  function setFinish(k) {
    finishMode = FINISH_CODES[k] !== undefined ? k : 'tone';
    U.uFinish.value = FINISH_CODES[finishMode];
    finishSelect.value = finishMode;
    invalidate();
  }

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
    S.wpitch = -0.06;
    return true;
  }

  function buildGeometryFromFile(file, area) {
    // Clean up old meshes
    for (const m of currentMeshes) {
      scene.remove(m);
      m.geometry.dispose();
      if (m.material !== matB && m.material !== matRoad && m.material !== matWater) m.material.dispose();
    }
    currentMeshes = [];
    collisionGrid.clear();

    const origin = [area.anchor.y, area.anchor.x];
    const MX = 111320 * Math.cos(origin[0] * Math.PI / 180), MY = 110574;
    project = (lat, lng) => ({ x: (lng - origin[1]) * MX, z: -(lat - origin[0]) * MY });
    unproject = (x, z) => ({ lat: origin[0] - z / MY, lng: origin[1] + x / MX });

    const bList = file.buildings.features;
    const pos = [], uw = [], info = [], seedAttr = [], idx = [];
    const ground = [], groundIndices = [], outlines = [];
    let knownCount = 0;

    for (const building of bList) {
      const geometry = building.geometry;
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
      const props = building.properties || {};
      const { render3D, heightM, minHeightM } = props;
      const baseHeight = minHeightM ?? 0;
      const known = render3D === true && Number.isFinite(heightM) && heightM > baseHeight;
      if (known) knownCount++;

      const bSeed = hashStr(String(building.id || props.sourceID || ''));
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
        const wallInfo = known ? Math.floor(heightM * 2) * 8 + 4 : 0;
        const roofInfo = wallInfo + 1;

        for (const ring of rings) {
          if (coords.length) holes.push(coords.length / 2);
          for (let i = 0; i < ring.length; i += 2) {
            const j = (i + 2) % ring.length;
            const xa = ring[i], za = ring[i + 1], xb = ring[j], zb = ring[j + 1];
            coords.push(xa, za);
            outlines.push(xa, 0.04, za, xb, 0.04, zb);
            if (!known) continue;
            outlines.push(xa, heightM + 0.02, za, xb, heightM + 0.02, zb);
            const length = Math.hypot(xb - xa, zb - za);
            const v = pos.length / 3;
            pos.push(xa, baseHeight, za, xb, baseHeight, zb, xb, heightM, zb, xa, heightM, za);
            uw.push(0, length, length, length, length, length, 0, length);
            info.push(wallInfo, wallInfo, wallInfo, wallInfo);
            seedAttr.push(bSeed, bSeed, bSeed, bSeed);
            idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
          }
        }
        const triangles = earcut(coords, holes);
        const groundBase = ground.length / 3;
        const roofBase = pos.length / 3;
        for (let i = 0; i < coords.length; i += 2) {
          ground.push(coords[i], 0.02, coords[i + 1]);
          if (!known) continue;
          pos.push(coords[i], heightM, coords[i + 1]);
          uw.push(0, 0);
          info.push(roofInfo);
          seedAttr.push(bSeed);
        }
        for (const i of triangles) {
          groundIndices.push(groundBase + i);
          if (known) idx.push(roofBase + i);
        }
      }
    }

    // Street segments, crosswalks, and urban trees/poles
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
      const isMain = ['primary', 'secondary', 'tertiary', 'trunk'].includes(hw);
      const w = isMain ? 4.8 : ['footway', 'pedestrian', 'path'].includes(hw) ? 2.0 : 3.4;

      const pts = [];
      for (const pt of coords) {
        const p = project(pt[1], pt[0]);
        if (!pts.length || Math.hypot(p.x - pts[pts.length - 1].x, p.z - pts[pts.length - 1].z) > 0.5) {
          pts.push(p);
        }
      }
      if (pts.length < 2) continue;
      for (let k = 1; k < pts.length; k++) streetSegments.push([pts[k - 1], pts[k]]);

      let cumLen = 0;
      for (let k = 0; k < pts.length; k++) {
        if (k > 0) cumLen += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z);
        const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
        let dx = b.x - a.x, dz = b.z - a.z;
        const l = Math.hypot(dx, dz) || 1;
        dx /= l; dz /= l;
        roadPoints.push(pts[k].x - dz * w, 0.05, pts[k].z + dx * w, pts[k].x + dz * w, 0.05, pts[k].z - dx * w);
        // Pack isMain flag (+2.0) into across.x
        const flagOffset = isMain ? 2.0 : 0.0;
        roadAcross.push(flagOffset + 0.0, cumLen, flagOffset + 0.999, cumLen);
        if (k > 0) {
          const b0 = rv + (k - 1) * 2;
          roadIdx.push(b0, b0 + 1, b0 + 2, b0 + 1, b0 + 3, b0 + 2);
        }
      }
      rv += pts.length * 2;
    }

    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    bGeo.setAttribute('uw', new THREE.Float32BufferAttribute(uw, 2));
    bGeo.setAttribute('info', new THREE.Float32BufferAttribute(info, 1));
    bGeo.setAttribute('seed', new THREE.Float32BufferAttribute(seedAttr, 1));
    bGeo.setIndex(idx);
    bGeo.computeVertexNormals();

    const bMesh = new THREE.Mesh(bGeo, matB);
    scene.add(bMesh);
    currentMeshes.push(bMesh);

    if (groundIndices.length) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(ground, 3));
      geometry.setIndex(groundIndices);
      groundMat = new THREE.MeshBasicMaterial({ color: 0xf3eee4, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, groundMat);
      scene.add(mesh);
      currentMeshes.push(mesh);
    }
    if (outlines.length) {
      const fpGeo = new THREE.BufferGeometry();
      fpGeo.setAttribute('position', new THREE.Float32BufferAttribute(outlines, 3));
      outlineMat = new THREE.LineBasicMaterial({ color: 0x3a2d38 });
      const fpMesh = new THREE.LineSegments(fpGeo, outlineMat);
      scene.add(fpMesh);
      currentMeshes.push(fpMesh);
    }
    if (roadPoints.length) {
      const rGeo = new THREE.BufferGeometry();
      rGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPoints, 3));
      rGeo.setAttribute('across', new THREE.Float32BufferAttribute(roadAcross, 2));
      rGeo.setIndex(roadIdx);
      const rMesh = new THREE.Mesh(rGeo, matRoad);
      scene.add(rMesh);
      currentMeshes.push(rMesh);
    }

    hasRelief = knownCount > 0;
    const flatCount = bList.length - knownCount;
    coverageEl.textContent = knownCount
      ? `${knownCount} mapped heights · ${flatCount} flat footprints`
      : `No mapped building heights · ${flatCount} flat footprints`;
    reliefBtn.hidden = hasRelief || !mostRelief.heightVolumes;
    host.dataset.area = area.id;
    host.dataset.volumes = String(knownCount);
    host.dataset.massingVolumes = String(knownCount);
    host.dataset.streets = String(streetSegments.length);
    setTod(tod);
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
    huntStatus.textContent = '';
    areaSelect.value = area.id;
    cardEl.hidden = true;
    pinsContainer.innerHTML = '';
    placePins = [];

    buildGeometryFromFile(file, area);

    S.x = S.z = 0;
    const street = standNear(0, 0);
    bar.querySelector('[data-mode="walk"]').disabled = !street;
    S.yaw = -0.45;
    S.pitch = 0.68;
    S.dist = 440;
    setMode('sky');
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
    while (huntGroup.children.length) {
      const beacon = huntGroup.children[0];
      huntGroup.remove(beacon);
      beacon.traverse(obj => {
        obj.geometry?.dispose();
        obj.material?.dispose();
      });
    }
    huntTargets = [];
    const extra = (window.state?.clubMode && window.state?.kinds?.has('cannabis') && activeArea)
      ? window.state.places.filter(p => p.k === 'cannabis' && Math.hypot((p.y - activeArea.anchor.y) * 111320, (p.x - activeArea.anchor.x) * 111320 * Math.cos(activeArea.anchor.y * Math.PI / 180)) <= (activeArea.radiusM || 800))
      : [];
    const areaPlaces = [...new Set([...ids.map(opt.placeById).filter(Boolean), ...extra])]
      .sort((a, b) => Math.hypot(a.x - activeArea.anchor.x, a.y - activeArea.anchor.y) -
                     Math.hypot(b.x - activeArea.anchor.x, b.y - activeArea.anchor.y));

    const foundSet = getFoundHunt();
    const huntPool = areaPlaces.filter(p => p.k === 'cafe' || p.k === 'coworking' || p.k === 'cannabis').slice(0, 5);
    const huntIds = new Set(huntPool.map(p => p.id));

    placePins = areaPlaces.slice(0, 48).map(p => {
      const pt = project(p.y, p.x);
      const isHunt = huntIds.has(p.id);
      const isFound = isHunt && foundSet.has(p.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `model-pin pin-${p.k}${isHunt ? ' model-pin-hunt' : ''}${isFound ? ' is-found' : ''}`;
      btn.setAttribute('aria-label', p.n);
      btn.innerHTML = `<span class="pin-dot ${p.k}" aria-hidden="true"></span><span class="pin-tag"></span>`;
      btn.querySelector('.pin-tag').textContent = isHunt ? `${isFound ? '✓ ' : '★ '}${p.n}` : p.n;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        markHuntFound(p);
        openCard(p, pt);
      });
      pinsContainer.appendChild(btn);
      if (isHunt) {
        const beacon = new THREE.Group();
        beacon.position.set(pt.x, 0, pt.z);
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(1.1, 1.1, 46, 10),
          new THREE.MeshBasicMaterial({ color: 0xdd4027, transparent: true, opacity: 0.52 })
        );
        pillar.position.y = 23;
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(4.5, 6.2, 24),
          new THREE.MeshBasicMaterial({ color: 0xdd4027, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.25;
        beacon.add(pillar, ring);
        beacon.visible = !isFound;
        huntGroup.add(beacon);
        huntTargets.push({ p, x: pt.x, z: pt.z, btn, beacon });
      }
      return { p, x: pt.x, z: pt.z, btn };
    });
    updateHuntHud();
  }

  function openCard(p, pt) {
    cardEl.hidden = false;
    invalidate();
    cardEl.querySelector('.model-card-title').textContent = p.n;
    const distM = Math.round(Math.hypot(pt.x - S.px, pt.z - S.pz));
    cardEl.querySelector('.model-card-meta').textContent =
      `✦${p.idx} Oldenburg index · ${p.k} · ${distM} m away`;

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

  function drawMinimap() {
    if (!minimapCtx || !activeArea) return;
    const w = minimapCanvas.width, h = minimapCanvas.height;
    const rM = activeArea.radiusM || 800;
    const scale = (w * 0.45) / rM;
    const cx = w / 2, cy = h / 2;

    minimapCtx.clearRect(0, 0, w, h);
    minimapCtx.fillStyle = U.uInvert.value > 0.5 ? 'rgba(8, 16, 28, 0.9)' : 'rgba(249, 244, 236, 0.92)';
    minimapCtx.fillRect(0, 0, w, h);

    // Draw streets
    minimapCtx.strokeStyle = U.uInvert.value > 0.5 ? 'rgba(156, 196, 220, 0.42)' : 'rgba(70, 50, 65, 0.35)';
    minimapCtx.lineWidth = 1;
    minimapCtx.beginPath();
    for (let i = 0; i < streetSegments.length; i += 2) {
      const [a, b] = streetSegments[i];
      minimapCtx.moveTo(cx + a.x * scale, cy + a.z * scale);
      minimapCtx.lineTo(cx + b.x * scale, cy + b.z * scale);
    }
    minimapCtx.stroke();

    // Draw Rokehan-style cyan near-area square
    const nearHalf = 220 * scale;
    const tx = cx + S.x * scale, tz = cy + S.z * scale;
    minimapCtx.strokeStyle = '#18b6d4';
    minimapCtx.lineWidth = 1.5;
    minimapCtx.strokeRect(tx - nearHalf, tz - nearHalf, nearHalf * 2, nearHalf * 2);

    // Draw pins
    for (const item of placePins) {
      minimapCtx.fillStyle = '#34454c';
      minimapCtx.fillRect(cx + item.x * scale - 1.5, cy + item.z * scale - 1.5, 3, 3);
    }

    // Draw camera / walker position & view cone
    const px = cx + (S.mode === 'walk' ? S.px : S.x) * scale;
    const pz = cy + (S.mode === 'walk' ? S.pz : S.z) * scale;
    const yaw = S.mode === 'walk' ? S.wyaw : S.yaw;
    minimapCtx.fillStyle = 'rgba(24, 182, 212, 0.25)';
    minimapCtx.beginPath();
    minimapCtx.moveTo(px, pz);
    minimapCtx.arc(px, pz, 20, -yaw - Math.PI / 2 - 0.45, -yaw - Math.PI / 2 + 0.45);
    minimapCtx.closePath();
    minimapCtx.fill();

    minimapCtx.fillStyle = '#e11d48';
    minimapCtx.beginPath();
    minimapCtx.arc(px, pz, 3.5, 0, Math.PI * 2);
    minimapCtx.fill();
  }

  minimapCanvas.addEventListener('click', e => {
    if (!activeArea) return;
    const rect = minimapCanvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const nz = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    const wx = nx * (activeArea.radiusM / 0.9);
    const wz = nz * (activeArea.radiusM / 0.9);
    if (standNear(wx, wz)) {
      invalidate();
    }
  });

  // Camera positioning
  function placeCamera() {
    const baseFov = LENS_FOV[S.lens] || 70;
    cam.fov = S.mode === 'walk' ? baseFov : Math.max(32, baseFov - 14);
    cam.updateProjectionMatrix();

    const fogScale = TOD[tod]?.fogMul || 1.0;
    if (S.mode === 'sky') {
      const pitch = S.twoPoint ? 0.22 : S.pitch;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      cam.position.set(S.x + Math.sin(S.yaw) * cp * S.dist, Math.max(12, sp * S.dist), S.z + Math.cos(S.yaw) * cp * S.dist);
      cam.lookAt(S.x, S.twoPoint ? Math.max(12, sp * S.dist) * 0.65 : 0, S.z);
      U.uFogNear.value = 950 * fogScale;
      U.uFogFar.value = 3400 * fogScale;
    } else {
      cam.position.set(S.px, EYE, S.pz);
      cam.rotation.order = 'YXZ';
      cam.rotation.set(S.twoPoint ? 0 : S.wpitch, S.wyaw, 0);
      U.uFogNear.value = 420 * fogScale;
      U.uFogFar.value = 2100 * fogScale;
    }
  }

  function setMode(m, preset) {
    clearInput();
    S.mode = m;
    if (m === 'sky') {
      if (preset === 'rooftop') { S.pitch = 0.28; S.dist = 140; }
      else if (preset === 'aerial') { S.pitch = 0.82; S.dist = 330; }
    }
    bar.querySelectorAll('[data-mode]').forEach(b => {
      const active = m === 'walk'
        ? b.dataset.mode === 'walk'
        : b.dataset.mode === 'sky' && (preset ? b.dataset.preset === preset : b.dataset.preset === 'aerial');
      b.setAttribute('aria-pressed', String(active));
    });
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
      S.pitch = Math.max(0.24, Math.min(1.4, S.pitch + dy * 0.004));
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
  reliefBtn.textContent = `See 3D in ${mostRelief.name}`;
  reliefBtn.addEventListener('click', () => {
    areaSelect.focus();
    void loadArea(mostRelief).catch(() => { dispose(); opt.onError(); });
  });
  areaSelect.addEventListener('change', () => {
    const area = areas.find(candidate => candidate.id === areaSelect.value);
    areaSelect.value = activeArea?.id || startArea.id;
    if (area) void loadArea(area).catch(() => { dispose(); opt.onError(); });
  });
  lightSelect.addEventListener('change', () => setTod(lightSelect.value));
  lookSelect.addEventListener('change', () => setLook(lookSelect.value));
  finishSelect.addEventListener('change', () => setFinish(finishSelect.value));
  lensSelect.addEventListener('change', () => {
    S.lens = lensSelect.value;
    invalidate();
  });
  twoPtBtn.addEventListener('click', () => {
    S.twoPoint = !S.twoPoint;
    twoPtBtn.setAttribute('aria-pressed', String(S.twoPoint));
    invalidate();
  });
  bar.addEventListener('click', event => {
    const av = event.target.closest('[data-act-avatar]');
    if (av) {
      showAvatar = !showAvatar;
      av.setAttribute('aria-pressed', String(showAvatar));
      invalidate();
      return;
    }
    const mode = event.target.closest('[data-mode]');
    if (mode) { setMode(mode.dataset.mode, mode.dataset.preset); return; }
    if (event.target.closest('[data-act-hunt]')) {
      const found = getFoundHunt();
      const next = huntTargets.find(t => !found.has(t.p.id));
      if (next) {
        S.x = next.x; S.z = next.z;
        if (S.mode === 'walk') standNear(next.x, next.z);
        else setMode('sky', 'rooftop');
        updateHuntHud(`Next Hunt target: ${next.p.n}`);
        invalidate();
      } else {
        updateHuntHud('District hunt complete.');
      }
    }
  });

  function resize() {
    minimapCanvas.style.bottom = `${bottomBar.offsetHeight + 20}px`;
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    invalidate();
  }
  ro = new ResizeObserver(resize);
  ro.observe(host);
  ro.observe(bottomBar);

  function layoutPins() {
    const w = host.clientWidth, h = host.clientHeight;
    const posVec = new THREE.Vector3();
    const cx = S.mode === 'walk' ? S.px : S.x;
    const cz = S.mode === 'walk' ? S.pz : S.z;
    const radar = minimapCanvas.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const occupied = radar.width ? [{
      x: radar.left - hostRect.left, y: radar.top - hostRect.top,
      right: radar.right - hostRect.left, bottom: radar.bottom - hostRect.top
    }] : [];
    const top = bar.getBoundingClientRect().bottom + 6;
    const bottom = bottomBar.getBoundingClientRect().top - 6;
    const sizes = placePins.map(({ btn }) => [btn.offsetWidth, btn.offsetHeight]);

    for (const [index, item] of placePins.entries()) {
      const distance = Math.hypot(item.x - cx, item.z - cz);
      posVec.set(item.x, 4.2, item.z);
      posVec.project(cam);
      const [width, height] = sizes[index];
      const x = (posVec.x * 0.5 + 0.5) * w;
      const y = (-posVec.y * 0.5 + 0.5) * h - height / 2;
      const overlaps = occupied.some(other =>
        x < other.right + 4 && x + width > other.x - 4 && y < other.bottom + 4 && y + height > other.y - 4);
      item.btn.hidden = distance > 750 || Math.abs(posVec.z) > 1 || occupied.length >= 10 ||
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
        for (const t of huntTargets) {
          if (Math.hypot(t.x - S.px, t.z - S.pz) <= 22) markHuntFound(t.p);
        }
        walkPhase += dt * 9;
        dirty = true;
      }
    }

    if (dirty) {
      dirty = false;
      placeCamera();
      const useAv = S.mode === 'walk' && showAvatar;
      avatarGroup.visible = useAv;
      if (useAv) {
        avCoatMat.color.setHex(isClub() ? 0x819238 : 0x3f4256);
        avHairMat.color.setHex(isClub() ? 0x2c2927 : 0x7b4a2d);
        const x = S.px - Math.sin(S.wyaw) * 2.4;
        const z = S.pz - Math.cos(S.wyaw) * 2.4;
        avatarGroup.visible = !blocked(x, z);
        avatarGroup.position.set(x, 0, z);
        avatarGroup.rotation.y = S.wyaw;
        const swing = moving() ? Math.sin(walkPhase) * 0.45 : 0;
        avLegL.rotation.x = swing;
        avLegR.rotation.x = -swing;
      }
      sky.position.copy(cam.position);
      renderer.render(scene, cam);
      layoutPins();
      drawMinimap();
      if (shaderFailed && host.dataset.ready === 'true') { dispose(); opt.onError(); return; }
    }
    if (moving() && !raf) raf = requestAnimationFrame(loop);
  }

  // Check URL for initial tod or look override
  const urlParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
  const initTod = urlParams.get('tod') || hashParams.get('tod') || 'day';

  // Publish readiness only after the first geometry frame has rendered.
  if (!await loadArea(startArea) || disposed) return;
  setLook('color');
  setFinish('tone');
  setTod(TOD[initTod] ? initTod : 'day');
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
