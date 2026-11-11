// PLUB · Placemaking Laboratory Urban Bureau. Map, filters, sorting, search, place sheet. No bundler, no framework.
// views.js adds the guide, neighbourhood and passport sheets on top of the helpers defined here.
const KIND_LABEL = { cafe: 'Café', restaurant: 'Food', coworking: 'Co-working', library: 'Library' };
const safeLink = value => { try { const u=new URL(value); return ['https:','http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; } };
const F = { WIFI: 1, NOWIFI: 2, HOURS: 4, OUTDOOR: 8, OVERTURE: 16, CHAIN: 32, NOTABLE: 64, HAND: 128, PARK: 256, COFFEE: 512 }; // same bits as build-places.py
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
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => n.toLocaleString('en-US');
const isPhone = () => !window.matchMedia('(min-width: 900px)').matches;
const metres = (a, b) => Math.hypot((a.y - b.y) * 111320, (a.x - b.x) * 111320 * Math.cos(a.y * Math.PI / 180));
const digits = p => [...p.g].map(Number);
const venueHours = p => window.WorkFinder?.hours(p) || p.hours;

const state = {
  places: [], byId: new Map(), scores: {}, cells: new Map(), visited: new Map(), personalRatings: new Map(),
  kinds: new Set(['cafe', 'coworking', 'library']), flags: new Set(), // Food is one tap away, off by default
  sort: 'near', mood: null, selected: null, foodLoaded: false, sortedIdx: [],
};

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
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
if ('geolocation' in navigator) map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-right');
// A lens, not a second map: the same source, drawn as line and tone.
window.MangaLens?.attach(map);
window.FootprintPalette?.attach(map);
window.NeighborhoodPalette?.attach(map);

// ---------- data ----------
async function loadRows(name) {
  const { kinds, rows } = await (await fetch(`data/places-${name}.json`)).json();
  // idx: Great Good Place index, mean of the A/S/C/F percentiles (scripts/build-places.py)
  for (const [id, n, k, y, x, flags, g, idx, hours] of rows) {
    const p = { id, n, k: kinds[k], y, x, flags, g, idx, hours, low: n.toLowerCase() };
    p.d = digits(p);
    state.places.push(p); state.byId.set(id, p);
  }
  state.sortedIdx = state.places.map(p => p.idx).sort((a, b) => a - b);
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
  const key = `${Math.floor(p.y * CELL)}-${Math.floor(p.x * CELL)}`;
  if (!state.cells.has(key)) state.cells.set(key, fetch(`data/cells/${key}.json`).then(r => (r.ok ? r.json() : {})).catch(() => ({})));
  return { ...((await state.cells.get(key))[p.id] || {}), loaded: true };
}

// share of Bangkok places this one beats, from the sorted index list
function topShare(p) {
  const a = state.sortedIdx; let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < p.idx) lo = m + 1; else hi = m; }
  return Math.max(1, Math.round(100 * (1 - lo / a.length)));
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
  const total = state.places.length;
  $('#count').textContent = `${fmt(lastList.length)} matching`;
  $('#list-filter-count').textContent=state.flags.size?' · '+state.flags.size:'';
  $('#list-matching').textContent=`${fmt(lastList.length)} matching catalogue places of ${fmt(total)} across the covered Bangkok area. Wi-Fi and hours depend on documented or visitor information.`;
  renderMood();
  renderList();
  performance.mark(map.getSource('places') ? 'bkk:pins' : 'bkk:data');
}

const scoresReady=loadScores().then(()=>{
  if(state.places.length)refresh();
  const panel=document.querySelector('#sheet .scores');if(panel&&state.selected)panel.innerHTML=scoreHtml(state.selected);
  window.WorkFinder?.kindsChanged();
});
const firstData = aliasesReady.then(() => Promise.all([loadRows('work'), loadVisits()])).then(() => refresh());
const foodData = firstData.then(() => loadRows('food')).then(() => { state.foodLoaded = true; refresh(); });
// Branch labels for repeated names ("Starbucks Coffee · Sathupradit Rd"): the listing's own address, or its district.
// Fetched after the map is up; scripts/build-branches.py. A place without a published address or district gets none.
foodData.then(() => fetch('data/branches.json')).then(r => (r.ok ? r.json() : {})).then(b => {
  for (const [id, label] of Object.entries(b)) { const p = state.byId.get(id); if (p) p.branch = label; }
  renderList();
}).catch(() => {});
const branchTag = p => (p.branch ? `<span class="branch">· ${esc(p.branch)}</span>` : '');

const PIN_LAYERS = ['pins-city', 'pins-street', 'pins', 'place-icons'];

// ---------- map layers ----------
map.on('load', async () => {
  map.addSource('places', { type: 'geojson', cluster:true, clusterRadius:72, clusterMaxZoom:19, maxzoom:20, clusterProperties:Object.fromEntries([['cafes','cafe'],['food','restaurant'],['work','coworking'],['books','library']].map(([key,kind])=>[key,['+',['case',['==',['get','k'],kind],1,0]]])), data: { type: 'FeatureCollection', features: [] } });
  map.addSource('sel', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  window.addHoodLayers?.(); // views.js: neighbourhood rings sit under the pins
  // Every matching record participates in clustering. These transparent backing layers
  // retain the legacy interaction surfaces; semantic symbols carry the visible marks.
  for (const [id,minzoom,maxzoom] of [['pins-city',0,13],['pins-street',13,15],['pins',15,24]]) map.addLayer({id,type:'circle',source:'places',minzoom,maxzoom,filter:['!',['has','point_count']],paint:{'circle-radius':14,'circle-opacity':0}});
  map.addLayer({ id: 'pin-city-names', type: 'symbol', source: 'places', minzoom: 12.5, maxzoom: 15, filter: ['all',['!',['has','point_count']],['>=', ['get', 'i'], 96]],
    layout: { 'text-field': ['get', 'n'], 'text-size': 11, 'text-offset': [0, 1], 'text-anchor': 'top', 'text-optional': true,
      'text-font': ['Noto Sans Regular'], 'symbol-sort-key': ['-', 100, ['get', 'i']] },
    paint: { 'text-color': '#575951', 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 } });
  map.addLayer({ id: 'pin-names', type: 'symbol', source: 'places', minzoom: 16, filter:['!',['has','point_count']],
    layout: { 'text-field': ['get', 'n'], 'text-size': 11, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-optional': true,
      'text-font': ['Noto Sans Regular'], 'symbol-sort-key': ['-', 100, ['get', 'i']] },
    paint: { 'text-color': '#575951', 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 } });
  map.addLayer({ id: 'sel', type: 'circle', source: 'sel', paint: {
    'circle-radius': 20, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#20201d', 'circle-stroke-width': 2.5 } });

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

  await firstData; refresh(); openFromUrl();
  await foodData; refresh(); openFromUrl();
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
};

const listGroups = [
  ['cafe', 'Cafés'], ['coworking', 'Co-working'], ['library', 'Libraries'], ['restaurant', 'Food'],
];
const listPreview = 3;
const listPageSize = 12;
const groupLimits = new Map();

function renderList() {
  const wrap = $('#list-wrap');
  if (isPhone() && !wrap.classList.contains('open')) return;
  const b = map.getBounds(), c = map.getCenter(), centre = { y: c.lat, x: c.lng };
  let inView = lastList.filter(p => b.contains([p.x, p.y]));
  inView = state.sort === 'near'
    ? inView.map(p => [metres(p, centre), p]).sort((a, z) => a[0] - z[0]).map(a => a[1])
    : inView.sort(SORTS[state.sort]);
  $('#list-order').value=state.sort;
  $('#list-origin').hidden = state.sort !== 'near';
  const loadingFood = state.kinds.has('restaurant') && !state.foodLoaded;
  const count = $('#count');
  count.textContent = `${fmt(inView.length)} ${inView.length === 1 ? 'place' : 'places'}${loadingFood ? ' · food loading' : ''}`;
  count.title = `${fmt(inView.length)} matches in map bounds. Distances are straight lines from the map centre.`;
  const list = $('#list');
  const focusedPlace = document.activeElement.closest('.list-place')?.closest('li')?.dataset.id;
  const focusedGroup = document.activeElement.dataset.listMore;
  const groups = new Map(listGroups.map(([kind]) => [kind, []]));
  for (const place of inView) groups.get(place.k)?.push(place);
  list.innerHTML = inView.length ? listGroups.map(([kind, label]) => {
    const places = groups.get(kind);
    if (!places.length) return '';
    const limit = groupLimits.get(kind) ?? listPreview;
    const remaining = places.length - limit;
    const action = remaining > 0 ? `Show ${Math.min(listPageSize, remaining)} more` : 'Show fewer';
    const more = places.length > listPreview
      ? `<button type="button" class="list-more" data-list-more="${kind}" aria-label="${action} · ${label}">${action}</button>`
      : '';
    const rows = places.slice(0, limit).map(p => row(p, sortKey(p, centre), true)).join('');
    return `<li class="list-group" data-list-group="${kind}"><h3 id="list-heading-${kind}">${label} <span>${fmt(places.length)}</span></h3>
      <ol aria-labelledby="list-heading-${kind}">${rows}</ol>${more}</li>`;
  }).join('') : `<li class="meta">${loadingFood ? 'Loading food places…' : 'No matches in view. Pan, zoom out or clear a filter.'}</li>`;
  if (focusedPlace) list.querySelector(`[data-id="${CSS.escape(focusedPlace)}"] button`)?.focus({ preventScroll: true });
  if (focusedGroup) list.querySelector(`[data-list-more="${CSS.escape(focusedGroup)}"]`)?.focus({ preventScroll: true });

}

function sortKey(p, centre) {
  return {
    great: `${p.idx} index`,
    near: `~${Math.round(metres(p, centre) / 10) * 10} m`,
    leveler: p.flags & F.CHAIN ? 'chain' : `◇${p.d[2]}/9 indie`,
    vitality: `⁘${p.d[1]}/9 scene`,
    regulars: state.visited.has(p.id) ? '✓ regular' : `♡ home`,
    access: `↦${p.d[0]}/9 walk`,
    sanctuary: `≋${Math.round(workScore(p))} work`,
    popular: `${p.d[3]}/9 footprint`,
    notable: p.d[5] ? 'record' : '—',
    work: `${Math.round(workScore(p))} work`,
  }[state.sort] || `${p.idx} index`;
}

function row(p, key = `${p.idx} index`, list = false) {
  const s = state.scores[p.id];
  const ws = workScore(p);
  const tail = [
    state.visited.has(p.id) ? '<b title="You have been here">✓</b>' : '',
    p.flags & F.NOTABLE ? '<span title="Notable">✦</span>' : '',
    p.flags & F.WIFI ? '<span title="Wi-Fi listed">≋</span>' : '',
    s ? `<span title="Visitor ratings">★${s.n}</span>` : '',
    state.flags.has('work') ? `<span title="Work score" class="ws">${Math.round(ws)}</span>` : '',
  ].join(' ');
  const label=esc(p.n+(p.branch?', '+p.branch:'')+' · '+KIND_LABEL[p.k]);
  const name=`${esc(p.n)}${p.branch?' '+branchTag(p):''}`;
  if(list)return `<li data-id="${esc(p.id)}"><button type="button" class="list-place" aria-label="${label}, ${esc(key)}">${PlaceTools.icon(p)}<span class="nm">${name}<span class="row-signals">${tail}</span></span><span class="idx" title="${state.sort==='near'?'Straight line from the map centre':'Computed catalogue signal, not a visitor star rating'}">${esc(key)}</span></button></li>`;
  return `<li data-id="${esc(p.id)}" role="option" aria-label="${label}">${PlaceTools.icon(p)}<span class="nm">${name}</span><span class="meta">${tail}</span><span class="idx">${esc(key)}</span></li>`;
}

$('#list').addEventListener('click', e => {
  const more = e.target.closest('[data-list-more]');
  if (more) {
    const kind = more.dataset.listMore;
    const before = groupLimits.get(kind) ?? listPreview;
    const showFewer = more.textContent === 'Show fewer';
    groupLimits.set(kind, showFewer ? listPreview : before + listPageSize);
    renderList();
    if (!showFewer) $('#list').querySelectorAll(`[data-list-group="${kind}"] .list-place`)[before]?.focus();
    return;
  }
  const li = e.target.closest('li[data-id]');
  if (li) select(state.byId.get(li.dataset.id), true);
});
$('#list-order').addEventListener('change',e=>{state.sort=e.target.value;renderList()});
$('#list-toggle').addEventListener('click', () => setListOpen(!$('#list-wrap').classList.contains('open')));
$('.list-close').addEventListener('click', () => setListOpen(false));
function setListOpen(on) {
  $('#list-wrap').classList.toggle('open', on);
  $('#list-toggle').setAttribute('aria-pressed', on);
  if (on) { $('#sheet').hidden = true; renderList(); }
}

// ---------- search ----------
let hitIdx = -1;
$('#q').addEventListener('input', () => {
  const q = PlaceTools.normalize(PlaceTools.query($('#q').value));
  const hits = $('#hits');
  if (q.length < 2) { hits.innerHTML = moodHits(); hits.hidden = false; return; }
  const starts = [], has = [];
  for (const p of state.places) {
    if (PlaceTools.normalize(p.n).startsWith(q)) starts.push(p); else if (PlaceTools.matches(p, q)) has.push(p);
    if (starts.length >= 40) break;
  }
  // best first, nearest on ties: what people mean by "the good one near here"
  const c = map.getCenter(), centre = { y: c.lat, x: c.lng };
  const rank = (a, z) => (z.idx - a.idx) * 40 + (metres(a, centre) - metres(z, centre)) / 100;
  const top = [...starts.sort(rank), ...has.sort(rank)].slice(0, 8);
  hitIdx = -1;
  const c2 = map.getCenter();
  const missing = `<li class="meta missing"><a href="${osmNote(c2.lat, c2.lng)}" target="_blank" rel="noopener">Missing a place? Tell OpenStreetMap ↗</a></li>`;
  hits.innerHTML = (window.hoodHits?.(q) || '') + (top.length ? top.map(p => row(p)).join('') : '<li class="meta">No place by that name. Try Thai or English.</li>') + missing;
  hits.hidden = false;
});
$('#q').addEventListener('keydown', e => {
  const items = [...$('#hits').querySelectorAll('li[data-id], li[data-hood], li[data-mood], li[data-act]')];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    hitIdx = Math.max(0, Math.min(items.length - 1, hitIdx + (e.key === 'ArrowDown' ? 1 : -1)));
    items.forEach((li, i) => li.setAttribute('aria-selected', i === hitIdx));
  } else if (e.key === 'Enter' && items.length) {
    items[Math.max(0, hitIdx)].click();
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
  if (!b) return;
  const on = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', on);
  const set = b.dataset.kind ? state.kinds : state.flags;
  const key = b.dataset.kind || b.dataset.flag;
  on ? set.add(key) : set.delete(key);
  refresh();
  if(b.dataset.kind)window.WorkFinder?.kindsChanged();
});

// ---------- sheets ----------
let sheetGeneration=0;
function openSheet(html, { place = false, keepRoute = false } = {}) {
  sheetGeneration++;
  window.MangaLens?.settle();
  window.StreetWorld?.suspend();
  if (!place) { if (!keepRoute) { window.WorkFinder?.clearMap(); window.clearRoute?.(); } state.selected = null; map.getSource('sel')?.setData({ type:'FeatureCollection', features:[] }); }
  openFromUrl.framed=true;
  setListOpen(false);
  $('#hits').hidden = true;
  const sheet = $('#sheet');
  sheet.classList.remove('notebook-sheet','hood-sheet','hop-sheet','discovery-sheet','atlas-sheet','journey-sheet','featured-sheet','recommend-sheet','community-sheet','shared-hops-sheet','reference-gallery');
  sheet.hidden = false;
  sheet.innerHTML = html;
  const heading = sheet.querySelector('h1');
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
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
    return `<path d="M${cx} ${cy} Q${mx + nx} ${my + ny} ${tx} ${ty} Q${mx - nx} ${my - ny} ${cx} ${cy}Z" fill="${i < 4 ? '#20201d' : '#a7a99f'}"/>` +
''; // labels live in the table beside it
  }).join('');
  return `<svg class="petals" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Great Good Place profile">
    <circle cx="50" cy="50" r="43" fill="none" stroke="#d5d7cf" stroke-dasharray="2 3"/>${leaves}
    <circle cx="50" cy="50" r="3" fill="#f59e0b"/></svg>`;
}

const dots = (v, max = 9) => `<span class="bars" aria-label="${v} of ${max}"><b>${'●'.repeat(Math.round(v * 5 / max))}</b><s>${'●'.repeat(5 - Math.round(v * 5 / max))}</s></span>`;

async function select(p, fly) {
  if (!p) return;
  state.selected = p;
  $('#hits').hidden = true;
  map.getSource('sel')?.setData(Atlas.selection(p));
  const u = new URL(location.href); u.searchParams.set('p', p.id); u.searchParams.delete('hood'); history.replaceState(null, '', u);
  renderSheet(p, {}, []);
  const padding = { top: 40, bottom: isPhone() ? $('#sheet').offsetHeight + 24 : 40, left: 40, right: 40 };
  const view = { center: [p.x, p.y], zoom: fly ? Math.max(map.getZoom(), 16.5) : map.getZoom(), padding };
  fly === 'jump' ? map.jumpTo(view) : map.flyTo({ ...view, speed: 1.6 }); // shared links land, no flight
  const generation=sheetGeneration;
  const [d, visits] = await Promise.all([cellDetail(p), Passport.forPlace(p.id,canonId).catch(() => [])]);
  if(generation===sheetGeneration)renderSheet(p, d, visits);
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

function renderSheet(p, d, visits) {
  if (state.selected !== p) return;
  // Late catalogue details must not replace a visit form someone is already writing.
  if (!$('#sheet').hidden && $('#sheet .been-form')?.dataset.place === p.id) return;
  const s = state.scores[p.id];
  const open = window.isOpen(venueHours(p), new Date());
  const hood = window.hoodOf?.(p);
  const facts = [
    d.about && ['✎', esc(d.about)],
    d.visit && ['✓', `<span class="hand">${esc(d.visit)}</span>`], // Non's own note, in his own hand
    venueHours(p) && ['◷', `${open === true ? '<b>Open now</b> · ' : open === false ? 'Closed now · ' : ''}${esc(venueHours(p))}`],
    p.flags & F.OUTDOOR && ['☀', 'Outdoor seating'],
    d.c && ['·', esc(d.c.replace(/[_;]/g, ' '))],
    d.addr && ['⌖', esc(d.addr)],
    safeLink(d.web) && ['↗', `<a href="${esc(safeLink(d.web))}" target="_blank" rel="noopener nofollow">${esc(d.web.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>`],
    safeLink(d.social) && ['↗', `<a href="${esc(safeLink(d.social))}" target="_blank" rel="noopener nofollow">${esc(d.social.replace(/^https?:\/\/(www\.)?/, ''))}</a>`],
    d.tel && ['☎', `<a href="tel:${esc(d.tel.replace(/\s/g, ''))}">${esc(d.tel)}</a>`],
  ].filter(Boolean);
  const src = p.flags & F.HAND
    ? `Hand pin · ${esc(d.pinned || 'a visit')} · not on OpenStreetMap yet · <a href="${osmNote(p.y, p.x)}" target="_blank" rel="noopener">add it</a>`
    : p.flags & F.OVERTURE
    ? `Overture Maps${d.ds?.length ? ' via ' + esc(d.ds.join(', ')) : ''}${d.conf ? ` · confidence ${d.conf}` : ''}`
    : `OpenStreetMap${d.ds?.length ? ' + ' + esc(d.ds.join(', ')) : ''} · <a href="https://www.openstreetmap.org/${{ n: 'node', w: 'way', r: 'relation' }[p.id[0]]}/${p.id.slice(1)}" target="_blank" rel="noopener">fix on OSM</a>`;

  const sheet = openSheet(`
    <header>
      <h1>${esc(p.n)}${p.branch ? `<span class="th">${esc(p.branch)}</span>` : ''}${d.th ? `<span class="th" lang="th">${esc(d.th)}</span>` : ''}</h1>
      <button class="close" aria-label="Close">×</button>
    </header>
    <div class="kindline">${PlaceTools.symbol(p.k)}${KIND_LABEL[p.k]}${hood ? ` · <button class="linkish" data-hood="${hood.slug}">${esc(hood.name)}</button>` : ''}${visits.length ? ` · <b>✓ been ${visits.length}×</b>` : ''}</div>
    <section class="been place-actions"><button type="button" class="send been-open">✓ I've been here</button><a href="${esc(window.WorkFinder?.directions(p)||`https://www.google.com/maps/dir/?api=1&destination=${p.y},${p.x}`)}" target="_blank" rel="noopener">Directions ↗</a></section>
    <nav class="place-social" aria-label="Place contributions"><button type="button" data-place-community>Notes &amp; photos</button><button type="button" data-place-recommend>Add recommendation</button><button type="button" class="share">Share place</button><button type="button" data-place-street>${window.StreetWorld?.active?'Back to street sketch':'Street sketch'}</button></nav>
    ${window.WorkFinder?.placePanel(p)||''}
    <div class="place-reference-slot"></div>
    ${Atlas.facts(p)}
    ${window.WorkAtmosphere?.render(p, d, { [p.id]: state.scores[p.id] } ) || ''}
    ${window.TalkMedia?.section(p.id)||''}
    <section class="ggp">
      ${petals(p)}
      <div class="ggp-num"><span class="big">${p.idx}</span><span class="micro">Great Good Place index · top ${topShare(p)}% of Bangkok</span></div>
      <table class="ggp-table">${GGP.map(([k, sym, label], i) => `<tr><td class="sym">${sym}</td><td>${label}</td><td class="raw">${esc(rawValue(k, p, d))}</td></tr>`).join('')}</table>
    </section>
    ${facts.length ? `<ul class="facts">${facts.map(([sym, t]) => `<li class="sym" aria-hidden="true">${sym}</li><li>${t}</li>`).join('')}</ul>` : ''}
    ${visits.length ? `<section><ul class="moments">${visits.slice().reverse().map(window.momentHtml).join('')}</ul></section>` : ''}
    <section class="scores">${scoreHtml(p)}</section>
    <nav class="links">
      ${['cafe', 'restaurant'].includes(p.k) ? `<a href="https://www.wongnai.com/restaurants?q=${encodeURIComponent(p.n)}" target="_blank" rel="noopener nofollow" title="Photos and reviews on Wongnai, opens their site">Photos &amp; reviews ↗ Wongnai</a>` : ''}
    </nav>
    <p class="src">Source: ${src}</p>
    ${d.provenance ? `<details class="src reviewed-source"><summary>Reviewed café classification · original open-data location</summary><p>Overture Maps ${esc(d.provenance.release)} · ${esc(d.provenance.licence)} · source ID ${esc(d.provenance.sourceID)}. The source called this a ${esc(d.provenance.sourceTaxonomy)}; the café identity was checked ${esc(d.provenance.checkedAt)}. Original source coordinates retained. Wi-Fi, outlets and parking remain unconfirmed.</p>${(d.provenance.sources||[]).map(v=>`<p><a href="${esc(safeLink(v.url))}" target="_blank" rel="noopener nofollow">${esc(v.publisher)}</a> · ${esc(v.published_at||v.updated_at||'date unstated')}</p>`).join('')}</details>` : ''}
    ${d.enrichment ? `<details class="src enrichment-source"><summary>Added ${Object.keys(d.enrichment).map(k=>k==='addr'?'address':'phone').join(' &amp; ')} · AllThePlaces · snapshot ${esc(Object.values(d.enrichment)[0].asOf)}</summary><p>CC0 Café Amazon export, published at the end of the 24–31 October run; venue details may have changed. <a href="https://alltheplaces-data.openaddresses.io/runs/2026-10-24-13-32-37/output/cafe_amazon.geojson" target="_blank" rel="noopener">Download source</a>. ${Object.values(d.enrichment).map(v=>`Branch ${esc(v.ref)} · ${esc(v.branch)} · record ${esc(v.id)} · matched within ${esc(v.distanceM)} m`).filter((v,i,a)=>a.indexOf(v)===i).join('; ')}</p></details>` : ''}`, { place:true });

  sheet.querySelector('[data-hood]')?.addEventListener('click', e => window.openHood?.(e.target.dataset.hood));
  sheet.querySelector('.been-open').addEventListener('click', e => window.beenForm?.(p, e.target, () => select(p, false)));
  window.bindMoments?.(sheet);
  window.TalkMedia?.attach(sheet,p);
  window.NeighborhoodPhotos?.attach(sheet.querySelector('.place-reference-slot'),p,hood?.slug);
  window.WorkFinder?.warmPlace(p,sheet.querySelector('.journey-place-facts'));
  sheet.querySelector('[data-place-street]').onclick=()=>window.StreetWorld?.active?StreetWorld.resume():StreetWorld.open(p);
  sheet.querySelector('[data-place-community]').onclick = () => window.Notebook?.showCommunity(p);
  sheet.querySelector('[data-place-recommend]').onclick = () => window.Notebook?.recommend(p);
  sheet.querySelector('.share').onclick = () => PlaceTools.share({title:p.n,url:new URL('?p='+encodeURIComponent(p.id),location.origin).href},sheet);
}

function openFromUrl() {
  const u = new URL(location.href), raw = u.searchParams.get('p'), id = raw && canonId(raw);
  if (raw && id !== raw) { u.searchParams.set('p', id); history.replaceState(null, '', u); } // an old shared link lands on the survivor
  if (id && !state.selected && $('#sheet').hidden && state.byId.has(id)) select(state.byId.get(id), 'jump');
  else if (u.searchParams.get('hood') && $('#sheet').hidden) window.openHood?.(u.searchParams.get('hood'), true);
  else if (u.searchParams.get('hop') && !openFromUrl.framed) { openFromUrl.framed = true; window.openHop?.(u.searchParams.get('hop')); }
  else if (MOODS[u.searchParams.get('mood')] && !state.mood && !openFromUrl.framed) { openFromUrl.framed = true; setMood(u.searchParams.get('mood')); }
  else if (!id && !u.searchParams.get('hood') && !openFromUrl.framed) { openFromUrl.framed = true; } // Keep the close manga neighbourhood; zoom controls retain the city overview.
}

// ---------- moods ----------
function setMood(key) {
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
    else if (act.dataset.act === 'compare') { location.href = 'neighbourhoods.html'; return; }
    else act.dataset.act === 'now' ? window.openNow?.() : window.openHop?.();
  }
  const h = e.target.closest('#mood [data-hood]');
  if (h) window.openHood?.(h.dataset.hood);
});

// an empty search box offers the moods: most people search by purpose before they know a name
const moodHits = () => `<li data-act="walkthrough" role="option"><span class="nm"><b>Walk 3D World</b></span><span class="meta">screentoned manga Bangkok · 12 areas</span></li><li data-act="street" role="option"><span class="nm"><b>Street sketch</b></span><span class="meta">manga · mapped neighbourhoods</span></li><li data-act="media" role="option"><span class="nm"><b>People &amp; café videos</b></span><span class="meta">source leads · check branch</span></li><li data-act="featured" role="option"><span class="nm"><b>Featured places</b></span><span class="meta">verified branches · sources</span></li><li data-act="work" role="option"><span class="nm"><b>Find a work spot</b></span><span class="meta">Drive · BTS · nearby</span></li><li data-act="discovery" role="option"><span class="nm"><b>50 + 50 cafés</b></span><span class="meta">editorial · discussed</span></li><li data-act="now" role="option"><span class="mood-dot" aria-hidden="true">◎</span><span class="nm"><b>Near me now</b></span><span class="meta">Wi-Fi · parking · calm</span></li>
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

document.querySelector('.list-options').addEventListener('click',e=>{if(e.target.closest('[data-act],[data-mood],[data-proxy]'))for(const d of document.querySelectorAll('.list-options details'))d.open=false});
