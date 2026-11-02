// BKK Co. · Bangkok Co(working). Map, filters, sorting, search, place sheet. No bundler, no framework.
// views.js adds the guide, neighbourhood and passport sheets on top of the helpers defined here.
const KIND_LABEL = { cafe: 'Café', restaurant: 'Food', coworking: 'Co-working', library: 'Library' };
const F = { WIFI: 1, NOWIFI: 2, HOURS: 4, OUTDOOR: 8, OVERTURE: 16, CHAIN: 32, NOTABLE: 64 };
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
const CELL = 20;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => n.toLocaleString('en-US');
const isPhone = () => !window.matchMedia('(min-width: 900px)').matches;
const metres = (a, b) => Math.hypot((a.y - b.y) * 111320, (a.x - b.x) * 111320 * Math.cos(a.y * Math.PI / 180));
const digits = p => [...p.g].map(Number);

const state = {
  places: [], byId: new Map(), scores: {}, cells: new Map(), visited: new Map(),
  kinds: new Set(['cafe', 'coworking', 'library', 'restaurant']), flags: new Set(),
  sort: 'great', selected: null, foodLoaded: false, sortedIdx: [],
};

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: [100.535, 13.745], zoom: 12.5, minZoom: 9, maxZoom: 19,
  maxBounds: [[99.9, 13.1], [101.35, 14.45]], renderWorldCopies: false,
  attributionControl: { compact: true, customAttribution: 'Places © <a href="https://overturemaps.org">Overture Maps</a> · © OSM contributors' },
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
if ('geolocation' in navigator) map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-right');

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
  try {
    const r = await fetch('/api/scores');
    if (r.ok) state.scores = await r.json();
  } catch { /* no API in a static preview: scores simply stay empty */ }
}

async function loadVisits() {
  try {
    state.visited = new Map();
    for (const v of await Passport.all()) state.visited.set(v.place, (state.visited.get(v.place) || 0) + 1);
  } catch { /* private window without IndexedDB: the passport stays empty */ }
  $('#pass-n').textContent = state.visited.size;
}

async function cellDetail(p) {
  const key = `${Math.floor(p.y * CELL)}-${Math.floor(p.x * CELL)}`;
  if (!state.cells.has(key)) state.cells.set(key, fetch(`data/cells/${key}.json`).then(r => (r.ok ? r.json() : {})).catch(() => ({})));
  return (await state.cells.get(key))[p.id] || {};
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
  if (!state.kinds.has(p.k)) return false;
  if (state.flags.has('wifi') && !(p.flags & F.WIFI) && !((state.scores[p.id]?.wifi || 0) >= 2)) return false;
  if (state.flags.has('open') && window.isOpen(p.hours, now) !== true) return false;
  if (state.flags.has('indie') && p.flags & F.CHAIN) return false;
  if (state.flags.has('visited') && !state.visited.has(p.id)) return false;
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
      properties: { id: p.id, n: p.n, k: p.k, i: p.idx, v: state.visited.has(p.id) ? 1 : 0 },
    })),
  });
  const total = state.places.length;
  $('#q').placeholder = `Search ${fmt(lastList.length)} places · ค้นหา`;
  $('#count').textContent = `${fmt(lastList.length)}${lastList.length === total ? '' : ' of ' + fmt(total)}${state.foodLoaded ? '' : ' · loading food'}`;
  renderList();
  performance.mark(map.getSource('places') ? 'bkk:pins' : 'bkk:data');
}

const firstData = Promise.all([loadRows('work'), loadScores(), loadVisits()]).then(() => refresh());
const foodData = firstData.then(() => loadRows('food')).then(() => { state.foodLoaded = true; refresh(); });

