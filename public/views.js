// PLUB views: Nong Plub's guide, neighbourhood sheets, the passport, and "I've been here".
// Uses helpers from app.js (state, map, $, esc, fmt, select, openSheet, petals, dots, GGP, F, KIND_LABEL).
const TRAIT_SYM = { neutral: '○', leveler: '=', talk: '❝', access: '↦', regulars: '↺', low: '▁', playful: '✳', home: '⌂' };
const FEELINGS = ['Calm', 'Focused', 'Cozy', 'Buzzing', 'Social', 'Inspiring', 'Slow', 'Meh'];
const hoods = { list: [], bySlug: {}, ofId: new Map(), data: null };

const hoodsReady = fetch('data/hoods.json').then(r => r.json()).then(d => {
  hoods.data = d; hoods.list = d.hoods;
  for (const h of d.hoods) { hoods.bySlug[h.slug] = h; for (const id of h.ids) if (!hoods.ofId.has(id)) hoods.ofId.set(id, h); }
  drawHoods();
}).catch(() => {});

$('#guide').innerHTML = plub('wave', 34, '');

window.hoodOf = p => hoods.ofId.get(p.id);
window.hoodHits = q => hoods.list.filter(h => [h.name, h.th, h.for].some(s => s.toLowerCase().includes(q)))
  .map(h => `<li data-hood="${h.slug}" role="option"><span class="ring" aria-hidden="true"></span><span class="nm">${esc(h.name)} <span class="th" lang="th">${esc(h.th)}</span></span><span class="meta">for ${esc(h.for.toLowerCase())}</span></li>`).join('');
$('#hits').addEventListener('click', e => { const li = e.target.closest('li[data-hood]'); if (li) openHood(li.dataset.hood); });

// ---------- map: one 10-minute-walk ring per neighbourhood ----------
function ring(h, steps = 72) {
  const { y, x } = h.anchor, ky = h.radius / 111320, kx = ky / Math.cos(y * Math.PI / 180);
  const c = [];
  for (let i = 0; i <= steps; i++) { const a = i / steps * 2 * Math.PI; c.push([x + Math.cos(a) * kx, y + Math.sin(a) * ky]); }
  return c;
}
window.addHoodLayers = () => {
  map.addSource('hoods', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'hood-fill', type: 'fill', source: 'hoods', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': '#20201d', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.05, 15, 0.02] } });
  map.addLayer({ id: 'hood-line', type: 'line', source: 'hoods', filter: ['==', '$type', 'Polygon'], paint: { 'line-color': '#20201d', 'line-width': 1.5, 'line-dasharray': [3, 2] } });
  // labels go on top of the pins once those exist (see window.raiseHoodLabels)
  map.addLayer({ id: 'hood-label', type: 'symbol', source: 'hoods', filter: ['==', '$type', 'Point'], maxzoom: 16,
    layout: { 'text-field': ['step', ['zoom'], ['get', 'name'], 12.5, ['get', 'label']], 'text-size': 13, 'text-font': ['Noto Sans Bold'],
      'text-anchor': ['match', ['get', 'slug'], [...LABEL_BELOW], 'top', 'bottom'], 'text-allow-overlap': false, 'symbol-sort-key': 0 },
    paint: { 'text-color': '#20201d', 'text-halo-color': '#ffffff', 'text-halo-width': 2 } });
  map.on('click', 'hood-fill', e => {
    if (map.queryRenderedFeatures(e.point, { layers: PIN_LAYERS }).length) return; // a pin wins
    openHood(e.features[0].properties.slug);
  });
  map.on('click', 'hood-label', e => openHood(e.features[0].properties.slug));
  // finder results and café-hop routes: numbered amber stops, dashed straight legs
  map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'route-line', type: 'line', source: 'route', filter: ['==', '$type', 'LineString'], paint: { 'line-color': '#f59e0b', 'line-width': 3, 'line-dasharray': [2, 1.5] } });
  map.addLayer({ id: 'route-stop', type: 'circle', source: 'route', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 11, 'circle-color': '#f59e0b', 'circle-stroke-color': '#20201d', 'circle-stroke-width': 2 } });
  map.addLayer({ id: 'route-num', type: 'symbol', source: 'route', filter: ['==', '$type', 'Point'], layout: { 'text-field': ['get', 'n'], 'text-size': 12, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true }, paint: { 'text-color': '#20201d' } });
  drawHoods();
};
window.fitAllHoods = async () => {
  await hoodsReady;
  const pts = hoods.list.flatMap(h => ring(h, 8)), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: { top: 60, bottom: 40, left: 70, right: 70 }, animate: false });
};
const LABEL_BELOW = new Set(['charoenkrung']);
function drawHoods() {
  const src = map.getSource && map.getSource('hoods');
  if (!src || !hoods.list.length) return;
  src.setData({ type: 'FeatureCollection', features: hoods.list.flatMap(h => {
    // Charoen Krung's ring sits just south-west of Sam Yan's: its name goes under its ring so both stay readable
    const c = ring(h), top = LABEL_BELOW.has(h.slug) ? c.reduce((a, b) => (b[1] < a[1] ? b : a)) : c.reduce((a, b) => (b[1] > a[1] ? b : a));
    return [
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [c] }, properties: { slug: h.slug } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: top }, properties: { slug: h.slug, name: h.name, label: `${h.name} · ${h.for}` } },
    ];
  }) });
}

