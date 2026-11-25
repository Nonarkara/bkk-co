// PLUB · Placemaking Laboratory Urban Bureau. Map, filters, sorting, search, place sheet. No bundler, no framework.
// views.js adds the guide, neighbourhood and passport sheets on top of the helpers defined here.
const KIND_LABEL = { cafe: 'Café', restaurant: 'Food', coworking: 'Co-working', library: 'Library', cannabis: 'Cannabis listing' };
const CLUB_TYPES = { clinic: 'Mapped clinic', cafe: 'Mapped café', dispensary: 'Mapped dispensary', other: 'Type unverified' };
const safeLink = value => { try { const u=new URL(value); return ['https:','http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; } };
const F = { WIFI: 1, NOWIFI: 2, HOURS: 4, OUTDOOR: 8, OVERTURE: 16, CHAIN: 32, NOTABLE: 64, HAND: 128, PARK: 256, COFFEE: 512, LATE: 1024 }; // LATE is ours: late night is an overlay on places, not a kind in the catalogue, so build-places.py stops at COFFEE.
// a place nobody has mapped yet goes to OpenStreetMap as a note; the next rebuild picks it up once mapped
const osmNote = (y, x) => `https://www.openstreetmap.org/note/new#map=19/${y.toFixed(5)}/${x.toFixed(5)}`;
const SCORES = [
  ['wifi', 'Wi-Fi', ['None', 'Slow', 'Fast']],
  ['power', 'Outlets', ['None', 'Few', 'Plenty']],
  ['quiet', 'Quiet', ['Loud', 'OK', 'Quiet']],
  ['laptop', 'Laptop', ['No', 'OK', 'Welcome']],
];
// Great Good Place metrics: one decile digit each, computed in scripts/build-places.py
const GGP = [
  ['A', '↦', 'Access', 'walk to rail'],
  ['S', '⁘', 'Scene', 'third places within 250 m'],
  ['C', '◇', 'Character', 'independent, not a chain'],
  ['F', '◎', 'Footprint', 'datasets and channels that know it'],
  ['W', '≋', 'Work', 'co-working, library, Wi-Fi, hours'],
  ['N', '✦', 'Notable', 'Wikidata, Wikipedia or heritage record'],
];
// Moods: each neighbourhood's "for" line, searched across the whole city with data we really have.
const nextAt = (h, m, weekday) => { // the next time this clock time comes round (on a weekday if asked)
  const d = new Date(Date.now()+7*3600000); d.setUTCHours(h,m,0,0);
  if (d.getTime()-7*3600000 <= Date.now()) d.setUTCDate(d.getUTCDate()+1);
  while (weekday && (d.getUTCDay()===0 || d.getUTCDay()===6)) d.setUTCDate(d.getUTCDate()+1);
  return new Date(d.getTime()-7*3600000);
};
const MOODS = {
  slow: { label: 'Slow mornings', hood: 'ari', kinds: ['cafe'],
    how: 'Independent cafés away from the busiest strips (⁘ ≤ 6 of 9).',
    test: p => !(p.flags & F.CHAIN) && p.d[1] <= 6 },
  midnight: { label: 'Past midnight', hood: 'samyan', kinds: ['cafe', 'coworking', 'library'],
    how: 'Work spots listed as open at 00:30 and also open in the afternoon (so not a night-only bar). Only places with listed hours can show here, so this list is short.',
    test: p => window.isOpen(venueHours(p), nextAt(0, 30)) === true && window.isOpen(venueHours(p), nextAt(14, 0)) !== false },
  crossing: { label: 'Crossing paths', hood: 'charoenkrung', kinds: ['cafe', 'coworking', 'library'],
    how: 'Independent work spots in the densest clusters (⁘ ≥ 8 of 9).',
    test: p => !(p.flags & F.CHAIN) && p.d[1] >= 8 },
  afterwork: { label: 'After work', hood: 'thonglo', kinds: ['cafe', 'coworking', 'library', 'restaurant'],
    how: 'Open at 8 pm on a weekday, food included. Only places with listed hours.',
    test: p => window.isOpen(venueHours(p), nextAt(20, 0, true)) === true },
};

const CELL = 20;
const $ = s => document.querySelector(s);
// The rail must say what it is doing before the first byte of the catalogue
// arrives. The static markup says "Loading…"; the rows themselves follow at
// once, so the panel is never an empty white slab while the request is on the
// wire.
paintLoadingRail(false);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// A catalogue name may be Thai. Thai needs its own face, its own leading and no
// tracking — and the browser only applies those when the text is marked as Thai.
// Without the mark, Thai names fall back to a Latin stack and their stacked
// vowel/tone marks lose the room they need.
// One implementation, shared: PlaceTools loads before every surface that names a place.
const nm = s => PlaceTools.name(s);const fmt = n => n.toLocaleString('en-US');
const isPhone = () => !window.matchMedia('(min-width: 900px)').matches;
const metres = (a, b) => Math.hypot((a.y - b.y) * 111320, (a.x - b.x) * 111320 * Math.cos(a.y * Math.PI / 180));
// A distance is read at a glance: metres under a kilometre, kilometres above it.
// Raw metres wrote "73210 m" for a venue three quarters of an hour away.
const distLabel = (m) => m >= 1000
  ? `~${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km`
  : `~${Math.round(m / 10) * 10} m`;
const digits = p => [...p.g].map(Number);
const venueHours = p => window.WorkFinder?.hours(p) || p.hours;

const state = {
  places: [], byId: new Map(), scores: {}, cells: new Map(), visited: new Map(), personalRatings: new Map(),
  kinds: new Set(['cafe', 'coworking', 'library']), flags: new Set(), // Food is one tap away, off by default
  sort: 'near', mood: null, selected: null, foodLoaded: false, cannabisLoaded: false, lateNightLoaded: false, clubMode: false, sortedIdx: [], sortedCannabisIdx: [], cannabisHotspots: [],
  // The catalogue's own state. 'loading' is not the same as 'empty': a reader
  // told "0 places" while the catalogue is still on the wire is told the city
  // is empty, and a reader told that after a failed fetch is told it for good.
  catalogueStatus: 'loading', catalogueError: null, cannabisStatus: 'loading',
};
window.state = state;
const cannabisDetails = new Map();
const isClubStartup = () => location.hostname === 'club.nonarkara.org' || new URLSearchParams(location.search).get('mode') === 'club';

// Retired place ids (merged twins, scripts/clean-catalogue.py) resolve to the venue that absorbed them, so shared
// links, saved visits and notebook entries made before the clean still open the right place. byId.size is unchanged.
let ALIAS = {};
const aliasesReady = fetch('data/aliases.json').then(r => (r.ok ? r.json() : {})).then(a => { ALIAS = a; }).catch(() => {});
const canonId = id => ALIAS[id] || id;
{ const get = state.byId.get.bind(state.byId), has = state.byId.has.bind(state.byId);
  state.byId.get = id => get(id) ?? get(ALIAS[id]);
  state.byId.has = id => has(id) || has(ALIAS[id]); }

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: [100.51518, 13.7315], zoom: 16.8, minZoom: 9, maxZoom: 19,
  maxBounds: [[99.9, 13.1], [101.35, 14.45]], renderWorldCopies: false,
  attributionControl: { compact: true, customAttribution: 'Places © <a href="https://overturemaps.org">Overture Maps</a> · © OSM contributors' },
});
MapMotion.bind(map);
// The rail is a panel over the map's left edge, so the camera's centre must be
// the centre of the map the reader can actually see — not the centre of the
// canvas the panel covers. Without this the ground would move 180px left the
// moment the rail became a floating panel.
const RAIL_WIDTH = 360;
const railPadding = () => (isPhone()
  ? { top: 0, bottom: 0, left: 0, right: 0 }
  : { top: 0, bottom: 0, left: RAIL_WIDTH, right: 0 });
try { map.setPadding(railPadding()); } catch { /* the transform is not ready yet */ }
// MapLibre's getBounds() reads the whole canvas. The rail is a paper panel over
// the canvas's left edge, so the ground the reader pans on the right of the
// paper is a region, not the canvas. The layers that draw over the map — the
// atlas hats, the district shapes — are clipped to that region so they never
// grow under the paper. This is a DRAWING region, not a visibility test: the
// reader also sees the strip of ground below the panel, and the place list
// counts what is actually on screen, which is a different question with a
// different answer. See visibleOnMap().
const rawGetBounds = map.getBounds.bind(map);
map.getBounds = () => {
  const bounds = rawGetBounds();
  if (isPhone()) return bounds;
  const canvas = map.getCanvas();
  const sw = map.unproject([RAIL_WIDTH, canvas.clientHeight]);
  const ne = map.unproject([canvas.clientWidth, 0]);
  return new maplibregl.LngLatBounds(sw, ne);
};
// "Places in view" is one question with one answer: can the reader see this
// place on the map right now? The visible map is not a rectangle. The rail is a
// paper panel laid over the canvas that ends where its content ends, so the
// ground the reader can see is an L — and the Key legend and the map's own
// controls cover patches of it. A bounding box cannot say any of that, and the
// first cut (a fixed 360px column for the canvas's whole height) counted three
// painted places as invisible and one invisible place as visible. The DOM can
// say it: a place is visible when the topmost thing at its projected pixel is
// the map canvas itself.
function visibleOnMap(place, overlay) {
  const canvas = map.getCanvas();
  if (!canvas) return false;
  // MapLibre takes a LngLatLike, not a {x,y} pair: normalise or it throws.
  const lngLat = Array.isArray(place) ? place : [place.x, place.y];
  const pt = map.project(lngLat);
  if (pt.x < 0 || pt.y < 0 || pt.x > canvas.clientWidth || pt.y > canvas.clientHeight) return false;
  const box = canvas.getBoundingClientRect();
  const top = document.elementsFromPoint(box.left + pt.x, box.top + pt.y)[0];
  if (!top) return false;
  if (top === canvas) return true;
  // The reader's own panel — the phone drawer, the place sheet — is not
  // permanent chrome: they opened it to read the list, and it must not
  // redefine what the map contains. Without this, opening the drawer shrank
  // the count under the reader's thumb and broke the disclosure's own promise
  // ("Show all 48 places" delivered eight).
  if (overlay && (overlay === top || overlay.contains(top))) return true;
  // Anything else standing on the canvas — the paper panel, the Key legend,
  // the attribution button — covers the place, and the place is not visible.
  // The places are a MapLibre layer, not DOM markers, so nothing needs an
  // exception here.
  return false;
}
// The reader's own temporary panel, if one is open. Computed once per render.
function readerOverlay() {
  if (!isPhone()) return null;
  const wrap = $('#list-wrap');
  if (wrap && wrap.classList.contains('open')) return wrap;
  const sheet = $('#sheet');
  if (sheet && !sheet.hidden && sheet.checkVisibility()) return sheet;
  return null;
}
globalThis.visibleOnMap = visibleOnMap;
addEventListener('resize', () => {
  const want = railPadding();
  const have = map.getPadding();
  if (have.left === want.left && have.right === want.right && have.top === want.top && have.bottom === want.bottom) return;
  try { map.setPadding(want); } catch { /* the map is not ready yet */ }
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
if ('geolocation' in navigator) map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-right');
// A lens, not a second map: the same source, drawn as line and tone.
window.MangaLens?.attach(map);
window.FootprintPalette?.attach(map, { deferRetained: true });
window.NeighborhoodPalette?.attach(map);

// ---------- data ----------
async function loadRows(name) {
  const response = await fetch(`data/places-${name}.json`);
  if (!response.ok) throw new Error(`places-${name}.json answered ${response.status}`);
  const { kinds, rows } = await response.json();
  // idx: Great Good Place index, mean of the A/S/C/F percentiles (scripts/build-places.py)
  for (const [id, n, k, y, x, flags, g, idx, hours] of rows) {
    // A retry must not load the same catalogue twice. The reader who pressed
    // Retry on a failed fetch should get one catalogue, not two copies of it.
    if (state.byId.has(id)) continue;
    const p = { id, n, k: kinds[k], y, x, flags, g, idx, hours, low: n.toLowerCase() };
    p.d = digits(p);
    state.places.push(p); state.byId.set(id, p);
  }
  state.sortedIdx = state.places.filter(p => p.k !== 'cannabis').map(p => p.idx).sort((a, b) => a - b);
}

async function loadScores() {
  state.scoresStatus='loading';
  const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),8000);
  try {
    const r = await fetch('/api/scores', { signal:controller.signal });
    if (r.ok) { state.scores = await r.json(); state.scoresStatus='available'; } else state.scoresStatus='unavailable';
  } catch { state.scoresStatus='unavailable'; }
  finally { clearTimeout(deadline); }
}

async function loadVisits() {
  try {
    state.visited = new Map();
    state.personalRatings = new Map();
    for (const v of await Passport.all()) {
      const place = canonId(v.place);
      state.visited.set(place, (state.visited.get(place) || 0) + 1);
      if (Number.isInteger(v.stars) && v.stars > 0 && v.stars <= 5 && (!state.personalRatings.has(place) || v.at > state.personalRatings.get(place).at)) state.personalRatings.set(place, {stars:v.stars,at:v.at});
    }
  } catch { /* private window without IndexedDB: the passport stays empty */ }
  $('#pass-n').textContent = state.visited.size;
}

async function cellDetail(p) {
  if (p.k === 'cannabis' && cannabisDetails.has(p.id)) return { ...cannabisDetails.get(p.id), loaded: true };
  const key = `${Math.floor(p.y * CELL)}-${Math.floor(p.x * CELL)}`;
  if (!state.cells.has(key)) state.cells.set(key, fetch(`data/cells/${key}.json`).then(r => (r.ok ? r.json() : {})).catch(() => ({})));
  return { ...((await state.cells.get(key))[p.id] || {}), loaded: true };
}

let cannabisPromise = null;
async function loadCannabis({ retry = false } = {}) {
  if (state.cannabisLoaded) return;
  if (retry) cannabisPromise = null;
  if (!cannabisPromise) {
    state.cannabisStatus = 'loading';
    cannabisPromise = fetch('data/places-cannabis.json')
      .then(r => { if (!r.ok) throw Error('Club catalogue unavailable'); return r.json(); })
      .then(d => {
        if (!Array.isArray(d?.rows)) throw Error('Invalid club catalogue');
        for (const [id, n, k, y, x, flags, g, idx, hours] of d.rows) {
          if (state.byId.has(id)) continue;
          const p = { id, n, k: d.kinds[k], y, x, flags, g, idx, hours, low: n.toLowerCase() };
          p.d = digits(p);
          state.places.push(p);
          state.byId.set(id, p);
        }
        for (const [id, det] of Object.entries(d.details || {})) {
          cannabisDetails.set(id, det);
          const place = state.byId.get(id);
          if (place) { place.hub = det.hub1km; place.sub = det.sub; place.th = det.th; place.prov = det.prov; place.tier = det.tier; }
        }
        // The tiers are counted from the venues themselves, so the board cannot
        // quote one classification and label it with another.
        const byTier = {};
        for (const det of Object.values(d.details || {})) { const t = det.tier || 'C'; byTier[t] = (byTier[t] || 0) + 1; }
        state.cannabisStats = { total: d.total, bySub: d.bySub || {}, byProvince: d.byProvince || {}, byTier };
        state.cannabisHotspots = Array.isArray(d.hotspots) ? d.hotspots : [];
        state.sortedIdx = state.places.filter(p => p.k !== 'cannabis').map(p => p.idx).sort((a, b) => a - b);
        state.sortedCannabisIdx = state.places.filter(p => p.k === 'cannabis').map(p => p.idx).sort((a, b) => a - b);
        state.cannabisLoaded = true;
        state.cannabisStatus = 'ready';
      })
      // A failed attempt is not repeated behind the reader's back. The rail says
      // "unavailable" and stays there until the reader presses the button that
      // really re-fetches. A directory that flickers from unavailable back to
      // loading on its own is a directory the reader cannot reason about.
      .catch(error => { state.cannabisStatus = 'failed'; console.error('The cannabis directory did not load', error); });
  }
  await cannabisPromise;
}

let lateNightPromise = null;
async function loadLateNight() {
  if (state.lateNightLoaded) return;
  if (!lateNightPromise) {
    lateNightPromise = fetch('data/late-night.json')
      .then(r => { if (!r.ok) throw Error('Late night catalogue unavailable'); return r.json(); })
      .then(d => {
        if (!d?.places) throw Error('Invalid late night catalogue');
        const places = d.places;
        for (const id of Object.keys(places)) {
          const p = state.byId.get(id);
          if (!p) continue;
          p.flags |= F.LATE;
          p.lateNight = places[id];
        }
        state.lateNightStats = { total: d.places ? Object.keys(d.places).length : 0 };
        state.lateNightLoaded = true;
      })
      .catch(() => { lateNightPromise = null; });
  }
  await lateNightPromise;
}

const BKK_BOUNDS = [[99.9, 13.1], [101.35, 14.45]];
const TH_BOUNDS = [[97.0, 5.3], [106.0, 20.8]];

// A failed directory is worth asking for again. The reader gets a button that
// actually fetches, and the rail says "Loading" while it does.
async function retryDirectory() {
  if (state.clubMode) {
    state.cannabisStatus = 'loading';
    renderClubHotspots();
    refresh();
    await loadCannabis({ retry: true });
    renderClubHotspots();
    // The camera never reached the listings while the directory was missing,
    // because there was nothing to frame. Now there is: the map goes where the
    // listings are, so the reader is not left looking at an empty Bangkok with
    // a full directory behind it.
    if (state.cannabisLoaded) {
      const landing = clubLanding();
      if (landing) map.jumpTo({ center: landing.center, zoom: landing.zoom, animate: false });
      else {
        const bounds = clubBounds();
        if (bounds) map.fitBounds(bounds, { padding: 18, animate: false });
      }
    }
    refresh();
    return;
  }
  state.catalogueStatus = 'loading';
  state.catalogueError = null;
  refresh();
  try {
    await Promise.all([loadRows('work'), loadVisits()]);
    state.catalogueStatus = 'ready';
    if (state.kinds.has('restaurant')) await ensureFood();
    openFromUrl();
  } catch (error) {
    state.catalogueStatus = 'failed';
    state.catalogueError = error;
    console.error('The catalogue did not load', error);
  }
  refresh();
}

function renderClubHotspots() {
  const box = $('#club-hotspots');
  if (!box) return;
  box.hidden = !state.clubMode;
  if (!state.clubMode) { box.replaceChildren(); return; }
  if (!state.cannabisLoaded) {
    // "Unavailable" is a fact about a failed load, not about one still in
    // flight. Saying it while the directory is on the wire is the same lie the
    // rail used to tell.
    // And it is said ONCE. The rail's list already carries "Directory
    // unavailable" with the Retry button; this banner said it a second time,
    // with a second Retry button, at the top of the screen. Two banners and
    // two buttons for one failure is a choice the reader was asked to make for
    // no reason. The list owns the failure; this box stays empty.
    if (state.cannabisStatus === 'failed') {
      box.hidden = true;
      box.replaceChildren();
      return;
    }
    box.hidden = false;
    box.innerHTML = '<span role="status">Loading Thailand listings…</span>';
    return;
  }
  const total = state.cannabisStats?.total ?? state.places.filter(p => p.k === 'cannabis').length;
  box.innerHTML = `<details><summary>Browse hotspots · ${state.cannabisHotspots.length}</summary>
    <div class="hotspots-row"><button type="button" class="hotspot-pill" data-thailand><b aria-label="All ${total} listings across Thailand">☷</b><span>All Thailand · ${fmt(total)}</span></button>${state.cannabisHotspots.map((h, i) =>
      `<button type="button" class="hotspot-pill" data-hotspot="${i}"><b aria-label="${h.count} listings within 1.5 km">${h.count}</b><span>Near ${nm(h.name)}</span></button>`
    ).join('')}</div></details>`;
}

let clubModeChange = 0;
// CL;UB's landing camera is the metro, not the country. Fitting all 329
// listings put the reader at 4.3 km per pixel: most of the phone screen
// carried three cluster numbers and no street line-work. Bangkok holds 160 of
// the listings, so the map opens on the listings themselves, at a zoom where
// the basemap still draws its streets. "All Thailand" stays reachable — but
// as an action the reader takes, never as the view they arrive in.
const CLUB_LANDING_ZOOM = 12;
function clubLanding() {
  const bkk = state.places.filter(p => p.k === 'cannabis' && p.prov === 'Bangkok');
  if (!bkk.length) return null;
  const mid = Math.floor(bkk.length / 2);
  const lats = bkk.map(p => p.y).sort((a, b) => a - b);
  const lngs = bkk.map(p => p.x).sort((a, b) => a - b);
  return { center: [lngs[mid], lats[mid]], zoom: CLUB_LANDING_ZOOM };
}
function clubBounds() {
  const bounds = new maplibregl.LngLatBounds();
  for (const p of state.places) if (p.k === 'cannabis') bounds.extend([p.x, p.y]);
  return bounds.isEmpty() ? null : bounds;
}

// The mode's own colours on the map. PL;UB's ground is Grand Budapest pink and
// CL;UB's is Botanical Green — one product, one palette, one job for each
// colour. The manga lens brings PL;UB's ground with it every time it installs
// its layers, which happens after its own style is fetched. So the mode's
// palette is applied from ONE place, and that place is called again when the
// lens installs. Otherwise the order of two network requests decides which
// product's map the reader lands on, and the reader's mode is a race.
//
// It was a race: the lens's style arrived after the mode was claimed, and
// CL;UB painted PL;UB's ground. The palette now follows the mode.
function applyModePalette() {
  const on = state.clubMode;
  if (map.getLayer('manga-ground')) map.setPaintProperty('manga-ground', 'background-color', on ? '#b5decc' : '#f9c1ce');
  if (map.getLayer('manga-park')) map.setPaintProperty('manga-park', 'fill-color', on ? '#87c540' : '#f5ecc2');
  window.Atlas?.setClubPalette?.(on);
  // PL;UB's twelve neighbourhood rings and their labels are a PL;UB instrument.
  // In CL;UB they were drawn over the cannabis map, and the labels — which carry
  // a working-mood suffix — sat on top of the cluster counts they collided with.
  for (const layer of ['hood-fill', 'hood-line', 'hood-label']) {
    if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', on ? 'none' : 'visible');
  }
}
globalThis.applyModePalette = applyModePalette;
async function setClubMode(on, { frame = true } = {}) {
  const attempt = ++clubModeChange;
  const switching = state.clubMode !== Boolean(on);
  state.clubMode = !!on;
  state.mood = null;
  if (on) {
    for (const flag of ['wifi', 'indie', 'work']) {
      state.flags.delete(flag);
      document.querySelector(`[data-flag="${flag}"]`)?.setAttribute('aria-pressed', 'false');
    }
    state.kinds = new Set(['cannabis']);
  }
  $('#hits').hidden = true;
  if (state.selected) closeSheet();
  $('#map').setAttribute('aria-label', on ? 'Map of Thailand cannabis listings' : 'Map of Great Good Places in Bangkok');
  for (const option of $('#list-order').options) {
    option.hidden = (option.value === 'hubs') ? !on : (on && !['near', 'great'].includes(option.value));
    if (option.value === 'great') option.textContent = on ? 'Most listing details' : 'Third Place Index';
  }
  if (!on && state.sort === 'hubs') state.sort = 'near';
  if (on && !['near', 'great', 'hubs'].includes(state.sort)) state.sort = 'near';
  // At a country-wide view "near the map centre" means near the middle of
  // Thailand, which is nowhere. The directory's own story at that scale is
  // where the listings concentrate, so that is how the list opens — unless the
  // reader chose an order themselves.
  if (on && state.sort === 'near' && !state.sortChosen) state.sort = 'great';
  if (!on && state.sort === 'hubs') state.sort = 'near';
  document.body.classList.toggle('club-mode', on);
  const mark = $('.mark');
  if (mark) {
    const semi = mark.querySelector('.semi')?.outerHTML || '<span class="semi">;</span>';
    mark.innerHTML = on ? `CL${semi}UB` : `PL${semi}UB`;
    mark.setAttribute('aria-label', on ? 'CLUB, Cannabis Laboratory Urban Bureau, home' : 'PLUB, Placemaking Laboratory Urban Bureau, home');
    mark.title = on ? 'CL;UB · Cannabis Laboratory ; Urban Bureau' : 'PLUB · Placemaking Laboratory ; Urban Bureau';
  }
  const listToggle = $('#list-toggle');
  listToggle.classList.toggle('bar-btn', on);
  if (on) $('.bar-actions').prepend(listToggle);
  else $('.chips').prepend(listToggle);
  for (const button of document.querySelectorAll('.chips [data-kind]')) button.hidden = on;
  const toggle = $('#club-toggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(on));
    if (location.hostname === 'club.nonarkara.org') toggle.textContent = 'PL;UB · Work places';
  }
  if (on) {
    if (!state.cannabisLoaded) {
      const box = $('#club-hotspots');
      box.hidden = false;
      box.textContent = 'Loading Thailand listings…';
    }
    await loadCannabis();
    if (attempt !== clubModeChange) return;
    map.setMaxBounds(TH_BOUNDS);
    map.setMinZoom(5);
    if (frame && state.cannabisLoaded && !new URL(location.href).searchParams.has('p')) {
      const landing = clubLanding();
      if (landing) map.jumpTo({ center: landing.center, zoom: landing.zoom, animate: false });
      else {
        const bounds = clubBounds();
        if (bounds) map.fitBounds(bounds, { padding: 18, animate: false });
      }
    }
  } else {
    state.kinds = new Set(['cafe', 'coworking', 'library']);
    for (const b of document.querySelectorAll('.chips [data-kind]')) {
      if (b.dataset.kind !== 'cannabis') b.setAttribute('aria-pressed', String(state.kinds.has(b.dataset.kind)));
    }
    map.setMaxBounds(BKK_BOUNDS);
    map.setMinZoom(9);
    ensureWork();
  }
  if (switching) window.Atlas?.reset?.();
  renderClubHotspots();
  applyModePalette();
  window.updateMascot?.(on);
  // PL;UB's twelve neighbourhood rings and their labels are a PL;UB instrument.
  // In CL;UB they were drawn over the cannabis map, and the labels — which carry
  // a working-mood suffix — sat on top of the cluster counts they collided with.
  const hint = $('#list-guide-hint');
  if (hint) hint.innerHTML = on
    ? 'Pick a Thailand hotspot or tap a venue. Toggle <b>Einstein tiles</b> for density.'
    : 'Tap a row to inspect details, or toggle <b>Einstein tiles</b> for concentration.';
  const u = new URL(location.href);
  if (on && location.hostname !== 'club.nonarkara.org') u.searchParams.set('mode', 'club');
  else u.searchParams.delete('mode');
  history.replaceState(null, '', u);
  refresh();
}

let venueReports;
// The visit reports are 7 KB of named, dated, first-hand evidence. A reader on a
// slow connection must not lose them to a two-and-a-half second deadline: the
// sheet would simply have no report on it, with nothing to say so.
function loadVenueReports() {
  return venueReports ??= fetch('data/venue-reports.json', { signal: AbortSignal.timeout(10000) })
    .then(r => { if (!r.ok) throw Error('Visit reports unavailable'); return r.json(); })
    .catch(() => { venueReports = undefined; return {}; });
}

// share of Bangkok places this one beats, from the sorted index list.
// Only a work place carries a Great Good Place index, so the denominator is
// always PL;UB's own catalogue. A dispensary carries a count of listed detail
// fields instead, and is never ranked among cafés.
function topShare(p) {
  const list = state.sortedIdx;
  const n = list.length;
  if (!n) return 0;
  let lo = 0, hi = n;
  while (lo < hi) { const m = (lo + hi) >> 1; if (list[m] < p.idx) lo = m + 1; else hi = m; }
  return Math.max(1, Math.round(100 * (1 - lo / n)));
}

function workScore(p) {
  const s = state.scores[p.id];
  return p.d[4] + (s ? (s.wifi + s.power + s.quiet + s.laptop) * 0.75 : 0);
}

// ---------- filtering ----------
function visible(p, now) {
  if (!state.kinds.has(p.k) || !Atlas.includes(p)) return false;
  if (state.mood && !MOODS[state.mood].test(p)) return false;
  if (state.flags.has('wifi') && !(p.flags & F.WIFI) && !((state.scores[p.id]?.wifi || 0) >= 2)) return false;
  if (state.flags.has('open') && window.isOpen(venueHours(p), now) !== true) return false;
  if (state.flags.has('late') && !(p.flags & F.LATE)) return false;
  if (state.flags.has('indie') && p.flags & F.CHAIN) return false;
  if (state.flags.has('visited') && !state.visited.has(p.id)) return false;
  if (state.flags.has('work')) {
    const s = state.scores[p.id];
    const ws = workScore(p);
    if (!s || ws < 5) return false;
  }
  return true;
}

let lastList = [];
function refresh() {
  const now = new Date();
  lastList = state.places.filter(p => visible(p, now));
  map.getSource('places')?.setData({
    type: 'FeatureCollection',
    features: lastList.map(p => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [p.x, p.y] },
      properties: { ...Atlas.props(p), id: p.id, n: p.n, k: p.k, i: p.idx, v: state.visited.has(p.id) ? 1 : 0, m: state.mood ? 1 : 0 },
    })),
  });
  Atlas.onRefresh(lastList);
  window.FootprintPalette?.refresh(lastList);
  const total = state.places.length - state.sortedCannabisIdx.length;
  $('#count').textContent = `${fmt(lastList.length)} matching`;
  $('#list-filter-count').textContent=state.flags.size?' · '+state.flags.size:'';
  $('#list-matching').textContent=state.clubMode ? `${fmt(lastList.length)} matching listings across the mapped areas. Hours are from source records.` : `${fmt(lastList.length)} matching catalogue places of ${fmt(total)} across the covered Bangkok area. Wi-Fi and hours depend on documented or visitor information.`;
  renderMood();
  renderList();
  performance.mark(map.getSource('places') ? 'bkk:pins' : 'bkk:data');
}