// ---------- map layers ----------
map.on('load', async () => {
  map.addSource('places', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterMaxZoom: 15, clusterRadius: 44 });
  map.addSource('sel', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  window.addHoodLayers?.(); // views.js: neighbourhood rings sit under the pins
  map.addLayer({ id: 'clusters', type: 'circle', source: 'places', filter: ['has', 'point_count'], paint: {
    'circle-color': '#ffffff', 'circle-stroke-color': '#20201d', 'circle-stroke-width': 1.5,
    'circle-radius': ['step', ['get', 'point_count'], 13, 50, 17, 500, 22, 5000, 28] } });
  map.addLayer({ id: 'cluster-n', type: 'symbol', source: 'places', filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 11, 'text-font': ['Noto Sans Regular'] },
    paint: { 'text-color': '#20201d' } });
  // pin size grows with the Great Good Place index, so the eye finds the strong places first
  const r = (base, top) => ['interpolate', ['linear'], ['get', 'i'], 0, base, 100, top];
  map.addLayer({ id: 'pins', type: 'circle', source: 'places', filter: ['!', ['has', 'point_count']], paint: {
    'circle-color': ['match', ['get', 'k'], 'cafe', '#20201d', 'coworking', '#f59e0b', 'library', '#ffffff', '#8f918a'],
    'circle-stroke-color': ['case', ['==', ['get', 'v'], 1], '#20201d', ['match', ['get', 'k'], 'library', '#20201d', 'coworking', '#20201d', '#ffffff']],
    'circle-stroke-width': ['case', ['==', ['get', 'v'], 1], 3, ['==', ['get', 'k'], 'library'], 2, 1],
    'circle-radius': ['interpolate', ['linear'], ['zoom'],
      13, ['match', ['get', 'k'], 'restaurant', r(2.5, 4.5), r(3.5, 6.5)],
      18, ['match', ['get', 'k'], 'restaurant', r(4.5, 8), r(6, 11)]] } });
  map.addLayer({ id: 'pin-names', type: 'symbol', source: 'places', minzoom: 16, filter: ['!', ['has', 'point_count']],
    layout: { 'text-field': ['get', 'n'], 'text-size': 11, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-optional': true,
      'text-font': ['Noto Sans Regular'], 'symbol-sort-key': ['-', 100, ['get', 'i']] },
    paint: { 'text-color': '#575951', 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 } });
  map.addLayer({ id: 'sel', type: 'circle', source: 'sel', paint: {
    'circle-radius': 13, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#20201d', 'circle-stroke-width': 2.5 } });

  map.on('click', 'clusters', async e => {
    const f = e.features[0];
    const zoom = await map.getSource('places').getClusterExpansionZoom(f.properties.cluster_id);
    map.easeTo({ center: f.geometry.coordinates, zoom: Math.min(zoom, 17) });
  });
  map.on('click', 'pins', e => select(state.byId.get(e.features[0].properties.id), false));
  for (const l of ['clusters', 'pins']) {
    map.on('mouseenter', l, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', l, () => { map.getCanvas().style.cursor = ''; });
  }
  map.on('moveend', renderList);
  document.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');

  await firstData; refresh(); openFromUrl();
  await foodData; refresh(); openFromUrl();
});

// ---------- list: in view, sorted by what people actually search by ----------
const SORTS = {
  great: (a, b) => b.idx - a.idx,
  popular: (a, b) => b.d[3] - a.d[3] || b.d[1] - a.d[1] || b.idx - a.idx,
  notable: (a, b) => b.d[5] - a.d[5] || b.d[3] - a.d[3] || b.idx - a.idx,
  work: (a, b) => workScore(b) - workScore(a) || b.idx - a.idx,
};

function renderList() {
  const wrap = $('#list-wrap');
  if (isPhone() && !wrap.classList.contains('open')) return;
  const b = map.getBounds(), c = map.getCenter(), centre = { y: c.lat, x: c.lng };
  let inView = lastList.filter(p => b.contains([p.x, p.y]));
  inView = state.sort === 'near'
    ? inView.map(p => [metres(p, centre), p]).sort((a, z) => a[0] - z[0]).map(a => a[1])
    : inView.sort(SORTS[state.sort]);
  $('#list').innerHTML = inView.length
    ? inView.slice(0, 60).map(row).join('')
    : '<li class="meta">Nothing here with these filters. Zoom out or clear a filter.</li>';
}

function row(p) {
  const s = state.scores[p.id];
  const tail = [
    state.visited.has(p.id) ? '<b title="You have been here">✓</b>' : '',
    p.flags & F.NOTABLE ? '<span title="Notable">✦</span>' : '',
    p.flags & F.WIFI ? '<span title="Wi-Fi listed">≋</span>' : '',
    s ? `<span title="Visitor ratings">★${s.n}</span>` : '',
  ].join(' ');
  return `<li data-id="${esc(p.id)}" role="option"><i class="dot ${p.k}"></i><span class="nm">${esc(p.n)}</span>` +
    `<span class="meta">${tail}</span><span class="idx" title="Great Good Place index">${p.idx}</span></li>`;
}

$('#list').addEventListener('click', e => {
  const li = e.target.closest('li[data-id]');
  if (li) select(state.byId.get(li.dataset.id), true);
});
$('.sorts').addEventListener('click', e => {
  const b = e.target.closest('[data-sort]');
  if (!b) return;
  state.sort = b.dataset.sort;
  document.querySelectorAll('.sorts [data-sort]').forEach(x => x.setAttribute('aria-selected', x === b));
  renderList();
});
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
  const q = $('#q').value.trim().toLowerCase();
  const hits = $('#hits');
  if (q.length < 2) { hits.hidden = true; return; }
  const starts = [], has = [];
  for (const p of state.places) {
    if (p.low.startsWith(q)) starts.push(p); else if (p.low.includes(q)) has.push(p);
    if (starts.length >= 40) break;
  }
  // best first, nearest on ties: what people mean by "the good one near here"
  const c = map.getCenter(), centre = { y: c.lat, x: c.lng };
  const rank = (a, z) => (z.idx - a.idx) * 40 + (metres(a, centre) - metres(z, centre)) / 100;
  const top = [...starts.sort(rank), ...has.sort(rank)].slice(0, 8);
  hitIdx = -1;
  hits.innerHTML = (window.hoodHits?.(q) || '') + (top.length ? top.map(row).join('') : '<li class="meta">No place by that name. Try Thai or English.</li>');
  hits.hidden = false;
});
$('#q').addEventListener('keydown', e => {
  const items = [...$('#hits').querySelectorAll('li[data-id], li[data-hood]')];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    hitIdx = Math.max(0, Math.min(items.length - 1, hitIdx + (e.key === 'ArrowDown' ? 1 : -1)));
    items.forEach((li, i) => li.setAttribute('aria-selected', i === hitIdx));
  } else if (e.key === 'Enter' && items.length) {
    items[Math.max(0, hitIdx)].click();
  } else if (e.key === 'Escape') { $('#hits').hidden = true; }
});
$('#hits').addEventListener('click', e => {
  const li = e.target.closest('li[data-id]');
  if (li) select(state.byId.get(li.dataset.id), true);
});
document.addEventListener('click', e => { if (!e.target.closest('.bar')) $('#hits').hidden = true; });