// ---------- small infographics ----------
function compBar(k) {
  const parts = [['cafe', 'Café'], ['coworking', 'Co-work'], ['library', 'Library'], ['restaurant', 'Food']];
  const total = parts.reduce((a, [key]) => a + k[key], 0) || 1;
  return `<div class="comp" role="img" aria-label="${parts.map(([key, l]) => `${k[key]} ${l}`).join(', ')}">
    ${parts.map(([key]) => `<i class="seg-${key}" style="flex:${k[key] / total}"></i>`).join('')}</div>
    <div class="comp-legend">${parts.map(([key, l]) => `<span><i class="dot ${key}"></i>${fmt(k[key])} ${l}</span>`).join('')}</div>`;
}

// every rail station in Bangkok as a tick, this neighbourhood's anchor as the long one
function strip(h) {
  const all = hoods.data.stationWork, max = all[all.length - 1], W = 300;
  const x = v => 6 + v / max * (W - 12);
  const med = hoods.data.stationMedian;
  return `<svg class="strip" viewBox="0 0 ${W} 40" role="img" aria-label="${h.stats.work} work spots; rank ${h.stats.stationRank} of ${h.stats.stations} stations; median ${med}">
    <line x1="6" y1="22" x2="${W - 6}" y2="22" stroke="#d5d7cf"/>
    ${all.map(v => `<line x1="${x(v)}" y1="17" x2="${x(v)}" y2="27" stroke="#a7a99f" stroke-width=".8"/>`).join('')}
    <line x1="${x(med)}" y1="12" x2="${x(med)}" y2="32" stroke="#575951" stroke-dasharray="2 2"/>
    <text x="${x(med)}" y="9" text-anchor="middle">median ${med}</text>
    <line x1="${x(h.stats.work)}" y1="6" x2="${x(h.stats.work)}" y2="36" stroke="#f59e0b" stroke-width="3"/>
    <text x="${Math.min(W - 20, x(h.stats.work))}" y="40" text-anchor="end">${h.stats.work}</text></svg>`;
}

function traitsRow(h) {
  const on = new Set(h.traits.map(t => t[0]));
  return `<ul class="traits">${Object.entries(hoods.data.traits).map(([k, label]) =>
    `<li class="${on.has(k) ? 'on' : ''}" title="${esc(label)}"><b aria-hidden="true">${TRAIT_SYM[k]}</b>${esc(label)}</li>`).join('')}</ul>`;
}

