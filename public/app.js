// BKK Co. — one map of Bangkok work spots. No bundler, no framework.
const KIND_LABEL = { cafe: 'Café', restaurant: 'Food', coworking: 'Co-working', library: 'Library' };
const F = { WIFI: 1, NOWIFI: 2, HOURS: 4, OUTDOOR: 8, OVERTURE: 16 };
const METRICS = [
  ['wifi', 'Wi-Fi', ['None', 'Slow', 'Fast']],
  ['power', 'Outlets', ['None', 'Few', 'Plenty']],
  ['quiet', 'Quiet', ['Loud', 'OK', 'Quiet']],
  ['laptop', 'Laptop', ['No', 'OK', 'Welcome']],
];
const CELL = 20;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => n.toLocaleString('en-US');

const state = {
  places: [], byId: new Map(), scores: {}, cells: new Map(),
  kinds: new Set(['cafe', 'coworking', 'library', 'restaurant']), flags: new Set(),
  selected: null, foodLoaded: false,
};

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: [100.535, 13.745], zoom: 12.5, minZoom: 9, maxZoom: 19,
  maxBounds: [[99.9, 13.1], [101.35, 14.45]], renderWorldCopies: false,
  attributionControl: { compact: true, customAttribution: 'Places © <a href="https://overturemaps.org">Overture Maps</a> · © OSM contributors' },
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), 'top-right');

// ---------- data ----------
async function loadRows(name) {
  const { kinds, rows } = await (await fetch(`data/places-${name}.json`)).json();
  for (const [id, n, k, y, x, flags, hours] of rows) {
    const p = { id, n, k: kinds[k], y, x, flags, hours, low: n.toLowerCase() };
    state.places.push(p); state.byId.set(id, p);
  }
}

async function loadScores() {
  try {
    const r = await fetch('/api/scores');
    if (r.ok) state.scores = await r.json();
  } catch { /* no API in a static preview: scores simply stay empty */ }
}

async function cellDetail(p) {
  const key = `${Math.floor(p.y * CELL)}-${Math.floor(p.x * CELL)}`;
  if (!state.cells.has(key)) {
    state.cells.set(key, fetch(`data/cells/${key}.json`).then(r => (r.ok ? r.json() : {})).catch(() => ({})));
  }
  return (await state.cells.get(key))[p.id] || {};
}

// ---------- filtering ----------
function visible(p, now) {
  if (!state.kinds.has(p.k)) return false;
  if (state.flags.has('wifi') && !(p.flags & F.WIFI) && !((state.scores[p.id]?.wifi || 0) >= 2)) return false;
  if (state.flags.has('open') && window.isOpen(p.hours, now) !== true) return false;
  if (state.flags.has('rated') && !state.scores[p.id]) return false;
  return true;
}

function filtered() {
  const now = new Date();
  return state.places.filter(p => visible(p, now));
}

function refresh() {
  const list = filtered();
  const src = map.getSource('places');
  if (src) {
    src.setData({
      type: 'FeatureCollection',
      features: list.map(p => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: [p.x, p.y] },
        properties: { id: p.id, n: p.n, k: p.k, r: state.scores[p.id] ? 1 : 0 },
      })),
    });
  }
  const total = state.places.length;
  $('#count').textContent = `${fmt(list.length)}${list.length === total ? '' : ' of ' + fmt(total)}${state.foodLoaded ? '' : ' · loading food'}`;
  renderList(list);
  performance.mark(src ? 'bkk:pins' : 'bkk:data'); // load timing, read via performance.getEntriesByType('mark')
}

// Data starts downloading now, in parallel with the basemap; layers attach once the style is ready.
const firstData = Promise.all([loadRows('work'), loadScores()]).then(() => refresh());
const foodData = firstData.then(() => loadRows('food')).then(() => { state.foodLoaded = true; });