const scoresReady=loadScores().then(()=>{
  if(state.places.length)refresh();
  const panel=document.querySelector('#sheet .scores');if(panel&&state.selected)panel.innerHTML=scoreHtml(state.selected);
  window.WorkFinder?.kindsChanged();
});
// The mode is known from the URL before any catalogue is on the wire. Claiming
// it now means the cannabis host never paints PL;UB's café list for half a
// second while its own directory is still loading: the reader arrived at a
// cannabis wordmark and must not be handed a café list first.
if (isClubStartup()) setClubMode(true);

let workRequest, foodRequest, branchRequest;
let foodStatus = 'idle';
let branchLabels = {};
function applyBranchLabels() {
  for (const [id, label] of Object.entries(branchLabels)) {
    const place = state.byId.get(id);
    if (place) place.branch = label;
  }
}
function loadBranches() {
  branchRequest ??= fetch('data/branches.json').then(r => r.ok ? r.json() : {}).then(labels => {
    branchLabels = labels;
    applyBranchLabels();
    renderList();
  }).catch(() => {});
  return branchRequest;
}
function ensureWork() {
  if (state.catalogueStatus === 'ready') return Promise.resolve();
  workRequest ??= aliasesReady.then(() => Promise.all([loadRows('work'), loadVisits()]))
    .then(() => {
      state.catalogueStatus = 'ready';
      refresh();
      loadLateNight().then(refresh);
    })
    .catch(error => {
      state.catalogueStatus = 'failed';
      state.catalogueError = error;
      console.error('The catalogue did not load', error);
      refresh();
    });
  return workRequest;
}
function ensureFood({ retry = false } = {}) {
  if (state.foodLoaded || (foodStatus === 'failed' && !retry)) return Promise.resolve();
  foodRequest ??= ensureWork().then(async () => {
    if (state.catalogueStatus !== 'ready') return;
    foodStatus = 'loading';
    try {
      await loadRows('food');
      state.foodLoaded = true;
      foodStatus = 'ready';
      applyBranchLabels();
    } catch (error) {
      foodStatus = 'failed';
      console.error('The food catalogue did not load', error);
    }
    refresh();
  }).finally(() => { foodRequest = null; });
  return foodRequest;
}
if (!isClubStartup()) ensureWork();