// ---------- neighbourhood sheet ----------
const moodOf = slug => Object.keys(MOODS).find(k => MOODS[k].hood === slug);
const POSE = { ari: 'sketch', samyan: 'cheer', charoenkrung: 'point', thonglo: 'wave' };
async function openHood(slug, jump) {
  await hoodsReady;
  const h = hoods.bySlug[slug];
  if (!h) return;
  state.selected = null;
  const u = new URL(location.href); u.searchParams.set('hood', slug); u.searchParams.delete('p'); history.replaceState(null, '', u);
  const been = h.ids.filter(id => state.visited.has(id)).length;
  const s = h.stats, workIds = h.ids.filter(id => { const p = state.byId.get(id); return p && p.k !== 'restaurant'; });
  const sheet = openSheet(`
    <header><h1>${esc(h.name)}<span class="th" lang="th">${esc(h.th)}</span></h1><button class="close" aria-label="Close">×</button></header>
    <div class="plub-say">${plub(POSE[slug] || 'wave', 104)}<p><span class="micro">Socially optimized for</span><b class="for">${esc(h.for)}</b><span class="th" lang="th">${esc(h.forTh)}</span><q>${esc(h.plub)}</q>${moodOf(slug) ? `<button class="linkish" data-mood="${moodOf(slug)}">◐ Find “${esc(h.for.toLowerCase())}” places citywide</button>` : ''}</p></div>
    <section class="hood-stats">
      <div class="stat"><span class="big">${fmt(s.work)}</span><span class="micro">work spots within ~10 min (800 m) of ${esc(h.anchorLabel)}</span></div>
      <div class="stat"><span class="big">#${s.stationRank}</span><span class="micro">${/^(BTS|MRT)/.test(h.anchorLabel) ? `of ${s.stations} rail stations` : `vs ${s.stations} rail-station circles`}</span></div>
      <div class="stat"><span class="big">✦${s.ggp}</span><span class="micro">average index</span></div>
      <div class="stat"><span class="big">${been}<small>/${fmt(workIds.length)}</small></span><span class="micro">✓ you've been</span></div>
      ${strip(h)}
      ${compBar(s.kinds)}
      <p class="micro data-note">≋ ${s.wifiTagged} list Wi-Fi · ◷ ${s.hoursKnown} list hours · ${fmt(Math.round(s.perKm2))} per km²</p>
    </section>
    <section><h2 class="micro">Plub's read · Oldenburg's traits, from the story below</h2>${traitsRow(h)}</section>
    <section class="story">${h.story.map(t => `<p>${esc(t)}</p>`).join('')}</section>
    <section><h2 class="micro">Plub's walk · co-working &amp; libraries first, then Wi-Fi, then ✦</h2>
      <ol class="walk">${h.walk.map((id, i) => { const p = state.byId.get(id); return p ? `<li data-id="${esc(id)}"><span class="stop">${i + 1}</span><span class="nm">${esc(p.n)}</span>${state.visited.has(id) ? '<b>✓</b>' : ''}<span class="idx">✦${p.idx}</span></li>` : ''; }).join('')}</ol>
    </section>
    <nav class="links"><button type="button" class="show-map">◎ Show on map</button><button type="button" class="share">Share</button></nav>
    <p class="src">Sources: ${h.sources.map(([t, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(t)}</a>`).join(' · ')}. Numbers computed from OpenStreetMap and Overture Maps places within ${h.radius} m of OSM ${esc(h.anchor.id)}.</p>`);
  sheet.querySelector('.walk').addEventListener('click', e => { const li = e.target.closest('li[data-id]'); if (li) select(state.byId.get(li.dataset.id), true); });
  const fit = how => {
    const c = ring(h), xs = c.map(p => p[0]), ys = c.map(p => p[1]);
    const padding = { top: 30, left: 30, right: 30, bottom: isPhone() ? $('#sheet').offsetHeight + 20 : 30 };
    map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding, animate: how !== 'jump' });
  };
  sheet.querySelector('.show-map').onclick = () => { closeSheet(); fit(); };
  sheet.querySelector('.share').onclick = async () => {
    if (navigator.share) { try { await navigator.share({ title: `${h.name} · PLUB`, url: location.href }); } catch { /* cancelled */ } return; }
    await navigator.clipboard?.writeText(location.href); sheet.querySelector('.share').textContent = 'Link copied';
  };
  fit(jump ? 'jump' : undefined);
}
window.openHood = openHood;

// how the index spreads across every place, with the four neighbourhood averages marked
function histogram(P) {
  const bins = new Array(20).fill(0);
  for (const p of P) bins[Math.min(19, Math.floor(p.idx / 5))]++;
  const max = Math.max(...bins), W = 300, H = 56, bw = W / 20;
  const marks = hoods.list.map(h => `<line x1="${h.stats.ggp / 100 * W}" y1="0" x2="${h.stats.ggp / 100 * W}" y2="${H}" stroke="#f59e0b" stroke-width="1.5"/>`).join('');
  return `<svg class="hist" viewBox="0 0 ${W} ${H + 12}" role="img" aria-label="Distribution of the Great Good Place index across ${P.length} places">
    ${bins.map((b, i) => `<rect x="${i * bw + 1}" y="${H - b / max * H}" width="${bw - 2}" height="${b / max * H}" fill="#a7a99f"/>`).join('')}
    ${marks}<line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="#20201d"/>
    <text x="0" y="${H + 11}">0</text><text x="${W / 2}" y="${H + 11}" text-anchor="middle">✦ index · amber = the four neighbourhoods</text><text x="${W}" y="${H + 11}" text-anchor="end">100</text></svg>`;
}

// ---------- the guide ----------
$('#guide').addEventListener('click', async () => {
  await hoodsReady;
  const d = hoods.data, P = state.places, n = P.length || 1;
  // what the bar shows: A/S/F are computed for every place; C is the share that is independent;
  // W and N are the share of places that carry any signal at all (the honest coverage gap)
  const cov = {
    A: [P.length, 'computed for all'], S: [P.length, 'computed for all'], F: [P.length, 'computed for all'],
    C: [P.filter(p => !(p.flags & F.CHAIN)).length, 'independent'],
    W: [P.filter(p => p.d[4] > 0).length, 'have a signal'], N: [P.filter(p => p.d[5] > 0).length, 'have a record'],
  };
  const why = {
    A: 'Jeffres et al. 2009: perceived access to third places predicts community quality of life',
    S: 'Adelfio et al. 2020: third places show up as clusters of social activity',
    C: 'Mehta & Bosson 2010: third places are personal and distinctive, not uniform',
    F: 'Adelfio et al. 2020: no single dataset is enough. ▲ Known counts how many list a place; it is not foot traffic',
    W: 'PLUB: places you can actually sit and work',
    N: 'Prestige, only where a public record says so',
  };
  const top = d.leaderboard.slice(0, 10), max = top[0].work, anchors = new Set(d.hoods.map(h => h.anchor.osmName));
  const sheet = openSheet(`
    <header><h1>Bangkok's Great Good Places<span class="th">Placemaking Laboratory Urban Bureau</span></h1><button class="close" aria-label="Close">×</button></header>
    <div class="plub-say">${plub('map', 104)}<p><q>Bangkok has ${fmt(P.length)} places to sit down. A great good place is the one you keep coming back to. Pick a neighbourhood, I'll walk you through it.</q></p></div>
    <section><h2 class="micro">The line · four neighbourhoods, live now</h2>
      <ol class="line">${d.hoods.map(h => { const been = h.ids.filter(id => state.visited.has(id)).length; return `<li data-hood="${h.slug}">
        <span class="stop ${been ? 'stamped' : ''}" aria-hidden="true">${been ? '✓' : ''}</span>
        <span class="nm"><b>${esc(h.name)}</b> <span class="th" lang="th">${esc(h.th)}</span><span class="micro">for ${esc(h.for.toLowerCase())}</span></span>
        <span class="meta">${fmt(h.stats.work)} spots · #${h.stats.stationRank}${moodOf(h.slug) ? `<br><button class="linkish" data-mood="${moodOf(h.slug)}">◐ citywide</button>` : ''}</span></li>`; }).join('')}</ol>
    </section>
    <section><h2 class="micro">Most work spots within ~800 m · ${d.stations} rail stations</h2>
      <ol class="board">${top.map(s => `<li class="${anchors.has(s.th) ? 'hl' : ''}"><span class="nm">${s.rank}. ${esc(s.name)}</span><span class="barwrap"><i style="width:${s.work / max * 100}%"></i></span><span class="meta">${s.work}</span></li>`).join('')}</ol>
      <p class="micro data-note">Median station: ${d.stationMedian}. Work spot = café, co-working or library.</p>
    </section>
    <section><h2 class="micro">How every place is scored</h2>
      ${histogram(P)}
      <table class="ggp-table how">${GGP.map(([k, sym, label, what], i) => `<tr><td class="sym">${sym}</td><td><b>${label}</b> <span class="what">${what}</span></td><td class="raw"><span class="cov" title="${fmt(cov[k][0])} of ${fmt(P.length)} places"><i style="width:${Math.max(1, cov[k][0] / n * 100)}%"></i></span>${cov[k][0] / n < 0.01 ? '<1' : Math.round(cov[k][0] / n * 100)}% ${cov[k][1]}</td></tr>
        <tr class="why"><td></td><td colspan="2">${esc(why[k])}</td></tr>`).join('')}</table>
      <p class="data-note">✦ index = average of ↦ ⁘ ◎ (each ranked against all ${fmt(P.length)} places) and ◇ (three steps: chain, small chain, independent), 0–100. ≋ Work and ✦ Notable are shown but kept out: too few places carry them yet to be fair. Walk times are straight-line estimates.</p>
    </section>
    <section class="about"><h2 class="micro">Sources</h2>
      <p class="src">Ray Oldenburg, <i>The Great Good Place</i> (1989). Jeffres, Bracken, Jian & Casey, "The Impact of Third Places on Community Quality of Life", <i>Applied Research in Quality of Life</i> 4 (2009). Mehta & Bosson, "Third Places and the Social Life of Streets", <i>Environment and Behavior</i> 42:6 (2010). Adelfio et al., "Social Activity in Gothenburg's Intermediate City: Mapping Third Places through Social Media Data", <i>Applied Spatial Analysis and Policy</i> (2020).</p>
      <p class="src">Places: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (ODbL, 24 Oct 2026) and <a href="https://overturemaps.org" target="_blank" rel="noopener">Overture Maps</a> (CDLA-P-2.0, 2026-10-21). Visitor ratings (Wi-Fi, outlets, quiet, laptop) come from visitors; ≋ Work comes from map tags. Nobody has paid to appear here. A working pilot: if a pin is wrong, fix it on OpenStreetMap. <a href="${osmNote(map.getCenter().lat, map.getCenter().lng)}" target="_blank" rel="noopener">Missing a place? Leave a note on OpenStreetMap</a>, and it appears here after mappers add it and the map is rebuilt. Hand pins (✎) mark places someone has visited that no open dataset has yet.</p>
    </section>`);
  sheet.querySelector('.line').addEventListener('click', e => { if (e.target.closest('[data-mood]')) return; const li = e.target.closest('li[data-hood]'); if (li) openHood(li.dataset.hood); });
});

// ---------- passport ----------
const urls = [];
const photoUrl = blob => { const u = URL.createObjectURL(blob); urls.push(u); return u; };
window.momentHtml = v => `<li class="moment" data-key="${v.key}">
  <div class="moment-head"><span>${new Date(v.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
  <span class="stars" aria-label="${v.stars || 0} of 5">${'★'.repeat(v.stars || 0)}<s>${'★'.repeat(5 - (v.stars || 0))}</s></span>
  <button class="del" aria-label="Delete this moment">×</button></div>
  ${v.words?.length ? `<div class="words">${v.words.map(w => `<span>${esc(w)}</span>`).join('')}</div>` : ''}
  ${v.note ? `<p>${esc(v.note)}</p>` : ''}
  ${v.photos?.length ? `<div class="thumbs">${v.photos.map(b => `<a href="${photoUrl(b)}" target="_blank" rel="noopener"><img src="${urls[urls.length - 1]}" alt="Photo from this visit"></a>`).join('')}</div>` : ''}</li>`;

window.bindMoments = root => root.querySelectorAll('.moment .del').forEach(b => b.addEventListener('click', async () => {
  if (!confirm('Delete this moment and its photos from this device?')) return;
  await Passport.remove(+b.closest('.moment').dataset.key);
  b.closest('.moment').remove();
  await loadVisits(); refresh();
}));

window.beenForm = (p, btn, done) => {
  const form = document.createElement('form');
  form.className = 'been-form';
  form.innerHTML = `
    <div class="stars-pick" role="group" aria-label="How was it">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-s="${i}" aria-label="${i} of 5" aria-pressed="false">★</button>`).join('')}</div>
    <div class="feel" role="group" aria-label="It felt">${FEELINGS.map(w => `<button type="button" aria-pressed="false">${w}</button>`).join('')}</div>
    <textarea rows="2" maxlength="600" placeholder="What do you want to remember?"></textarea>
    <label class="photo-pick">＋ Photos<input type="file" accept="image/*" multiple hidden></label><span class="micro picked"></span>
    <details class="work-q"><summary>For people who work here (optional, shared)</summary>
      <div class="rate">${SCORES.map(([k, label, opts]) => `<span>${label}</span><div class="seg" data-k="${k}" role="group" aria-label="${label}">${opts.map((o, i) => `<button type="button" data-v="${i + 1}" aria-pressed="false">${o}</button>`).join('')}</div>`).join('')}</div>
    </details>
    <button class="send" type="submit">Save to passport</button>
    <p class="micro note">Stars, words, note and photos stay on this device. The four work answers, if all given, are shared anonymously.</p>`;
  btn.replaceWith(form);
  let stars = 0;
  form.querySelector('.stars-pick').addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    stars = +b.dataset.s;
    form.querySelectorAll('[data-s]').forEach(x => x.setAttribute('aria-pressed', +x.dataset.s <= stars));
  });
  form.querySelector('.feel').addEventListener('click', e => {
    const b = e.target.closest('button'); if (b) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
  });
  const vote = {};
  form.querySelector('.rate').addEventListener('click', e => {
    const b = e.target.closest('.seg button'); if (!b) return;
    b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    vote[b.parentElement.dataset.k] = +b.dataset.v;
  });
  const input = form.querySelector('input[type=file]');
  input.addEventListener('change', () => { form.querySelector('.picked').textContent = input.files.length ? `${Math.min(4, input.files.length)} photo(s)` : ''; });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const send = form.querySelector('.send'); send.disabled = true; send.textContent = 'Saving…';
    try {
      await Passport.add({ place: p.id, name: p.n, kind: p.k, y: p.y, x: p.x, stars,
        words: [...form.querySelectorAll('.feel [aria-pressed="true"]')].map(b => b.textContent),
        note: form.querySelector('textarea').value, files: input.files });
      if (SCORES.every(([k]) => vote[k])) {
        const r = await fetch('/api/scores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ place: p.id, ...vote }) }).catch(() => null);
        if (r?.ok) await loadScores(); // a refused rating (e.g. already rated today) never blocks the passport entry
      }
      await loadVisits(); refresh(); done();
    } catch (err) { send.disabled = false; send.textContent = 'Not saved. Try again'; console.error(err); }
  });
};