// ---------- map layers ----------
map.on('load', async () => {
  map.addSource('places', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterMaxZoom: 15, clusterRadius: 44 });
  map.addSource('sel', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'clusters', type: 'circle', source: 'places', filter: ['has', 'point_count'], paint: {
    'circle-color': '#ffffff', 'circle-stroke-color': '#20201d', 'circle-stroke-width': 1.5,
    'circle-radius': ['step', ['get', 'point_count'], 13, 50, 17, 500, 22, 5000, 28] } });
  map.addLayer({ id: 'cluster-n', type: 'symbol', source: 'places', filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 11, 'text-font': ['Noto Sans Regular'] },
    paint: { 'text-color': '#20201d' } });
  map.addLayer({ id: 'pins', type: 'circle', source: 'places', filter: ['!', ['has', 'point_count']], paint: {
    'circle-color': ['match', ['get', 'k'], 'cafe', '#20201d', 'coworking', '#f59e0b', 'library', '#ffffff', '#8f918a'],
    'circle-stroke-color': ['match', ['get', 'k'], 'library', '#20201d', '#ffffff'],
    'circle-stroke-width': ['case', ['==', ['get', 'r'], 1], 3, ['==', ['get', 'k'], 'library'], 2, 1],
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, ['match', ['get', 'k'], 'restaurant', 3.5, 5], 18, ['match', ['get', 'k'], 'restaurant', 6, 8]] } });
  map.addLayer({ id: 'pin-names', type: 'symbol', source: 'places', minzoom: 16, filter: ['!', ['has', 'point_count']],
    layout: { 'text-field': ['get', 'n'], 'text-size': 11, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-optional': true, 'text-font': ['Noto Sans Regular'] },
    paint: { 'text-color': '#575951', 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 } });
  map.addLayer({ id: 'sel', type: 'circle', source: 'sel', paint: {
    'circle-radius': 11, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#20201d', 'circle-stroke-width': 2.5 } });

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
  map.on('moveend', () => renderList());

  await firstData; refresh(); openFromUrl();
  await foodData; refresh(); openFromUrl();
});

// ---------- list (desktop) ----------
let lastList = [];
function renderList(list) {
  if (list) lastList = list;
  if (!window.matchMedia('(min-width: 900px)').matches) return;
  const b = map.getBounds(), c = map.getCenter();
  const k = Math.cos(c.lat * Math.PI / 180);
  const inView = lastList.filter(p => b.contains([p.x, p.y]))
    .map(p => [(((p.x - c.lng) * k) ** 2 + (p.y - c.lat) ** 2) * (p.k === 'restaurant' ? 9 : 1), p]) // work spots rank ~3x closer
    .sort((a, z) => a[0] - z[0]).slice(0, 60).map(a => a[1]);
  $('#list').innerHTML = inView.length
    ? inView.map(p => row(p)).join('')
    : '<li class="meta">Nothing here with these filters. Zoom out or clear a filter.</li>';
}

function row(p) {
  const s = state.scores[p.id];
  return `<li data-id="${esc(p.id)}" role="option"><i class="dot ${p.k}"></i><span class="nm">${esc(p.n)}</span>` +
    `<span class="meta">${p.flags & F.WIFI ? 'Wi-Fi · ' : ''}${s ? '★ ' + s.n : KIND_LABEL[p.k]}</span></li>`;
}

$('#list').addEventListener('click', e => {
  const li = e.target.closest('li[data-id]');
  if (li) select(state.byId.get(li.dataset.id), true);
});

// ---------- search ----------
let hitIdx = -1;
$('#q').addEventListener('input', () => {
  const q = $('#q').value.trim().toLowerCase();
  const hits = $('#hits');
  if (q.length < 2) { hits.hidden = true; return; }
  const starts = [], has = [];
  for (const p of state.places) {
    if (p.low.startsWith(q)) starts.push(p); else if (p.low.includes(q)) has.push(p);
    if (starts.length >= 8) break;
  }
  const c = map.getCenter();
  const near = (a, z) => (Math.abs(a.x - c.lng) + Math.abs(a.y - c.lat)) - (Math.abs(z.x - c.lng) + Math.abs(z.y - c.lat));
  const top = [...starts.sort(near), ...has.sort(near)].slice(0, 8);
  hitIdx = -1;
  hits.innerHTML = top.length ? top.map(row).join('') : '<li class="meta">No match. Try the Thai or English name.</li>';
  hits.hidden = false;
});
$('#q').addEventListener('keydown', e => {
  const items = [...$('#hits').querySelectorAll('li[data-id]')];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    hitIdx = Math.max(0, Math.min(items.length - 1, hitIdx + (e.key === 'ArrowDown' ? 1 : -1)));
    items.forEach((li, i) => li.setAttribute('aria-selected', i === hitIdx));
  } else if (e.key === 'Enter' && items.length) {
    select(state.byId.get(items[Math.max(0, hitIdx)].dataset.id), true);
  } else if (e.key === 'Escape') { $('#hits').hidden = true; }
});
$('#hits').addEventListener('click', e => {
  const li = e.target.closest('li[data-id]');
  if (li) select(state.byId.get(li.dataset.id), true);
});
document.addEventListener('click', e => { if (!e.target.closest('.bar')) $('#hits').hidden = true; });

// ---------- filters ----------
$('.chips').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const on = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', on);
  const set = b.dataset.kind ? state.kinds : state.flags;
  const key = b.dataset.kind || b.dataset.flag;
  on ? set.add(key) : set.delete(key);
  refresh();
});