const branchTag = p => (p.branch ? `<span class="branch">· ${esc(p.branch)}</span>` : '');

const PIN_LAYERS = ['pins-city', 'pins-street', 'pins', 'place-icons'];

// ---------- map layers ----------
// Catalogue points and planner links can start once the style is parsed.
// Waiting for map load leaves both blocked on the first round of basemap tiles.
map.once('style.load', async () => {
  map.addSource('places', { type: 'geojson', cluster:true, clusterRadius:72, clusterMaxZoom:19, maxzoom:20, clusterProperties:Object.fromEntries([['cafes','cafe'],['food','restaurant'],['work','coworking'],['books','library'],['late','late']].map(([key,kind])=>[key,['+',['case',['==',['get','k'],kind],1,0]]])), data: { type: 'FeatureCollection', features: [] } });
  map.addSource('sel', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  window.addHoodLayers?.(); // views.js: neighbourhood rings sit under the pins
  // Every matching record participates in clustering. These transparent backing layers
  // retain the legacy interaction surfaces; semantic symbols carry the visible marks.
  for (const [id,minzoom,maxzoom] of [['pins-city',0,13],['pins-street',13,15],['pins',15,24]]) map.addLayer({id,type:'circle',source:'places',minzoom,maxzoom,filter:['!',['has','point_count']],paint:{'circle-radius':14,'circle-opacity':0}});
  map.addLayer({ id: 'pin-city-names', type: 'symbol', source: 'places', minzoom: 12.5, maxzoom: 15, filter: ['all',['!',['has','point_count']],['>=', ['coalesce',['get','i'],0], 96]],
    layout: { 'text-field': ['get', 'n'], 'text-size': 11, 'text-offset': [0, 1], 'text-anchor': 'top', 'text-optional': true,
      'text-font': ['Noto Sans Regular'], 'symbol-sort-key': ['-', 100, ['coalesce', ['get', 'i'], 0]] },
    paint: { 'text-color': '#34454c', 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 } });
  map.addLayer({ id: 'pin-names', type: 'symbol', source: 'places', minzoom: 16, filter:['!',['has','point_count']],
    layout: { 'text-field': ['get', 'n'], 'text-size': 11, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-optional': true,
      'text-font': ['Noto Sans Regular'], 'symbol-sort-key': ['-', 100, ['coalesce', ['get', 'i'], 0]] },
    paint: { 'text-color': '#34454c', 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 } });
  map.addLayer({ id: 'sel', type: 'circle', source: 'sel', paint: {
    'circle-radius': 20, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#34454c', 'circle-stroke-width': 2.5 } });

  Atlas.install(map);
  window.WorkFinder?.onViewsReady();
  for (const l of PIN_LAYERS) {
    map.on('click', l, e => { if(l!=='place-icons'&&map.queryRenderedFeatures(e.point,{layers:['place-icons']}).length)return; if(map.getLayer('route-stop')&&map.queryRenderedFeatures(e.point,{layers:['route-stop']}).length)return; select(state.byId.get(e.features[0].properties.id),false); });
    map.on('mouseenter', l, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', l, () => { map.getCanvas().style.cursor = ''; });
  }
  if (map.getLayer('hood-label')) map.moveLayer('hood-label'); // neighbourhood names stay readable above the pins
  for(const layer of ['route-line','route-stop','route-num'])if(map.getLayer(layer))map.moveLayer(layer); // route order stays readable above catalogue pins
  window.flushRoute?.();
  if(state.selected)map.getSource('sel').setData(Atlas.selection(state.selected));
  map.on('moveend', renderList);
  document.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');

  if (isClubStartup()) {
    await setClubMode(true);
    openFromUrl();
    return;
  }
  await ensureWork();
  refresh();
  const raw = new URL(location.href).searchParams.get('p');
  if (raw && !state.byId.has(canonId(raw))) await ensureFood();
  openFromUrl();
});

// ---------- list: in view, sorted by what people actually search by ----------
const SORTS = {
  great: (a, b) => b.idx - a.idx,
  leveler: (a, b) => {
    // The Leveler (Oldenburg): non-chain character, unpretentious low-profile setting
    const aChain = a.flags & F.CHAIN ? 1 : 0;
    const bChain = b.flags & F.CHAIN ? 1 : 0;
    const aScore = (bChain - aChain) * 45 + (a.d[2] - b.d[2]) * 10 + (a.d[1] >= 3 ? 5 : 0) - (b.d[1] >= 3 ? 5 : 0);
    return -aScore || b.idx - a.idx;
  },
  vitality: (a, b) => {
    // Conversation is the Main Activity: street vitality, dense 250m third place cluster, outdoor seating
    const aOut = a.flags & F.OUTDOOR ? 15 : 0;
    const bOut = b.flags & F.OUTDOOR ? 15 : 0;
    const aScore = a.d[1] * 14 + aOut + a.d[0] * 4 + a.idx * 0.4;
    const bScore = b.d[1] * 14 + bOut + b.d[0] * 4 + b.idx * 0.4;
    return bScore - aScore || b.idx - a.idx;
  },
  regulars: (a, b) => {
    // Home Away from Home: regulars' haven, user visits, personal notes, non-chain warmth
    const aVis = state.visited.has(a.id) ? 60 : 0;
    const bVis = state.visited.has(b.id) ? 60 : 0;
    const aScore = aVis + a.d[2] * 12 + a.idx * 0.6;
    const bScore = bVis + b.d[2] * 12 + b.idx * 0.6;
    return bScore - aScore || b.idx - a.idx;
  },
  access: (a, b) => {
    // Open and Easy: walk to rail, generous opening hours, parking
    const aH = a.flags & F.HOURS ? 20 : 0;
    const bH = b.flags & F.HOURS ? 20 : 0;
    const aScore = a.d[0] * 15 + aH + (a.flags & F.PARK ? 10 : 0) + a.idx * 0.5;
    const bScore = b.d[0] * 15 + bH + (b.flags & F.PARK ? 10 : 0) + b.idx * 0.5;
    return bScore - aScore || b.idx - a.idx;
  },
  sanctuary: (a, b) => workScore(b) - workScore(a) || b.idx - a.idx,
  popular: (a, b) => b.d[3] - a.d[3] || b.d[1] - a.d[1] || b.idx - a.idx,
  notable: (a, b) => b.d[5] - a.d[5] || b.d[3] - a.d[3] || b.idx - a.idx,
  work: (a, b) => workScore(b) - workScore(a) || b.idx - a.idx,
  hubs: (a, b) => (b.hub || 0) - (a.hub || 0) || b.idx - a.idx,
};

const listGroups = [
  ['cafe', 'Cafés'], ['coworking', 'Co-working'], ['library', 'Libraries'], ['restaurant', 'Food'], ['cannabis', 'Cannabis listings'],
];
const listPreview = 3;
// One click may not render the whole catalogue. At city zoom the map holds
// 20,640 places and the disclosure drew them all: 20,640 rows, 151,000 DOM
// nodes, a million pixels of scroll. The cap is the honest boundary between
// "a list a reader can browse" and "a list that is the map again, in rows" —
// and the disclosure says which one it is offering. A neighbourhood view
// (20–130 places) is under the cap and shows everything.
const MAX_LIST_ROWS = 200;
// CL;UB's rail holds one group where PL;UB holds four. A three-row preview of
// that one group leaves half the rail dead white space, so the cannabis
// directory previews a page of its own: the rail's first screen should carry
// the directory, not three rows and a void.
// CL;UB's rail lists cannabis venues, and its column is the one thing standing
// between the reader and the map. Twenty rows filled the whole column at 1024
// and took a third of the screen with them, leaving the map 60.4% — a margin
// of four tenths of a point over the house floor. Eight rows, with the rest one
// tap away behind one "Show all 123", keeps the map the largest object on the
// screen in both modes and makes the panel a floating paper card again.
const clubPreview = 8;
const groupLimits = new Map();
const previewFor = (kind) => (state.clubMode && kind === 'cannabis') ? clubPreview : listPreview;

// The rail's two honest states before the catalogue arrives: still loading, and
// failed. The skeleton is a promise of rows to come — four grey bars where the
// rows will land, so the panel is never an empty white slab. Painted at boot,
// before any request settles, because "still loading" is a fact the reader is
// owed while the request is on the wire, not only after it has failed.
function paintLoadingRail(failed) {
  const list = $('#list');
  if (!list) return;
  list.innerHTML = failed
    ? '<li class="meta">Directory unavailable. <button type="button" class="retry" data-retry-catalogue>Retry</button></li>'
    : '<li class="meta">Loading the directory…</li><li class="list-skeleton" aria-hidden="true"><span></span><span></span><span></span><span></span></li>';
}

function renderList() {
  const wrap = $('#list-wrap');
  if (isPhone() && !wrap.classList.contains('open')) return;
  const c = map.getCenter(), centre = { y: c.lat, x: c.lng };
  // What the reader can SEE, not what the camera contains. The raw canvas
  // bounds are the cheap first cut; the DOM decides the rest, because the
  // paper panel, the Key legend and the map's own controls stand over parts
  // of the canvas and the count must not claim a place the reader cannot see.
  const canvasBounds = rawGetBounds();
  const overlay = readerOverlay();
  let inView = lastList.filter(p => canvasBounds.contains([p.x, p.y]) && visibleOnMap(p, overlay));
  inView = state.sort === 'near'
    ? inView.map(p => [metres(p, centre), p]).sort((a, z) => a[0] - z[0]).map(a => a[1])
    : inView.sort(SORTS[state.sort]);
  $('#list-order').value=state.sort;
  $('#list-origin').hidden = state.sort !== 'near';
  const loadingFood = !state.clubMode && state.kinds.has('restaurant') && !state.foodLoaded;
  const foodUnavailable = loadingFood && foodStatus === 'failed';
  const count = $('#count');
  const list = $('#list');
  // Three states, never confused with one another: still loading, failed, and
  // genuinely nothing in view. The old rail told the reader "0 places — no
  // matches in view" while the catalogue was on the wire, and told it for good
  // when the fetch failed, with nothing to retry. On CL;UB the directory in
  // question is the cannabis one.
  const status = state.clubMode ? state.cannabisStatus : state.catalogueStatus;
  if (status !== 'ready') {
    const failed = status === 'failed';
    count.textContent = failed ? 'unavailable' : 'Loading…';
    count.title = failed ? 'The directory could not be loaded.' : 'The directory is still loading.';
    paintLoadingRail(failed);
    return;
  }
  count.textContent = `${fmt(inView.length)} ${inView.length === 1 ? 'place' : 'places'}${foodUnavailable ? ' · food unavailable' : loadingFood ? ' · food loading' : ''}`;
  count.title = `${fmt(inView.length)} places the reader can see on the map right now. Distances are straight lines from the map centre.`;
  const focusedPlace = document.activeElement.closest('.list-place')?.closest('li')?.dataset.id;
  const focusedGroup = document.activeElement.dataset.listMore;
  const groups = new Map(listGroups.map(([kind]) => [kind, []]));
  for (const place of inView) groups.get(place.k)?.push(place);
  // ONE disclosure for the whole rail, not a ladder of pages per group. The
  // ladder cost ten clicks to reach every listing in CL;UB's view (8 rows,
  // then "Show 12 more", six times, then a 6245px scroll inside a 713px
  // window) — a smaller list, not a cheaper one. "Show all 123" is one click
  // to everything, and the same click in both modes.
  //
  // But one click may not render the whole catalogue: at city zoom the map
  // holds 20,640 places, and drawing them as rows took 7.6 seconds and a
  // million pixels of scroll. The disclosure is bounded and says so: it names
  // the cap when the cap is smaller than the truth.
  const expanded = groupLimits.get('all') === Infinity;
  let budget = expanded ? MAX_LIST_ROWS : Infinity;
  let shown = 0;
  const body = inView.length ? listGroups.map(([kind, label]) => {
    const places = groups.get(kind);
    if (!places.length) return '';
    const limit = expanded
      ? Math.min(places.length, budget)
      : Math.min(groupLimits.get(kind) ?? previewFor(kind), places.length);
    budget -= limit;
    shown += limit;
    const rows = places.slice(0, limit).map(p => row(p, sortKey(p, centre), true)).join('');
    return `<li class="list-group" data-list-group="${kind}"><h3 id="list-heading-${kind}">${label} <span>${fmt(places.length)}</span></h3>
      <ol aria-labelledby="list-heading-${kind}">${rows}</ol></li>`;
  }).join('') : `<li class="meta">${loadingFood && !foodUnavailable ? 'Loading food places…' : foodUnavailable ? 'No other matches in view.' : 'No matches in view. Pan, zoom out or clear a filter.'}</li>`;
  const capped = inView.length > MAX_LIST_ROWS;
  const reveal = inView.length && (expanded || shown < inView.length)
    ? expanded
      ? `<li class="list-reveal"><button type="button" class="list-more" data-list-more="all" data-list-more-state="fewer" aria-label="Show fewer places">Show fewer</button></li>`
      : `<li class="list-reveal"><button type="button" class="list-more" data-list-more="all" data-list-more-state="all" aria-label="${capped ? `Show the first ${MAX_LIST_ROWS} of ${fmt(inView.length)} places` : `Show all ${fmt(inView.length)} places`}">${capped ? `Show ${MAX_LIST_ROWS} of ${fmt(inView.length)} places` : `Show all ${fmt(inView.length)} places`}</button></li>`
    : '';
  const foodRetry = foodUnavailable ? '<li class="meta">Food catalogue unavailable. <button type="button" data-retry-food>Retry</button></li>' : '';
  const clubSearch = state.clubMode && expanded && inView.length > 20
    ? '<li class="list-reveal"><button type="button" class="list-more" data-search-directory>Find a listing by name</button></li>' : '';
  list.innerHTML = foodRetry + clubSearch + body + reveal;
  if (focusedPlace) list.querySelector(`[data-id="${CSS.escape(focusedPlace)}"] button`)?.focus({ preventScroll: true });
  if (focusedGroup) list.querySelector(`[data-list-more="${CSS.escape(focusedGroup)}"]`)?.focus({ preventScroll: true });

}

function sortKey(p, centre) {
  return {
    great: p.k === 'cannabis' ? `${p.idx}/4 details` : `${p.idx} index`,
    near: distLabel(metres(p, centre)),
    leveler: p.flags & F.CHAIN ? 'chain' : `◇${p.d[2]}/9 indie`,
    vitality: `⁘${p.d[1]}/9 scene`,
    regulars: state.visited.has(p.id) ? '✓ regular' : `♡ home`,
    access: `↦${p.d[0]}/9 walk`,
    sanctuary: `≋${Math.round(workScore(p))} work`,
    popular: `${p.d[3]}/9 footprint`,
    notable: p.d[5] ? 'record' : '—',
    work: `${Math.round(workScore(p))} work`,
    hubs: p.hub ? `${p.hub} nearby` : '0 nearby',
  }[state.sort] || `${p.idx} index`;
}

function row(p, key = p.k === 'cannabis' ? (CLUB_TYPES[p.sub] || KIND_LABEL.cannabis) : `${p.idx} index`, list = false) {
  const s = state.scores[p.id];
  const ws = workScore(p);
  const tail = [
    state.visited.has(p.id) ? '<b title="You have been here">✓</b>' : '',
    p.flags & F.NOTABLE ? '<span title="Notable">✦</span>' : '',
    p.flags & F.WIFI ? '<span title="Wi-Fi listed">≋</span>' : '',
    p.flags & F.LATE ? '<span title="Open late or 24 hours">☾</span>' : '',
    s ? `<span title="Visitor ratings">★${s.n}</span>` : '',
    state.flags.has('work') ? `<span title="Work score" class="ws">${Math.round(ws)}</span>` : '',
  ].join(' ');
  const kindLabel = CLUB_TYPES[p.sub] || KIND_LABEL[p.k];
  const subParts = [kindLabel];
  if (p.k === 'cannabis') {
    if (p.tier) subParts.push(`Tier ${p.tier}`);
    if (p.prov) subParts.push(p.prov);
  } else {
    if (p.flags & F.WIFI) subParts.push('Wi-Fi');
    if (p.hours) subParts.push('Hours');
    if (p.flags & F.LATE) subParts.push('Late night');
    if (s) subParts.push(`★${s.n}`);
  }
  const label=esc(p.n+(p.branch?', '+p.branch:'')+' · '+kindLabel);
  const name=`${nm(p.n)}${p.branch?' '+branchTag(p):''}`;
  if(list)return `<li data-id="${esc(p.id)}"><button type="button" class="list-place" aria-label="${label}, ${esc(key)}">${PlaceTools.icon(p)}<span class="nm"><span class="row-title">${name}</span><span class="row-sub">${esc(subParts.join(' · '))}</span></span><span class="idx" title="${state.sort==='near'?'Straight line from the map centre':'Computed catalogue signal, not a visitor star rating'}">${esc(key)}</span></button></li>`;
  return `<li data-id="${esc(p.id)}" role="option" aria-label="${label}">${PlaceTools.icon(p)}<span class="nm">${name}</span><span class="meta">${tail}</span><span class="idx">${esc(key)}</span></li>`;
}

$('#list').addEventListener('click', e => {
  const more = e.target.closest('[data-list-more]');
  if (more) {
    const showFewer = more.dataset.listMoreState === 'fewer';
    if (showFewer) {
      groupLimits.clear();
    } else {
      // One click opens every group in full.
      groupLimits.set('all', Infinity);
      for (const [kind] of listGroups) groupLimits.set(kind, Infinity);
    }
    renderList();
    if (!showFewer) {
      // The first newly revealed row is where the reader's eye already is.
      const target = [...$('#list').querySelectorAll('.list-group')]
        .find(g => g.querySelectorAll('.list-place').length > previewFor(g.dataset.listGroup));
      if (target) target.querySelectorAll('.list-place')[previewFor(target.dataset.listGroup)]?.focus({ preventScroll: true });
    }
    return;
  }
  const li = e.target.closest('li[data-id]');
  if (li) select(state.byId.get(li.dataset.id), true);
});
$('#list-order').addEventListener('change',e=>{state.sort=e.target.value;state.sortChosen=true;renderList()});
$('#list-toggle').addEventListener('click', () => setListOpen(!$('#list-wrap').classList.contains('open')));
$('.list-close').addEventListener('click', () => setListOpen(false));
function setListOpen(on) {
  $('#list-wrap').classList.toggle('open', on);
  $('#list-toggle').setAttribute('aria-pressed', on);
  if (on) { $('#sheet').hidden = true; renderList(); if (!state.clubMode) loadBranches(); }
}
// The phone drawer is the only surface on the phone that stands on the map, so
// Escape must close it and hand the reader back to the button that opened it.
// (The fourth audit's finding 6: the drawer had a 44px close button and no
// keyboard way out.) Escape inside the search field clears the search instead —
// Chrome does that natively, and the reader is still typing, not navigating.
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const wrap = $('#list-wrap');
  if (!wrap.classList.contains('open')) return;
  if (document.activeElement === $('#q')) return;
  setListOpen(false);
  $('#list-toggle').focus({ preventScroll: true });
});

// ---------- search ----------
const searchOptions = 'li[data-id], li[data-hood], li[data-mood], li[data-act]';
const searchKey = item => ['id', 'hood', 'mood', 'act']
  .map(field => item?.dataset[field] || '').join('|');
let searchRevision = 0;

function renderSearch({ preserveSelection = false } = {}) {
  const q = PlaceTools.normalize(PlaceTools.query($('#q').value));
  const hits = $('#hits');
  const previous = preserveSelection ? hits.querySelector('[aria-selected="true"]') : null;
  if (q.length < 2) { hits.innerHTML = moodHits(); hits.hidden = false; return; }
  const starts = [], has = [];
  for (const p of state.places) {
    if ((p.k === 'cannabis') !== state.clubMode) continue;
    if (PlaceTools.normalize(p.n).startsWith(q)) starts.push(p); else if (PlaceTools.matches(p, q) || (p.th && PlaceTools.normalize(p.th).includes(q))) has.push(p);
    if (starts.length >= 40) break;
  }
  // best first, nearest on ties: what people mean by "the good one near here"
  const c = map.getCenter(), centre = { y: c.lat, x: c.lng };
  const rank = (a, z) => (z.idx - a.idx) * 40 + (metres(a, centre) - metres(z, centre)) / 100;
  const top = [...starts.sort(rank), ...has.sort(rank)].slice(0, 8);
  const pinned = previous?.dataset.id && state.byId.get(previous.dataset.id);
  // A late result may outrank the highlighted venue. Keep that venue reachable
  // until the reader types again or chooses a different row.
  if (pinned && (pinned.k === 'cannabis') === state.clubMode && !top.some(p => p.id === pinned.id)) {
    top.splice(7, 1, pinned);
  }
  const pendingFood = !state.clubMode && !state.foodLoaded;
  const pendingDirectory = state.clubMode && !state.cannabisLoaded;
  const c2 = map.getCenter();
  const missing = `<li class="meta missing"><a href="${osmNote(c2.lat, c2.lng)}" target="_blank" rel="noopener">Missing a place? Tell OpenStreetMap ↗</a></li>`;
  hits.innerHTML = (state.clubMode ? '' : window.hoodHits?.(q) || '') + (top.length ? top.map(p => row(p)).join('') : pendingFood || pendingDirectory ? '' : '<li class="meta">No place by that name. Try Thai or English.</li>') + missing;
  if (!state.clubMode && !state.foodLoaded) {
    hits.insertAdjacentHTML('beforeend', foodStatus === 'failed'
      ? '<li class="meta">Food catalogue unavailable. <button type="button" data-retry-food>Retry</button></li>'
      : '<li class="meta" role="status">Checking food listings…</li>');
  }
  if (pendingDirectory) {
    hits.insertAdjacentHTML('beforeend', state.cannabisStatus === 'failed'
      ? '<li class="meta">Directory unavailable. <button type="button" data-retry-club>Retry</button></li>'
      : '<li class="meta" role="status">Loading Thailand listings…</li>');
  }
  if (previous) [...hits.querySelectorAll(searchOptions)]
    .find(item => searchKey(item) === searchKey(previous))?.setAttribute('aria-selected', 'true');
  hits.hidden = false;
}
$('#q').addEventListener('input', () => {
  const revision = ++searchRevision;
  renderSearch();
  const query = $('#q').value, club = state.clubMode;
  if (PlaceTools.query(query).trim().length < 2) return;
  const update = () => {
    if (revision === searchRevision && state.clubMode === club && !$('#hits').hidden) {
      renderSearch({ preserveSelection: true });
    }
  };
  if (club) {
    if (!state.cannabisLoaded) loadCannabis().then(update);
  } else {
    ensureFood().then(update);
    loadBranches().then(update);
  }
});
$('#q').addEventListener('keydown', e => {
  const hits = $('#hits');
  if (hits.hidden) return;
  const items = [...hits.querySelectorAll(searchOptions)];
  const index = items.findIndex(item => item.getAttribute('aria-selected') === 'true');
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && items.length) {
    e.preventDefault();
    const next = Math.max(0, Math.min(items.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1)));
    items.forEach((li, i) => li.setAttribute('aria-selected', i === next));
    items[next].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && items.length) {
    e.preventDefault();
    items[Math.max(0, index)].click();
  } else if (e.key === 'Escape') {
    // Chrome natively CLEARS a search field on Escape, and that fires `input`, which
    // re-opens this panel over the filter chips. Dismiss the panel and keep the query.
    e.preventDefault();
    $('#hits').hidden = true;
  }
});
$('#hits').addEventListener('click', e => {
  const li = e.target.closest('li[data-id]');
  if (li) select(state.byId.get(li.dataset.id), true);
});
document.addEventListener('click', e => { if (!e.target.closest('.bar')) $('#hits').hidden = true; });

// ---------- filters ----------
document.addEventListener('click', e => {
  const b = e.target.closest('.chips button[data-kind], .flags button[data-flag]');
  if (!b || (state.clubMode && b.dataset.kind)) return;
  const on = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', on);
  const set = b.dataset.kind ? state.kinds : state.flags;
  const key = b.dataset.kind || b.dataset.flag;
  on ? set.add(key) : set.delete(key);
  if (on && key === 'restaurant') ensureFood({ retry: true });
  refresh();
  if(b.dataset.kind)window.WorkFinder?.kindsChanged();
});

// ---------- sheets ----------
let sheetGeneration=0;
function openSheet(html, { place = false, keepRoute = false, preserveFocus = false } = {}) {
  sheetGeneration++;
  window.MangaLens?.settle();
  window.StreetWorld?.suspend();
  if (!place) { if (!keepRoute) { window.WorkFinder?.clearMap(); window.clearRoute?.(); } state.selected = null; map.getSource('sel')?.setData({ type:'FeatureCollection', features:[] }); }
  openFromUrl.framed=true;
  setListOpen(false);
  $('#hits').hidden = true;
  const sheet = $('#sheet');
  sheet.removeAttribute('lang');
  sheet.classList.remove('notebook-sheet','hood-sheet','hop-sheet','discovery-sheet','atlas-sheet','journey-sheet','featured-sheet','recommend-sheet','community-sheet','shared-hops-sheet','reference-gallery');
  sheet.classList.toggle('place-sheet', place);
  if (!place) delete sheet.dataset.place;
  sheet.hidden = false;
  sheet.innerHTML = html;
  const heading = sheet.querySelector('h1');
  if (heading) { heading.tabIndex = -1; if (!preserveFocus) heading.focus({ preventScroll: true }); }
  sheet.scrollTop = 0;
  sheet.querySelector('.close')?.addEventListener('click', closeSheet);
  return sheet;
}

function closeSheet() {
  sheetGeneration++;
  window.WorkFinder?.clearMap();
  state.selected = null;
  window.clearRoute?.();
  $('#sheet').hidden = true;
  if (document.activeElement && $('#sheet').contains(document.activeElement)) $('#passport').focus();
  map.getSource('sel')?.setData({ type: 'FeatureCollection', features: [] });
  const u = new URL(location.href); u.searchParams.delete('p'); u.searchParams.delete('hood'); history.replaceState(null, '', u);
  renderList();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('.photo-viewer[open]') && !$('#sheet').hidden && document.activeElement !== $('#q')) closeSheet(); });