$('#passport').addEventListener('click', openPassport);
async function openPassport() {
  await hoodsReady;
  const visits = (await Passport.all().catch(() => [])).sort((a, b) => b.at.localeCompare(a.at));
  const places = new Set(visits.map(v => v.place));
  const stamped = hoods.list.filter(h => h.ids.some(id => places.has(id)));
  const sheet = openSheet(`
    <header><h1>Your passport</h1><button class="close" aria-label="Close">×</button></header>
    <div class="plub-say">${plub('stamp', 104)}<p><q>${visits.length ? `${places.size} ${places.size === 1 ? 'place' : 'places'}, ${stamped.length} of ${hoods.list.length} neighbourhoods stamped. Keep going.` : 'Nothing stamped yet. Open any place and tap "I\'ve been here".'}</q></p></div>
    <section><h2 class="micro">Neighbourhood stamps</h2>
      <ul class="stamps">${hoods.list.map(h => { const n = h.ids.filter(id => places.has(id)).length; return `<li data-hood="${h.slug}" class="${n ? 'on' : ''}"><span class="stamp">${n ? '✓' : ''}<b>${esc(h.name)}</b><span class="th" lang="th">${esc(h.th)}</span></span><span class="micro">${n} been</span></li>`; }).join('')}</ul>
    </section>
    <section><h2 class="micro">Moments · ${visits.length}</h2>
      ${visits.length ? `<ul class="moments">${visits.map(v => `<li class="moment-place" data-id="${esc(v.place)}"><i class="dot ${esc(v.kind)}"></i><b>${esc(v.name)}</b></li>${momentHtml(v)}`).join('')}</ul>` : '<p class="micro">Your visits, impressions and photos will collect here.</p>'}
    </section>
    <nav class="links">
      <button type="button" class="card">⇪ Share stamp card</button>
      <button type="button" class="export">↓ Export backup</button>
      <label class="importer">↑ Import<input type="file" accept="application/json" hidden></label>
    </nav>
    <p class="src">Saved on this device only, never uploaded. Export a backup before clearing your browser or changing phones.</p>`);
  sheet.querySelector('.stamps').addEventListener('click', e => { const li = e.target.closest('[data-hood]'); if (li) openHood(li.dataset.hood); });
  sheet.querySelectorAll('.moment-place').forEach(li => li.addEventListener('click', () => select(state.byId.get(li.dataset.id), true)));
  bindMoments(sheet);
  sheet.querySelector('.card').onclick = async e => {
    const blob = await stampCard(places);
    const file = new File([blob], 'plub-stamps.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'My PLUB stamps', url: location.origin }); } catch { /* cancelled */ } return; }
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'plub-stamps.png' });
    a.click(); e.target.textContent = '⇪ Card saved';
  };
  sheet.querySelector('.export').onclick = async e => { const n = await Passport.exportFile(); e.target.textContent = `↓ Exported ${n}`; };
  sheet.querySelector('.importer input').onchange = async e => {
    try { const n = await Passport.importFile(e.target.files[0]); await loadVisits(); refresh(); openPassport(); alert(`${n} moments imported.`); }
    catch (err) { alert(err.message); }
  };
}