// ---------- filters ----------
$('.chips').addEventListener('click', e => {
  const b = e.target.closest('button[data-kind], button[data-flag]');
  if (!b) return;
  const on = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', on);
  const set = b.dataset.kind ? state.kinds : state.flags;
  const key = b.dataset.kind || b.dataset.flag;
  on ? set.add(key) : set.delete(key);
  refresh();
});

// ---------- sheets ----------
function openSheet(html) {
  setListOpen(false);
  const sheet = $('#sheet');
  sheet.hidden = false;
  sheet.innerHTML = html;
  sheet.scrollTop = 0;
  sheet.querySelector('.close')?.addEventListener('click', closeSheet);
  return sheet;
}

function closeSheet() {
  state.selected = null;
  $('#sheet').hidden = true;
  map.getSource('sel')?.setData({ type: 'FeatureCollection', features: [] });
  const u = new URL(location.href); u.searchParams.delete('p'); u.searchParams.delete('hood'); history.replaceState(null, '', u);
  renderList();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden && document.activeElement !== $('#q')) closeSheet(); });

// petal glyph: six petals, one per metric, length = decile; the four index metrics in ink
function petals(p, size = 76) {
  const cx = 50, cy = 50;
  const leaves = GGP.map(([, sym], i) => {
    const a = (i * 60 - 90) * Math.PI / 180, len = 8 + p.d[i] * 3.9, w = 7;
    const tx = cx + Math.cos(a) * len, ty = cy + Math.sin(a) * len;
    const nx = Math.cos(a + Math.PI / 2) * w, ny = Math.sin(a + Math.PI / 2) * w;
    const mx = cx + Math.cos(a) * len * 0.55, my = cy + Math.sin(a) * len * 0.55;
    const lx = cx + Math.cos(a) * 47, ly = cy + Math.sin(a) * 47;
    return `<path d="M${cx} ${cy} Q${mx + nx} ${my + ny} ${tx} ${ty} Q${mx - nx} ${my - ny} ${cx} ${cy}Z" fill="${i < 4 ? '#20201d' : '#a7a99f'}"/>` +
      `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central">${sym}</text>`;
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
  map.getSource('sel')?.setData({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.x, p.y] }, properties: {} });
  const u = new URL(location.href); u.searchParams.set('p', p.id); u.searchParams.delete('hood'); history.replaceState(null, '', u);
  renderSheet(p, {}, []);
  const padding = { top: 40, bottom: isPhone() ? $('#sheet').offsetHeight + 24 : 40, left: 40, right: 40 };
  const view = { center: [p.x, p.y], zoom: fly ? Math.max(map.getZoom(), 16.5) : map.getZoom(), padding };
  fly === 'jump' ? map.jumpTo(view) : map.flyTo({ ...view, speed: 1.6 }); // shared links land, no flight
  const [d, visits] = await Promise.all([cellDetail(p), Passport.forPlace(p.id).catch(() => [])]);
  renderSheet(p, d, visits);
}