// petal glyph: six petals, one per metric, length = decile; the four index metrics in ink
function petals(p, size = 76) {
  const cx = 50, cy = 50;
  const leaves = GGP.map(([, sym], i) => {
    const a = (i * 60 - 90) * Math.PI / 180, len = 8 + p.d[i] * 3.9, w = 7;
    const tx = cx + Math.cos(a) * len, ty = cy + Math.sin(a) * len;
    const nx = Math.cos(a + Math.PI / 2) * w, ny = Math.sin(a + Math.PI / 2) * w;
    const mx = cx + Math.cos(a) * len * 0.55, my = cy + Math.sin(a) * len * 0.55;
    return `<path d="M${cx} ${cy} Q${mx + nx} ${my + ny} ${tx} ${ty} Q${mx - nx} ${my - ny} ${cx} ${cy}Z" fill="${i < 4 ? '#34454c' : '#b6bfc1'}"/>` +
''; // labels live in the table beside it
  }).join('');
  return `<svg class="petals" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Great Good Place profile">
    <circle cx="50" cy="50" r="43" fill="none" stroke="#b6bfc1" stroke-dasharray="2 3"/>${leaves}
    <circle cx="50" cy="50" r="3" fill="#34454c"/></svg>`;
}

const dots = (v, max = 9) => `<span class="bars" aria-label="${v} of ${max}"><b>${'●'.repeat(Math.round(v * 5 / max))}</b><s>${'●'.repeat(5 - Math.round(v * 5 / max))}</s></span>`;