// A 1080×1350 card (portrait, phone-share size): Plub, four stamps, the count. Drawn locally; nothing uploads.
async function stampCard(places) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  await document.fonts.ready;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#20201d'; g.font = '600 64px Jost, Prompt, sans-serif'; g.fillText('PLUB', 80, 140);
  g.fillStyle = '#575951'; g.font = '400 30px Jost, Prompt, sans-serif'; g.fillText('Placemaking Laboratory Urban Bureau · Bangkok', 80, 190);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(plub('stamp', 300, 'Nong Plub'));
  await img.decode().catch(() => {});
  if (img.naturalWidth) g.drawImage(img, W - 380, 40, 300, 350);
  g.strokeStyle = '#20201d'; g.lineWidth = 2; g.beginPath(); g.moveTo(80, 390); g.lineTo(W - 80, 390); g.stroke();
  hoods.list.forEach((h, i) => {
    const n = h.ids.filter(id => places.has(id)).length;
    const cx = 80 + 230 + (i % 2) * 460, cy = 560 + Math.floor(i / 2) * 360, r = 150;
    g.save(); g.translate(cx, cy); if (n) g.rotate(-0.1);
    g.beginPath(); g.arc(0, 0, r, 0, 2 * Math.PI);
    if (n) { g.fillStyle = '#fff4dc'; g.fill(); g.setLineDash([]); g.strokeStyle = '#20201d'; g.lineWidth = 6; }
    else { g.setLineDash([14, 12]); g.strokeStyle = '#d5d7cf'; g.lineWidth = 4; }
    g.stroke(); g.setLineDash([]);
    g.textAlign = 'center'; g.fillStyle = n ? '#20201d' : '#a7a99f';
    let fs = 44; do { g.font = `600 ${fs}px Jost, Prompt, sans-serif`; } while (g.measureText(h.name).width > 2 * r - 40 && --fs > 20);
    g.fillText(h.name, 0, n ? 10 : 0);
    g.font = '400 30px Prompt, Jost, sans-serif'; g.fillText(h.th, 0, n ? 52 : 44);
    if (n) { g.font = '600 52px Jost, sans-serif'; g.fillStyle = '#f59e0b'; g.fillText('✓', 0, -50); g.fillStyle = '#20201d'; g.font = '400 28px Jost, sans-serif'; g.fillText(`${n} been`, 0, 98); }
    g.restore();
  });
  g.textAlign = 'left'; g.fillStyle = '#20201d'; g.font = '500 40px Jost, Prompt, sans-serif';
  g.fillText(`${places.size} great good ${places.size === 1 ? 'place' : 'places'} · ${hoods.list.filter(h => h.ids.some(id => places.has(id))).length} of ${hoods.list.length} neighbourhoods`, 80, H - 120);
  g.fillStyle = '#575951'; g.font = '400 30px Jost, sans-serif'; g.fillText('co.nonarkara.org', 80, H - 70);
  return new Promise(ok => c.toBlob(ok, 'image/png'));
}