// ---------- place sheet ----------
const bars = v => { const f = Math.round(v); return `<span class="bars" aria-hidden="true"><b>${'●'.repeat(f)}</b><s>${'●'.repeat(3 - f)}</s></span>`; };

async function select(p, fly) {
  if (!p) return;
  state.selected = p;
  $('#hits').hidden = true;
  map.getSource('sel')?.setData({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.x, p.y] }, properties: {} });
  const u = new URL(location.href); u.searchParams.set('p', p.id); history.replaceState(null, '', u);
  renderSheet(p, {});
  // keep the pin visible above the phone sheet
  const phone = !window.matchMedia('(min-width: 900px)').matches;
  const padding = { top: 40, bottom: phone ? $('#sheet').offsetHeight + 24 : 40, left: 40, right: 40 };
  map.flyTo({ center: [p.x, p.y], zoom: fly ? Math.max(map.getZoom(), 16.5) : map.getZoom(), padding, speed: 1.6 });
  renderSheet(p, await cellDetail(p));
}

function renderSheet(p, d) {
  if (state.selected !== p) return;
  const s = state.scores[p.id];
  const open = window.isOpen(p.hours, new Date());
  const wifi = p.flags & F.WIFI ? 'Wi-Fi listed' : p.flags & F.NOWIFI ? 'No Wi-Fi listed' : null;
  const facts = [
    p.hours && ['◷', `${open === true ? '<b>Open now</b> · ' : open === false ? 'Closed now · ' : ''}${esc(p.hours)}`],
    wifi && ['≋', wifi],
    p.flags & F.OUTDOOR && ['☀', 'Outdoor seating'],
    d.c && ['·', esc(d.c.replace(/[_;]/g, ' '))],
    d.addr && ['⌖', esc(d.addr)],
    d.web && ['↗', `<a href="${esc(d.web)}" target="_blank" rel="noopener nofollow">${esc(d.web.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>`],
    d.social && ['↗', `<a href="${esc(d.social)}" target="_blank" rel="noopener nofollow">${esc(d.social.replace(/^https?:\/\/(www\.)?/, ''))}</a>`],
    d.tel && ['☎', `<a href="tel:${esc(d.tel.replace(/\s/g, ''))}">${esc(d.tel)}</a>`],
  ].filter(Boolean);
  const src = p.flags & F.OVERTURE
    ? `Overture Maps${d.ds?.length ? ' via ' + esc(d.ds.join(', ')) : ''}${d.conf ? ` · confidence ${d.conf}` : ''}`
    : `OpenStreetMap · <a href="https://www.openstreetmap.org/${{ n: 'node', w: 'way', r: 'relation' }[p.id[0]]}/${p.id.slice(1)}" target="_blank" rel="noopener">fix on OSM</a>`;

  const sheet = $('#sheet');
  sheet.hidden = false;
  sheet.innerHTML = `
    <header>
      <h1>${esc(p.n)}${d.th ? `<span class="th" lang="th">${esc(d.th)}</span>` : ''}</h1>
      <button class="close" aria-label="Close">×</button>
    </header>
    <div class="kindline"><i class="dot ${p.k}"></i>${KIND_LABEL[p.k]}</div>
    ${facts.length ? `<ul class="facts">${facts.map(([sym, t]) => `<li class="sym" aria-hidden="true">${sym}</li><li>${t}</li>`).join('')}</ul>` : ''}
    <section class="scores">
      <h2 class="micro">${s ? `Work score · ${s.n} ${s.n === 1 ? 'rating' : 'ratings'} · last ${esc(s.last)}` : 'Work score · not rated yet'}</h2>
      ${s ? `<table>${METRICS.map(([k, label]) => `<tr><td>${label}</td><td>${bars(s[k])}</td><td>${s[k].toFixed(1)} / 3</td></tr>`).join('')}</table>` : ''}
      <button type="button" class="send rate-open">${s ? 'Add your rating' : 'Be the first to rate'}</button>
      <form class="rate" aria-label="Rate this place" hidden>
        ${METRICS.map(([k, label, opts]) => `<span>${label}</span><div class="seg" data-k="${k}" role="group" aria-label="${label}">${opts.map((o, i) => `<button type="button" data-v="${i + 1}" aria-pressed="false">${o}</button>`).join('')}</div>`).join('')}
        <button class="send" type="submit" disabled>Save rating</button>
        <p class="note" role="status"></p>
      </form>
    </section>
    <nav class="links">
      <a href="https://www.google.com/maps/dir/?api=1&destination=${p.y},${p.x}" target="_blank" rel="noopener">Directions</a>
      <button type="button" class="share">Share</button>
    </nav>
    <p class="src">Source: ${src}</p>`;

  const form = sheet.querySelector('.rate'), vote = {};
  sheet.querySelector('.close').onclick = closeSheet;
  sheet.querySelector('.rate-open').onclick = e => { e.target.hidden = true; form.hidden = false; form.querySelector('.seg button').focus(); };
  form.addEventListener('click', e => {
    const b = e.target.closest('.seg button');
    if (!b) return;
    const seg = b.parentElement;
    seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    vote[seg.dataset.k] = +b.dataset.v;
    form.querySelector('.send').disabled = METRICS.some(([k]) => !vote[k]);
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const note = form.querySelector('.note'), send = form.querySelector('.send');
    send.disabled = true; note.textContent = 'Saving…';
    try {
      const r = await fetch('/api/scores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ place: p.id, ...vote }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { note.textContent = body.error ? `Not saved: ${body.error}.` : `Not saved (${r.status}).`; send.disabled = false; return; }
      note.textContent = 'Saved. Thank you.';
      await loadScores(); refresh(); renderSheet(p, d);
      sheet.querySelector('.rate-open').textContent = 'Saved. Thank you. Rate again tomorrow';
      sheet.querySelector('.rate-open').disabled = true;
    } catch { note.textContent = 'Not saved: no connection.'; send.disabled = false; }
  });
  sheet.querySelector('.share').onclick = async () => {
    const url = location.href;
    if (navigator.share) { try { await navigator.share({ title: p.n, url }); } catch { /* cancelled */ } return; }
    await navigator.clipboard?.writeText(url);
    sheet.querySelector('.share').textContent = 'Link copied';
  };
}

function closeSheet() {
  state.selected = null;
  $('#sheet').hidden = true;
  map.getSource('sel')?.setData({ type: 'FeatureCollection', features: [] });
  const u = new URL(location.href); u.searchParams.delete('p'); history.replaceState(null, '', u);
  renderList();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden && document.activeElement !== $('#q')) closeSheet(); });

function openFromUrl() {
  const id = new URL(location.href).searchParams.get('p');
  if (id && !state.selected && state.byId.has(id)) select(state.byId.get(id), true);
}

$('#about').addEventListener('click', () => {
  state.selected = null;
  const sheet = $('#sheet');
  sheet.hidden = false;
  sheet.innerHTML = `<header><h1>About BKK Co.</h1><button class="close" aria-label="Close">×</button></header>
    <div class="about">${$('#about-tpl').innerHTML}</div>`;
  sheet.querySelector('.close').onclick = closeSheet;
});