async function select(p, fly) {
  if (!p || (p.k === 'cannabis') !== state.clubMode) return;
  state.selected = p;
  $('#hits').hidden = true;
  map.getSource('sel')?.setData(Atlas.selection(p));
  const u = new URL(location.href); u.searchParams.set('p', p.id); u.searchParams.delete('hood'); history.replaceState(null, '', u);
  renderSheet(p, {}, []);
  const padding = { top: 40, bottom: isPhone() ? $('#sheet').offsetHeight + 24 : 40, left: 40, right: 40 };
  const view = { center: [p.x, p.y], zoom: fly ? Math.max(map.getZoom(), 16.5) : map.getZoom(), padding };
  fly === 'jump' ? map.jumpTo(view) : map.flyTo({ ...view, speed: 1.6 }); // shared links land, no flight
  const generation=sheetGeneration;
  let report;
  const reportReady = loadVenueReports().then(data => { report = data.reports?.[p.id]; });
  const [d, visits] = await Promise.all([cellDetail(p), Passport.forPlace(p.id,canonId).catch(() => [])]);
  if (generation !== sheetGeneration) return;
  renderSheet(p, d, visits, report);
  if (report) return;
  const detailGeneration = sheetGeneration;
  await reportReady;
  if (report && detailGeneration === sheetGeneration) renderSheet(p, d, visits, report);
}