// ---------- shared: highlight a set of places on the map, optionally as a numbered walking route ----------
function showRoute(stops, line) {
  const src = map.getSource('route');
  if (!src) return;
  src.setData({ type: 'FeatureCollection', features: [
    ...(line && stops.length > 1 ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: stops.map(p => [p.x, p.y]) }, properties: {} }] : []),
    ...stops.map((p, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.x, p.y] }, properties: { n: String(i + 1) } })),
  ] });
  if (!stops.length) return;
  const xs = stops.map(p => p.x), ys = stops.map(p => p.y);
  map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]],
    { padding: { top: 50, left: 50, right: 50, bottom: isPhone() ? $('#sheet').offsetHeight + 30 : 50 }, maxZoom: 16 });
}
window.clearRoute = () => showRoute([]);
const gmaps = (p, mode) => `https://www.google.com/maps/dir/?api=1&destination=${p.y},${p.x}&travelmode=${mode}`;
const amaps = (p, mode) => `https://maps.apple.com/?daddr=${p.y},${p.x}&dirflg=${mode === 'driving' ? 'd' : 'w'}`;
const near = (a, b) => metres(a, b);

// ---------- Near me now: a few places that fit what you need, with directions ----------
const NEEDS = [
  ['wifi', '≋ Wi-Fi', p => (p.flags & F.WIFI) || (state.scores[p.id]?.wifi || 0) >= 2],
  ['park', 'P Parking', p => p.flags & F.PARK],
  ['calm', '◡ Calm', p => (state.scores[p.id]?.quiet || 0) >= 2.5],
  // what we can actually know about coffee: an independent café, or a visit that noted good coffee
  ['coffee', '☕\uFE0E Coffee', p => (p.k === 'cafe' && !(p.flags & F.CHAIN)) || (p.flags & F.COFFEE)],
];
const nowState = { range: 'drive', needs: new Set(['wifi', 'park', 'calm', 'coffee']), origin: null, from: '' };

async function locate() {
  if (!navigator.geolocation) return null;
  return new Promise(ok => navigator.geolocation.getCurrentPosition(
    pos => ok({ y: pos.coords.latitude, x: pos.coords.longitude }), () => ok(null), { timeout: 6000, maximumAge: 60000 }));
}