function rawValue(key, p, d) {
  const m = d.m || {};
  return {
    A: m.walk != null ? `${Math.max(1, Math.round(m.walk / 80))} min walk to rail` : 'walk to rail',
    S: m.scene != null ? `${m.scene} third places within 250 m` : 'nearby third places',
    C: p.flags & F.CHAIN ? 'chain or brand' : 'independent',
    F: m.sources != null ? `known to ${m.sources} sources` : 'datasets and channels',
    W: [p.k === 'coworking' || p.k === 'library' ? KIND_LABEL[p.k] : '', p.flags & F.WIFI ? 'Wi-Fi listed' : '', p.hours ? 'hours known' : ''].filter(Boolean).join(' · ') || 'no work signal yet',
    N: p.flags & F.NOTABLE ? 'has a Wikidata or heritage record' : 'no record',
  }[key];
}

function renderSheet(p, d, visits) {
  if (state.selected !== p) return;
  const s = state.scores[p.id];
  const open = window.isOpen(p.hours, new Date());
  const hood = window.hoodOf?.(p);
  const facts = [
    p.hours && ['◷', `${open === true ? '<b>Open now</b> · ' : open === false ? 'Closed now · ' : ''}${esc(p.hours)}`],
    p.flags & F.OUTDOOR && ['☀', 'Outdoor seating'],
    d.c && ['·', esc(d.c.replace(/[_;]/g, ' '))],
    d.addr && ['⌖', esc(d.addr)],
    d.web && ['↗', `<a href="${esc(d.web)}" target="_blank" rel="noopener nofollow">${esc(d.web.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>`],
    d.social && ['↗', `<a href="${esc(d.social)}" target="_blank" rel="noopener nofollow">${esc(d.social.replace(/^https?:\/\/(www\.)?/, ''))}</a>`],
    d.tel && ['☎', `<a href="tel:${esc(d.tel.replace(/\s/g, ''))}">${esc(d.tel)}</a>`],
  ].filter(Boolean);
  const src = p.flags & F.OVERTURE
    ? `Overture Maps${d.ds?.length ? ' via ' + esc(d.ds.join(', ')) : ''}${d.conf ? ` · confidence ${d.conf}` : ''}`
    : `OpenStreetMap${d.ds?.length ? ' + ' + esc(d.ds.join(', ')) : ''} · <a href="https://www.openstreetmap.org/${{ n: 'node', w: 'way', r: 'relation' }[p.id[0]]}/${p.id.slice(1)}" target="_blank" rel="noopener">fix on OSM</a>`;

  const sheet = openSheet(`
    <header>
      <h1>${esc(p.n)}${d.th ? `<span class="th" lang="th">${esc(d.th)}</span>` : ''}</h1>
      <button class="close" aria-label="Close">×</button>
    </header>
    <div class="kindline"><i class="dot ${p.k}"></i>${KIND_LABEL[p.k]}${hood ? ` · <button class="linkish" data-hood="${hood.slug}">${esc(hood.name)}</button>` : ''}${visits.length ? ` · <b>✓ been ${visits.length}×</b>` : ''}</div>
    <section class="ggp">
      ${petals(p)}
      <div class="ggp-num"><span class="big">${p.idx}</span><span class="micro">Great Good Place index · top ${topShare(p)}% of Bangkok</span></div>
      <table class="ggp-table">${GGP.map(([k, sym, label], i) => `<tr><td class="sym">${sym}</td><td>${label}</td><td>${dots(p.d[i])}</td><td class="raw">${esc(rawValue(k, p, d))}</td></tr>`).join('')}</table>
    </section>
    ${facts.length ? `<ul class="facts">${facts.map(([sym, t]) => `<li class="sym" aria-hidden="true">${sym}</li><li>${t}</li>`).join('')}</ul>` : ''}
    <section class="been">
      <button type="button" class="send been-open">✓ I've been here</button>
      ${visits.length ? `<ul class="moments">${visits.slice().reverse().map(window.momentHtml).join('')}</ul>` : ''}
    </section>
    <section class="scores">
      <h2 class="micro">${s ? `Work score · ${s.n} ${s.n === 1 ? 'rating' : 'ratings'} · last ${esc(s.last)}` : 'Work score · not rated yet'}</h2>
      ${s ? `<table>${SCORES.map(([k, label]) => `<tr><td>${label}</td><td>${dots(s[k], 3)}</td><td>${s[k].toFixed(1)} / 3</td></tr>`).join('')}</table>` : ''}
      <button type="button" class="send rate-open">${s ? 'Add your rating' : 'Be the first to rate'}</button>
      <form class="rate" aria-label="Rate this place" hidden>
        ${SCORES.map(([k, label, opts]) => `<span>${label}</span><div class="seg" data-k="${k}" role="group" aria-label="${label}">${opts.map((o, i) => `<button type="button" data-v="${i + 1}" aria-pressed="false">${o}</button>`).join('')}</div>`).join('')}
        <button class="send" type="submit" disabled>Save rating</button>
        <p class="note" role="status"></p>
      </form>
    </section>
    <nav class="links">
      <a href="https://www.google.com/maps/dir/?api=1&destination=${p.y},${p.x}" target="_blank" rel="noopener">Directions</a>
      <button type="button" class="share">Share</button>
    </nav>
    <p class="src">Source: ${src}</p>`);

  sheet.querySelector('[data-hood]')?.addEventListener('click', e => window.openHood?.(e.target.dataset.hood));
  sheet.querySelector('.been-open').addEventListener('click', e => window.beenForm?.(p, e.target, () => select(p, false)));
  window.bindMoments?.(sheet);
  const form = sheet.querySelector('.rate'), vote = {};
  sheet.querySelector('.rate-open').onclick = e => { e.target.hidden = true; form.hidden = false; form.querySelector('.seg button').focus(); };
  form.addEventListener('click', e => {
    const b = e.target.closest('.seg button');
    if (!b) return;
    const seg = b.parentElement;
    seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    vote[seg.dataset.k] = +b.dataset.v;
    form.querySelector('.send').disabled = SCORES.some(([k]) => !vote[k]);
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const note = form.querySelector('.note'), send = form.querySelector('.send');
    send.disabled = true; note.textContent = 'Saving…';
    try {
      const r = await fetch('/api/scores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ place: p.id, ...vote }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { note.textContent = body.error ? `Not saved: ${body.error}.` : `Not saved (${r.status}).`; send.disabled = false; return; }
      await loadScores(); refresh(); renderSheet(p, d, visits);
      const btn = $('#sheet .rate-open'); btn.textContent = 'Saved. Thank you. Rate again tomorrow'; btn.disabled = true;
    } catch { note.textContent = 'Not saved: no connection.'; send.disabled = false; }
  });
  sheet.querySelector('.share').onclick = async () => {
    const url = location.href;
    if (navigator.share) { try { await navigator.share({ title: p.n, url }); } catch { /* cancelled */ } return; }
    await navigator.clipboard?.writeText(url);
    sheet.querySelector('.share').textContent = 'Link copied';
  };
}

function openFromUrl() {
  const u = new URL(location.href), id = u.searchParams.get('p');
  if (id && !state.selected && state.byId.has(id)) select(state.byId.get(id), 'jump');
  else if (u.searchParams.get('hood') && $('#sheet').hidden) window.openHood?.(u.searchParams.get('hood'), true);
}