function rawValue(key, p, d) {
  if (!d.loaded && ['A', 'S', 'F'].includes(key)) return '…';
  const m = d.m || {};
  return {
    A: m.walk != null ? `${fmt(m.walk)} m to mapped rail point (straight line)` : 'walk to rail',
    S: m.scene != null ? `${m.scene} third places within 250 m` : 'nearby third places',
    C: p.flags & F.CHAIN ? 'chain or brand' : 'independent',
    F: m.sources != null ? `listed by ${m.sources} sources` : 'datasets and channels',
    W: [p.k === 'coworking' || p.k === 'library' ? KIND_LABEL[p.k] : '', p.flags & F.WIFI ? 'Wi-Fi listed' : 'Wi-Fi not tagged', p.hours ? 'hours known' : ''].filter(Boolean).join(' · '),
    N: p.flags & F.NOTABLE ? 'has a Wikidata or heritage record' : 'no record',
  }[key];
}

function scoreHtml(p){
  const s=state.scores[p.id];
  return `      <h2 class="micro">${s ? `Visitor work score · ${s.n} ${s.n === 1 ? 'rating' : 'ratings'} · last ${esc(s.last)}` : state.scoresStatus==='unavailable' ? 'Visitor work score · unavailable right now' : state.scoresStatus==='loading' ? 'Visitor work score · loading' : 'Visitor work score · not rated yet · add yours with ✓'}</h2>
      ${s ? `<table>${SCORES.map(([k, label]) => `<tr><td>${label}</td><td>${dots(s[k], 3)}</td><td>${s[k].toFixed(1)} / 3</td></tr>`).join('')}</table>` : ''}
`;
}

function visitReportHtml(report) {
  if (!report) return '';
  const wifi = report.facts?.wifi?.measure;
  const speed = wifi && [wifi.downMbps, wifi.upMbps, wifi.pingMs].every(Number.isFinite)
    ? `<p><b>Wi-Fi</b> ${wifi.downMbps} Mbps down · ${wifi.upMbps} Mbps up · ${wifi.pingMs} ms ping</p>` : '';
  const page = /^\/[a-z0-9-]+$/.test(report.page) ? report.page : null;
  return `<section class="place-visit-report" aria-label="On-site visit report">
    <h2>On-site visit <span>· ${esc(report.date)}</span></h2>
    ${speed}
    ${report.facts?.power?.band ? `<p>${esc(report.facts.power.detail)}</p>` : ''}
    ${page ? `<a href="${esc(page)}">Read visit notes &amp; see photo →</a>` : ''}
  </section>`;
}