async function openNow() {
  const sheet = openSheet(`<header><span class="mini-plub">${plub('point', 36, '')}</span><h1>Near me now</h1><button class="close" aria-label="Close">×</button></header>
    <div class="now-ctl">
      <div class="seg range" role="group" aria-label="How far">
        <button data-range="walk" aria-pressed="${nowState.range === 'walk'}">Walk · ~10 min</button>
        <button data-range="drive" aria-pressed="${nowState.range === 'drive'}">Drive · ~5 min</button>
      </div>
      <div class="feel needs" role="group" aria-label="I need">${NEEDS.map(([k, l]) => `<button data-need="${k}" aria-pressed="${nowState.needs.has(k)}">${l}</button>`).join('')}</div>
    </div>
    <p class="micro now-from">Finding you…</p>
    <ol class="now-list"></ol>
    <p class="src">✓ = known from map data, a visit or visitor ratings · ? = not known yet, so check before you go. P ✓ = a mapped car park within 150 m. ☕ Coffee ✓ = an independent café, or a visit that noted good coffee. Walk ≈ 800 m and drive ≈ 2 km are straight lines; neither crosses the Chao Phraya. Work spots only, never one listed as closed now.</p>`);
  sheet.querySelector('.range').addEventListener('click', e => { const b = e.target.closest('[data-range]'); if (!b) return; nowState.range = b.dataset.range; sheet.querySelectorAll('[data-range]').forEach(x => x.setAttribute('aria-pressed', x === b)); renderNow(); });
  sheet.querySelector('.needs').addEventListener('click', e => { const b = e.target.closest('[data-need]'); if (!b) return; const k = b.dataset.need; nowState.needs.has(k) ? nowState.needs.delete(k) : nowState.needs.add(k); b.setAttribute('aria-pressed', nowState.needs.has(k)); renderNow(); });
  const here = await locate();
  const c = map.getCenter();
  nowState.origin = here || { y: c.lat, x: c.lng };
  nowState.from = here ? 'From where you are' : 'From the middle of the map (location is off — move the map to your area)';
  renderNow();
}
window.openNow = openNow;

async function renderNow() {
  const sheet = $('#sheet'), list = sheet.querySelector('.now-list');
  if (!list || !nowState.origin) return;
  const o = nowState.origin, max = nowState.range === 'walk' ? 800 : 2000, mode = nowState.range === 'walk' ? 'walking' : 'driving';
  const now = new Date();
  const picks = state.places
    .filter(p => p.k !== 'restaurant' && window.isOpen(p.hours, now) !== false)
    .map(p => ({ p, d: near(p, o) })).filter(r => r.d <= max && !crossesRiver(o, r.p)) // bridges are few: same bank only
    .map(r => {
      const met = NEEDS.filter(([k]) => nowState.needs.has(k)).map(([k, l, test]) => [k, l, !!test(r.p)]);
      // what you asked for counts most; the Great Good Place index breaks ties; distance costs a little
      return { ...r, met, score: met.filter(m => m[2]).length * 40 + r.p.idx - r.d / (nowState.range === 'walk' ? 40 : 100) };
    })
    .sort((a, b) => b.score - a.score).slice(0, 5);
  const details = await Promise.all(picks.map(r => cellDetail(r.p))); // measured car-park distance lives here
  sheet.querySelector('.now-from').textContent = `${nowState.from} · ${picks.length ? 'top ' + picks.length : 'nothing within range — try the other distance'}`;
  list.innerHTML = picks.map(({ p, d, met }, i) => {
    const park = details[i].m?.park;
    const dist = nowState.range === 'walk' ? `~${Math.max(1, Math.round(d / 80))} min walk` : `${(d / 1000).toFixed(1)} km straight line`;
    return `<li data-id="${esc(p.id)}"><span class="stop">${i + 1}</span><div class="now-body">
      <button class="linkish nm" data-open="${esc(p.id)}">${esc(p.n)}</button>
      <span class="micro">${KIND_LABEL[p.k]} · ${dist} · ✦${p.idx}</span>
      <span class="needs-met">${met.map(([k, l, ok]) => k === 'park'
        ? (ok ? `<span class="ok">✓ P ${Math.round(park / 10) * 10} m</span>` : `<span class="unk" title="${park != null ? `nearest mapped car park ${Math.round(park / 10) * 10} m` : 'no car park mapped nearby'}">? P</span>`)
        : `<span class="${ok ? 'ok' : 'unk'}">${ok ? '✓' : '?'} ${l.split(' ').slice(1).join(' ')}</span>`).join('')}</span>
      <span class="go"><a href="${gmaps(p, mode)}" target="_blank" rel="noopener">Google Maps ↗</a><a href="${amaps(p, mode)}" target="_blank" rel="noopener">Apple Maps ↗</a></span>
    </div></li>`;
  }).join('');
  list.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => select(state.byId.get(b.dataset.open), true)));
  showRoute(picks.map(r => r.p), false);
}