function renderSheet(p, d, visits, report) {
  if (state.selected !== p) return;
  // Late catalogue details must not replace a visit form someone is already writing.
  if (!$('#sheet').hidden && $('#sheet .been-form')?.dataset.place === p.id) return;
  const hours = report?.place?.hours || venueHours(p);
  const open = window.isOpen(hours, new Date());
  const hood = window.hoodOf?.(p);
  const addr = report?.place?.address || d.addr;
  const tel = report?.place?.tel || d.tel;
  const email = report?.place?.email;
  const addressSource = safeLink(report?.place?.addressSource);
  const facts = [
    hours && ['◷', 'hours', `${open === true ? '<b>Open now</b> · ' : open === false ? '<b>Closed now</b> · ' : ''}${esc(hours.replace(/^Mo-Su (?=\d\d:\d\d-\d\d:\d\d$)/, 'Daily '))}`],
    p.flags & F.LATE && ['☾', 'late-night', 'Open late · 24-hour work spot'],
    addr && ['⌖', 'address', esc(addr)],
  ].filter(Boolean);
  const amenityList = [
    d.deliv && 'Delivery',
    d.take && 'Takeaway',
    d.ac && 'A/C',
    d.wheel && 'Wheelchair accessible',
    d.smoke && `Smoking: ${d.smoke}`,
    ...(Array.isArray(d.pay) ? d.pay : []),
  ].filter(Boolean);
  const igUrl = d.ig ? safeLink(d.ig.startsWith('http') ? d.ig : `https://instagram.com/${d.ig.replace(/^@/, '')}`) : null;
  const fbUrl = d.fb ? safeLink(d.fb.startsWith('http') ? d.fb : `https://facebook.com/${d.fb}`) : null;
  const moreFacts = [
    tel && ['☎', 'phone', `<a href="tel:${esc(tel.replace(/\(0\)/g, '').replace(/[^+\d]/g, ''))}">${esc(tel)}</a>`],
    (safeLink(d.web) || safeLink(d.social) || igUrl || fbUrl || d.line || addressSource || email) && ['↗', 'links', `<span class="place-contact">
      ${safeLink(d.web) ? `<a href="${esc(safeLink(d.web))}" target="_blank" rel="noopener nofollow">Website</a>` : ''}
      ${safeLink(d.social) ? `<a href="${esc(safeLink(d.social))}" target="_blank" rel="noopener nofollow">Social</a>` : ''}
      ${igUrl ? `<a href="${esc(igUrl)}" target="_blank" rel="noopener nofollow">Instagram</a>` : ''}
      ${fbUrl ? `<a href="${esc(fbUrl)}" target="_blank" rel="noopener nofollow">Facebook</a>` : ''}
      ${d.line ? `<span>LINE: ${esc(d.line)}</span>` : ''}
      ${addressSource ? `<a href="${esc(addressSource)}" target="_blank" rel="noopener nofollow">Venue on LINE</a>` : ''}
      ${email && /^[\w.+-]+@[\w.-]+\.[a-z]+$/i.test(email) ? `<a href="mailto:${esc(email)}">Email</a>` : ''}</span>`],
    p.flags & F.OUTDOOR && ['☀', 'outdoor', 'Outdoor seating'],
    amenityList.length && ['◈', 'amenities', esc(amenityList.join(' · '))],
    p.k === 'cannabis' && d.prov && ['⌖', 'region', esc(`${d.prov}${d.tier ? ` · Tier ${d.tier}` : ''}`)],
    d.c && ['·', 'cuisine', esc(d.c.replace(/[_;]/g, ' '))],
  ].filter(Boolean);
  const factList = (rows, label) => rows.length ? `<ul class="facts" aria-label="${label}">${rows.map(([sym, key, content]) => `<li data-fact="${key}"><span class="sym" aria-hidden="true">${sym}</span><span class="fact-value">${content}</span></li>`).join('')}</ul>` : '';
  const src = p.flags & F.HAND && !(p.flags & F.OVERTURE)
    ? `Hand pin · ${esc(d.pinned || 'a visit')} · not on OpenStreetMap yet · <a href="${osmNote(p.y, p.x)}" target="_blank" rel="noopener">add it</a>`
    : p.flags & F.OVERTURE
    ? `Overture Maps${d.ds?.length ? ' via ' + esc(d.ds.join(', ')) : ''}${d.conf ? ` · confidence ${d.conf}` : ''}`
    : `OpenStreetMap${d.ds?.length ? ' + ' + esc(d.ds.join(', ')) : ''} · <a href="https://www.openstreetmap.org/${{ n: 'node', w: 'way', r: 'relation' }[p.id[0]]}/${p.id.slice(1)}" target="_blank" rel="noopener">fix on OSM</a>`;

  const currentSheet = $('#sheet');
  const updating = !currentSheet.hidden && currentSheet.dataset.place === p.id;
  const focusables = 'a[href], button';
  const active = document.activeElement;
  const wasInside = updating && currentSheet.contains(active);
  const sameControl = wasInside && active.matches(focusables)
    ? [...active.attributes].find(attr => attr.name === 'href' || attr.name.startsWith('data-')) : null;
  const scroll = updating ? currentSheet.scrollTop : 0;
  const sheet = openSheet(`
    <header>
      <h1>${nm(report?.venue || p.n)}${p.branch ? `<span class="th">${esc(p.branch)}</span>` : ''}${d.th ? `<span class="th" lang="th">${esc(d.th)}</span>` : ''}</h1>
      <button class="close" aria-label="Close">×</button>
    </header>
    <div class="kindline">${PlaceTools.symbol(p.k)}${esc(CLUB_TYPES[p.sub] || KIND_LABEL[p.k])}${hood ? ` · <button class="linkish" data-hood="${hood.slug}">${esc(hood.name)}</button>` : ''}${visits.length ? ` · <b>✓ been ${visits.length}×</b>` : ''}</div>
    ${factList(facts, 'Hours and address')}
    <section class="been place-actions"><a href="${esc(window.WorkFinder?.directions(p)||`https://www.google.com/maps/dir/?api=1&destination=${p.y},${p.x}`)}" target="_blank" rel="noopener">Directions ↗</a><button type="button" class="send been-open" data-place-visit>✓ I've been here</button></section>
    ${p.k === 'cannabis' ? `<details><summary>Source details · ${p.idx} of 4 fields</summary><p>Counts listed hours, website or social link, phone and address. ${p.hub ?? 0} other mapped listings within 1 km straight line.</p></details>` : `<section class="ggp">
      ${petals(p)}
      <div class="ggp-num"><span class="big">${p.idx}</span><span class="micro">Great Good Place index · top ${topShare(p)}% of Bangkok · <a href="/research">Research &amp; scoring →</a></span></div>
      <table class="ggp-table">${GGP.map(([k, sym, label]) => `<tr><td class="sym">${sym}</td><td>${label}</td><td class="raw">${esc(rawValue(k, p, d))}</td></tr>`).join('')}</table>
    </section>`}
    ${visitReportHtml(report)}
    ${factList(moreFacts, 'Contact and amenities')}
    ${p.k === 'cannabis' ? `<p class="src">Open-data listing. Licence and current availability are unverified. <a href="https://med-cannabis.dtam.moph.go.th/law/2418/" target="_blank" rel="noopener">Thai cannabis rules ↗</a></p>` : ''}
    ${d.about || d.visit ? `<div class="place-description">${d.about ? `<p>${esc(d.about)}</p>` : ''}${d.visit ? `<p class="hand">${esc(d.visit)}</p>` : ''}</div>` : ''}
    <nav class="place-social" aria-label="Place contributions"><button type="button" data-place-community>Notes &amp; photos</button><button type="button" data-place-recommend>Add recommendation</button><button type="button" class="share">Share place</button><button type="button" data-place-street>${window.StreetWorld?.active?'Back to street sketch':'Street sketch'}</button></nav>
    ${p.k === 'cannabis' ? '' : window.WorkAtmosphere?.render(p, d, { [p.id]: state.scores[p.id] }, null, report) || ''}
    ${p.k === 'cannabis' ? '' : window.WorkFinder?.placePanel(p)||''}
    <div class="place-reference-slot"></div>
    ${Atlas.facts(p)}
    ${window.TalkMedia?.section(p.id)||''}
    ${visits.length ? `<section><ul class="moments">${visits.slice().reverse().map(window.momentHtml).join('')}</ul></section>` : ''}
    <section class="scores">${scoreHtml(p)}</section>
    <nav class="links">
      ${['cafe', 'restaurant'].includes(p.k) ? `<a href="https://www.wongnai.com/restaurants?q=${encodeURIComponent(p.n)}" target="_blank" rel="noopener nofollow" title="Photos and reviews on Wongnai, opens their site">Photos &amp; reviews ↗ Wongnai</a>` : ''}
    </nav>
    <p class="src">Source: ${src}</p>
    ${d.provenance ? `<details class="src reviewed-source"><summary>Reviewed café classification · original open-data location</summary><p>Overture Maps ${esc(d.provenance.release)} · ${esc(d.provenance.licence)} · source ID ${esc(d.provenance.sourceID)}. The source called this a ${esc(d.provenance.sourceTaxonomy)}; the café identity was checked ${esc(d.provenance.checkedAt)}. Original source coordinates retained. Wi-Fi, outlets and parking remain unconfirmed.</p>${(d.provenance.sources||[]).map(v=>`<p><a href="${esc(safeLink(v.url))}" target="_blank" rel="noopener nofollow">${esc(v.publisher)}</a> · ${esc(v.published_at||v.updated_at||'date unstated')}</p>`).join('')}</details>` : ''}
    ${d.enrichment ? `<details class="src enrichment-source"><summary>Added ${Object.keys(d.enrichment).map(k=>k==='addr'?'address':'phone').join(' &amp; ')} · AllThePlaces · snapshot ${esc(Object.values(d.enrichment)[0].asOf)}</summary><p>CC0 Café Amazon export, published at the end of the 24–31 October run; venue details may have changed. <a href="https://alltheplaces-data.openaddresses.io/runs/2026-10-24-13-32-37/output/cafe_amazon.geojson" target="_blank" rel="noopener">Download source</a>. ${Object.values(d.enrichment).map(v=>`Branch ${esc(v.ref)} · ${esc(v.branch)} · record ${esc(v.id)} · matched within ${esc(v.distanceM)} m`).filter((v,i,a)=>a.indexOf(v)===i).join('; ')}</p></details>` : ''}`, { place:true, preserveFocus:updating });

  sheet.dataset.place = p.id;
  if (wasInside) {
    const replacement = sameControl && [...sheet.querySelectorAll(focusables)].find(el => el.getAttribute(sameControl.name) === sameControl.value);
    (replacement || sheet.querySelector(active.matches('.close') ? '.close' : 'h1'))?.focus({ preventScroll: true });
  }
  if (updating) sheet.scrollTop = scroll;
  sheet.querySelector('[data-hood]')?.addEventListener('click', e => window.openHood?.(e.target.dataset.hood));
  sheet.querySelector('.been-open').addEventListener('click', e => window.beenForm?.(p, e.target, () => select(p, false)));
  window.bindMoments?.(sheet);
  window.TalkMedia?.attach(sheet,p);
  window.NeighborhoodPhotos?.attach(sheet.querySelector('.place-reference-slot'),p,hood?.slug);
  window.WorkFinder?.warmPlace(p,sheet.querySelector('.journey-place-facts'));
  sheet.querySelector('[data-place-street]').onclick=()=>window.StreetWorld?.active?StreetWorld.resume():StreetWorld.open(p);
  sheet.querySelector('[data-place-community]').onclick = () => window.Notebook?.showCommunity(p);
  sheet.querySelector('[data-place-recommend]').onclick = () => window.Notebook?.recommend(p);
  // A shared link must say which bureau it points into, or a dispensary link
  // opened on PL;UB resolves to nothing.
  const shareUrl = () => new URL('?p=' + encodeURIComponent(p.id) + (state.clubMode ? '&mode=club' : ''), location.origin).href;
  sheet.querySelector('.share').onclick = () => PlaceTools.share({title:p.n,url:shareUrl()},sheet);
}

function openFromUrl() {
  const u = new URL(location.href), raw = u.searchParams.get('p'), id = raw && canonId(raw);
  const plan = u.searchParams.get('plan');
  if (raw && id !== raw) { u.searchParams.set('p', id); history.replaceState(null, '', u); } // an old shared link lands on the survivor
  if (['nearby', 'drive', 'rail', 'map', 'passport', '3d'].includes(plan) && !openFromUrl.framed && $('#sheet').hidden) {
    openFromUrl.framed = true;
    const point = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(u.searchParams.get('at') || '');
    let origin;
    if (point && map.getMaxBounds().contains([Number(point[2]), Number(point[1])])) {
      const [x, y] = [Number(point[2]), Number(point[1])];
      map.jumpTo({center:[x, y], zoom:16});
      origin = { x, y, kind:'planned', label:(u.searchParams.get('start') || 'Starting point').slice(0, 100) };
    }
    if (plan === 'passport') window.openPassport?.();
    else if (plan === '3d') window.StreetWorld?.openWalkthrough({ id: u.searchParams.get('area') });
    else if (plan !== 'map') window.WorkFinder?.open(plan, { task: u.searchParams.get('task'), duration: Number(u.searchParams.get('minutes')), lang: u.searchParams.get('lang'), origin });
  } else if (id && !state.selected && $('#sheet').hidden && state.byId.has(id)) select(state.byId.get(id), 'jump');
  else if (u.searchParams.get('hood') && $('#sheet').hidden) window.openHood?.(u.searchParams.get('hood'), true);
  else if (u.searchParams.get('hop') && !openFromUrl.framed) { openFromUrl.framed = true; window.openHop?.(u.searchParams.get('hop')); }
  else if (MOODS[u.searchParams.get('mood')] && !state.mood && !openFromUrl.framed) { openFromUrl.framed = true; setMood(u.searchParams.get('mood')); }
  else if (!id && !u.searchParams.get('hood') && !openFromUrl.framed) { openFromUrl.framed = true; } // Keep the close manga neighbourhood; zoom controls retain the city overview.
}

// ---------- moods ----------
function setMood(key) {
  if (state.clubMode) return;
  Atlas.reset();
  state.mood = MOODS[key] ? key : null;
  if (state.mood) {
    state.kinds = new Set(MOODS[key].kinds);
    state.flags.clear(); // a citywide mood count must not be silently cut by an old filter
    document.querySelectorAll('.flags [data-flag]').forEach(b => b.setAttribute('aria-pressed', false));
    document.querySelectorAll('.chips [data-kind]').forEach(b => b.setAttribute('aria-pressed', state.kinds.has(b.dataset.kind)));
    state.sort = 'great';
    $('#list-order').value='great';
  }
  const u = new URL(location.href);
  state.mood ? u.searchParams.set('mood', key) : u.searchParams.delete('mood');
  u.searchParams.delete('p'); u.searchParams.delete('hood'); history.replaceState(null, '', u);
  $('#hits').hidden = true;
  refresh();
  if (!state.mood) return;
  if (state.kinds.has('restaurant')) ensureFood();
  setListOpen(true);
  // frame every match, so a short list (Past midnight) is as visible as a long one
  const xs = lastList.map(p => p.x), ys = lastList.map(p => p.y);
  if (xs.length) map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]],
    { padding: { top: 30, left: 30, right: 30, bottom: isPhone() ? $('#list-wrap').offsetHeight + 20 : 30 }, maxZoom: 15 });
}
window.setMood = setMood;

function renderMood() {
  const el = $('#mood'), m = MOODS[state.mood];
  el.hidden = !m;
  document.querySelectorAll('.moods [data-mood]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mood === state.mood));
  if (!m) return;
  el.innerHTML = `<b>◐ ${esc(m.label)}</b> · ${fmt(lastList.length)} ${lastList.length === 1 ? 'place' : 'places'}
    <button class="linkish" data-hood="${m.hood}">why this mood</button><button class="close mood-off" aria-label="Clear mood">×</button>
    <span class="how">${esc(m.how)}</span>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-mood]');
  if (b) { setMood(b.dataset.mood === state.mood ? null : b.dataset.mood); return; }
  if (e.target.closest('.mood-off')) setMood(null);
  const act = e.target.closest('[data-act]');
  if (act) {
    $('#hits').hidden = true;
    if (act.dataset.act === 'walkthrough') window.StreetWorld?.openWalkthrough(undefined, act);
    else if (act.dataset.act === 'street') window.StreetWorld?.open();
    else if (act.dataset.act === 'media') window.TalkMedia?.open();
    else if (act.dataset.act === 'work') window.WorkFinder?.open();
    else if (act.dataset.act === 'featured') window.openFeatured?.();
    else if (act.dataset.act === 'discovery') window.openDiscovery?.();
    else if (act.dataset.act === 'compare') { location.href = '/day?task=live'; return; }
    else if (act.dataset.act === 'club') {
      if (location.hostname === 'club.nonarkara.org') location.assign('https://co.nonarkara.org/');
      else setClubMode(!state.clubMode);
      return;
    }
    else if (act.dataset.act === 'tiles') {
      window.Atlas.toggleHats().then(() => {
        if (isPhone()) { setListOpen(false); $('#list-toggle').focus({ preventScroll: true }); }
      }).catch(error => { $('#count').textContent = error.message; });
      return;
    }
    else act.dataset.act === 'now' ? window.openNow?.() : window.openHop?.();
  }
  const h = e.target.closest('#mood [data-hood]');
  if (h) window.openHood?.(h.dataset.hood);
  if (e.target.closest('[data-retry-club]')) {
    const fromSearch = !!e.target.closest('#hits');
    if (fromSearch) $('#q').focus({ preventScroll: true });
    retryDirectory().then(() => {
      if (fromSearch && state.clubMode && !$('#hits').hidden) renderSearch({ preserveSelection: true });
    });
    return;
  }
  if (e.target.closest('[data-retry-catalogue]')) { retryDirectory(); return; }
  if (e.target.closest('[data-search-directory]')) {
    if (isPhone()) setListOpen(false);
    $('#q').focus();
    return;
  }
  if (e.target.closest('[data-retry-food]')) {
    const fromSearch = !!e.target.closest('#hits');
    if (fromSearch) $('#q').focus({ preventScroll: true });
    ensureFood({ retry: true }).then(() => {
      if (fromSearch && !state.clubMode && !$('#hits').hidden) renderSearch({ preserveSelection: true });
    });
    return;
  }
  const th = e.target.closest('[data-thailand]');
  if (th) {
    const bounds = clubBounds();
    if (bounds) map.fitBounds(bounds, { padding: 24, animate: !matchMedia('(prefers-reduced-motion: reduce)').matches, duration: 240 });
    return;
  }
  const hs = e.target.closest('[data-hotspot]');
  if (hs) {
    const spot = state.cannabisHotspots[Number(hs.dataset.hotspot)];
    if (spot) {
      if (isPhone()) { setListOpen(false); $('#list-toggle').focus({ preventScroll: true }); }
      const deltaLat = 1500 / 110540;
      const deltaLng = 1500 / (111320 * Math.cos(spot.lat * Math.PI / 180));
      map.fitBounds([[spot.lng - deltaLng, spot.lat - deltaLat], [spot.lng + deltaLng, spot.lat + deltaLat]],
        { padding: 24, animate: !matchMedia('(prefers-reduced-motion: reduce)').matches, duration: 240 });
    }
  }
});

// an empty search box offers the moods: most people search by purpose before they know a name
const moodHits = () => state.clubMode ? '<li class="meta">Search a cannabis listing by name.</li>' : `<li data-act="walkthrough" role="option"><span class="nm"><b>Walk 3D World</b></span><span class="meta">screentoned manga Bangkok · 12 areas</span></li><li data-act="street" role="option"><span class="nm"><b>Street sketch</b></span><span class="meta">manga · mapped neighbourhoods</span></li><li data-act="media" role="option"><span class="nm"><b>People &amp; café videos</b></span><span class="meta">source leads · check branch</span></li><li data-act="featured" role="option"><span class="nm"><b>Featured places</b></span><span class="meta">verified branches · sources</span></li><li data-act="work" role="option"><span class="nm"><b>Find a work spot</b></span><span class="meta">Drive · BTS · nearby</span></li><li data-act="discovery" role="option"><span class="nm"><b>50 + 50 cafés</b></span><span class="meta">editorial · discussed</span></li><li data-act="now" role="option"><span class="mood-dot" aria-hidden="true">◎</span><span class="nm"><b>Near me now</b></span><span class="meta">Wi-Fi · parking · calm</span></li>
  <li data-act="hop" role="option"><span class="nm"><b>Plan a café hop</b></span><span class="meta">5 stops on foot</span></li>` + Object.entries(MOODS).map(([k, m]) =>
  `<li data-mood="${k}" role="option"><span class="mood-dot" aria-hidden="true">◐</span><span class="nm">${esc(m.label)}</span><span class="meta">citywide</span></li>`).join('');
$('#q').addEventListener('focus', () => {
  if ($('#q').value.trim().length < 2) { $('#hits').innerHTML = moodHits(); $('#hits').hidden = false; }
});

for (const b of document.querySelectorAll('.chips [data-kind]')) b.querySelector('.dot')?.replaceWith(document.createRange().createContextualFragment(PlaceTools.symbol(b.dataset.kind)));

// Phone: the map tools live in the Explore panel instead of floating over the map (MSH: nothing on top of the map).
// These buttons press the real atlas controls, so behaviour stays in atlas.js.
document.addEventListener('click', e => {
  const b = e.target.closest('[data-proxy]');
  if (!b) return;
  setListOpen(false);
  document.querySelector(`.atlas-dock [data-${b.dataset.proxy}]`)?.click();
});

// An action in the rail header closes the Explore disclosure. A click inside the
// disclosure must not: the mood and filter chips now live in there.
document.querySelector('.rail-header').addEventListener('click', e => {
  if (e.target.closest('.list-explore')) return;
  if (e.target.closest('[data-act],[data-mood],[data-flag],[data-proxy]')) for (const d of document.querySelectorAll('.rail-header details')) d.open = false;
});