// The Chao Phraya (OSM line): a leg that crosses it needs a ferry or a bridge, so walking legs never do.
let river = [];
fetch('data/barriers.json').then(r => r.json()).then(d => { river = d.lines.flatMap(l => l.slice(1).map((p, i) => [l[i], p])); }).catch(() => {});
function crossesRiver(a, b) {
  const ccw = (p, q, r) => (r[1] - p[1]) * (q[0] - p[0]) > (q[1] - p[1]) * (r[0] - p[0]);
  const A = [a.x, a.y], B = [b.x, b.y];
  return river.some(([C, D]) => ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D));
}

// ---------- Café hop: a walkable day through the best independent cafés ----------
const hopState = { start: null };
function planHop(start) {
  const today11 = new Date(); today11.setHours(11, 0, 0, 0);
  const pool = state.places.filter(p => p.k === 'cafe' && !(p.flags & F.CHAIN) && p.idx >= 70 &&
    window.isOpen(p.hours, today11) !== false && near(p, start) <= 1500 && !crossesRiver(start, p));
  const stops = [];
  let here = start;
  for (let i = 0; i < 5; i++) {
    // each hop: 250-800 m on foot (first one within 500 m of the start), best index wins, distance costs a little
    const lo = i ? 250 : 0, hi = i ? 800 : 500;
    const next = pool.filter(p => !stops.includes(p) && stops.every(s => near(s, p) >= 250))
      .map(p => ({ p, d: near(p, here) })).filter(r => r.d >= lo && r.d <= hi && !crossesRiver(here, r.p))
      .sort((a, b) => (b.p.idx - b.d / 25) - (a.p.idx - a.d / 25))[0];
    if (!next) break;
    stops.push(next.p); here = next.p;
  }
  return stops;
}

async function openHop(startKey) {
  await hoodsReady;
  const starts = hoods.list.map(h => [h.slug, h.name, { y: h.anchor.y, x: h.anchor.x }]);
  const c = map.getCenter();
  const at = /^@(-?\d+\.?\d*),(-?\d+\.?\d*)$/.exec(startKey || ''); // shared "here" hops carry their own point
  starts.push(['here', at ? 'Shared spot' : 'Here (map centre)', at ? { y: +at[1], x: +at[2] } : { y: c.lat, x: c.lng }]);
  hopState.start = at ? 'here' : startKey || hopState.start || 'charoenkrung';
  const [, label, origin] = starts.find(s => s[0] === hopState.start) || starts[0];
  const stops = planHop(origin);
  const legs = stops.slice(1).map((p, i) => near(stops[i], p));
  const km = legs.reduce((a, b) => a + b, 0) / 1000;
  const g = stops.length > 1 ? `https://www.google.com/maps/dir/?api=1&origin=${stops[0].y},${stops[0].x}&destination=${stops.at(-1).y},${stops.at(-1).x}&travelmode=walking${stops.length > 2 ? '&waypoints=' + stops.slice(1, -1).map(p => `${p.y},${p.x}`).join('%7C') : ''}` : '';
  const sheet = openSheet(`<header><h1>Café hop</h1><button class="close" aria-label="Close">×</button></header>
    <div class="plub-say">${plub('map', 88)}<p><q>Five independent cafés, a short walk apart. Pace yourself: one coffee, one pastry, one water.</q></p></div>
    <div class="feel hop-starts" role="group" aria-label="Start in">${starts.map(([k, l]) => `<button data-start="${k}" aria-pressed="${k === hopState.start}">${esc(l)}</button>`).join('')}</div>
    ${stops.length ? `<p class="micro">${esc(label)} · ${stops.length} stops · at least ${km.toFixed(1)} km on foot · ${Math.round(km * 1000 / 80)}+ min walking</p>
    <ol class="walk hop">${stops.map((p, i) => `<li data-id="${esc(p.id)}"><span class="stop">${i + 1}</span><span class="nm">${esc(p.n)}</span>${i ? `<span class="micro">${Math.round(legs[i - 1])} m</span>` : ''}<span class="idx">✦${p.idx}</span></li>`).join('')}</ol>
    <nav class="links">${g ? `<a href="${g}" target="_blank" rel="noopener">Walk it in Google Maps ↗</a>` : ''}<button type="button" class="share">Share</button></nav>`
    : '<p class="micro">Not enough independent cafés with a high index close together here. Try another start.</p>'}
    <p class="src">Picked from independent cafés with ✦ ≥ 70, not listed as closed at 11 am, each 250–800 m from the last. Legs never cross the Chao Phraya; they can cross big roads, so use crossings. Distances are straight lines, so the real walk is longer: Google Maps gives the path. Apple Maps takes one stop at a time: open a stop to get its link.</p>`);
  sheet.querySelector('.hop-starts').addEventListener('click', e => { const b = e.target.closest('[data-start]'); if (b) openHop(b.dataset.start); });
  sheet.querySelector('.hop')?.addEventListener('click', e => { const li = e.target.closest('li[data-id]'); if (li) select(state.byId.get(li.dataset.id), true); });
  sheet.querySelector('.share')?.addEventListener('click', async ev => {
    const url = `${location.origin}/?hop=${hopState.start === 'here' ? `@${origin.y.toFixed(4)},${origin.x.toFixed(4)}` : hopState.start}`;
    if (navigator.share) { try { await navigator.share({ title: `Café hop from ${label} · PLUB`, url }); } catch { /* cancelled */ } return; }
    await navigator.clipboard?.writeText(url); ev.target.textContent = 'Link copied';
  });
  showRoute(stops, true);
}
window.openHop = openHop;
