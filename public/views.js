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
  map.addLayer({ id: 'hood-label', type: 'symbol', source: 'hoods', filter: ['==', '$type', 'Point'], maxzoom: 16,
    layout: { 'text-field': ['get', 'label'], 'text-size': 13, 'text-font': ['Noto Sans Bold'], 'text-anchor': 'bottom', 'text-allow-overlap': true },
    paint: { 'text-color': '#20201d', 'text-halo-color': '#ffffff', 'text-halo-width': 2 } });
  map.on('click', 'hood-fill', e => {
    if (map.queryRenderedFeatures(e.point, { layers: ['pins', 'clusters'] }).length) return; // a pin wins
    openHood(e.features[0].properties.slug);
  });
  map.on('click', 'hood-label', e => openHood(e.features[0].properties.slug));
  drawHoods();
};
function drawHoods() {
  const src = map.getSource && map.getSource('hoods');
  if (!src || !hoods.list.length) return;
  src.setData({ type: 'FeatureCollection', features: hoods.list.flatMap(h => {
    const c = ring(h), top = c.reduce((a, b) => (b[1] > a[1] ? b : a));
    return [
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [c] }, properties: { slug: h.slug } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: top }, properties: { slug: h.slug, label: `${h.name} · ${h.for}` } },
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
    <div class="plub-say">${plub(POSE[slug] || 'wave', 104)}<p><span class="micro">Socially optimized for</span><b class="for">${esc(h.for)}</b><span class="th" lang="th">${esc(h.forTh)}</span><q>${esc(h.plub)}</q></p></div>
    <section class="hood-stats">
      <div class="stat"><span class="big">${fmt(s.work)}</span><span class="micro">work spots within a 10-min walk of ${esc(h.anchorLabel)}</span></div>
      <div class="stat"><span class="big">#${s.stationRank}</span><span class="micro">of ${s.stations} rail stations</span></div>
      <div class="stat"><span class="big">✦${s.ggp}</span><span class="micro">average index</span></div>
      <div class="stat"><span class="big">${been}<small>/${fmt(workIds.length)}</small></span><span class="micro">✓ you've been</span></div>
      ${strip(h)}
      ${compBar(s.kinds)}
      <p class="micro data-note">≋ ${s.wifiTagged} list Wi-Fi · ◷ ${s.hoursKnown} list hours · ${fmt(Math.round(s.perKm2))} per km²</p>
    </section>
    <section><h2 class="micro">Oldenburg's traits this place shows</h2>${traitsRow(h)}</section>
    <section class="story">${h.story.map(t => `<p>${esc(t)}</p>`).join('')}</section>
    <section><h2 class="micro">Plub's walk · six highest-scoring work spots</h2>
      <ol class="walk">${h.walk.map((id, i) => { const p = state.byId.get(id); return p ? `<li data-id="${esc(id)}"><span class="stop">${i + 1}</span><span class="nm">${esc(p.n)}</span>${state.visited.has(id) ? '<b>✓</b>' : ''}<span class="idx">${p.idx}</span></li>` : ''; }).join('')}</ol>
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
  const cov = {
    A: P.length, S: P.length, C: P.filter(p => !(p.flags & F.CHAIN)).length, F: P.length,
    W: P.filter(p => p.d[4] > 0).length, N: P.filter(p => p.d[5] > 0).length,
  };
  const why = {
    A: 'Jeffres et al. 2009: perceived access to third places predicts community quality of life',
    S: 'Adelfio et al. 2020: third places show up as clusters of social activity',
    C: 'Mehta & Bosson 2010: third places are personal and distinctive, not uniform',
    F: 'Adelfio et al. 2020: no single dataset is enough, so we count agreement across them',
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
        <span class="meta">${fmt(h.stats.work)} spots · #${h.stats.stationRank}</span></li>`; }).join('')}</ol>
    </section>
    <section><h2 class="micro">Most work spots within a 10-min walk · ${d.stations} rail stations</h2>
      <ol class="board">${top.map(s => `<li class="${anchors.has(s.th) ? 'hl' : ''}"><span class="nm">${s.rank}. ${esc(s.name)}</span><span class="barwrap"><i style="width:${s.work / max * 100}%"></i></span><span class="meta">${s.work}</span></li>`).join('')}</ol>
      <p class="micro data-note">Median station: ${d.stationMedian}. Work spot = café, co-working or library.</p>
    </section>
    <section><h2 class="micro">How every place is scored</h2>
      ${histogram(P)}
      <table class="ggp-table how">${GGP.map(([k, sym, label, what], i) => `<tr><td class="sym">${sym}</td><td><b>${label}</b> <span class="what">${what}</span></td><td class="raw"><span class="cov" title="${fmt(cov[k])} of ${fmt(P.length)} places carry this signal"><i style="width:${Math.max(1, cov[k] / n * 100)}%"></i></span>${cov[k] / n < 0.01 ? '<1' : Math.round(cov[k] / n * 100)}%</td></tr>
        <tr class="why"><td></td><td colspan="2">${esc(why[k])}</td></tr>`).join('')}</table>
      <p class="data-note">✦ Great Good Place index = the average of ↦ ⁘ ◇ ◎, each ranked against all ${fmt(P.length)} places, 0–100. ≋ and ✦ are shown but kept out of the index: too few places carry them yet to be fair.</p>
    </section>
    <section class="about"><h2 class="micro">Sources</h2>
      <p class="src">Ray Oldenburg, <i>The Great Good Place</i> (1989). Jeffres, Bracken, Jian & Casey, "The Impact of Third Places on Community Quality of Life", <i>Applied Research in Quality of Life</i> 4 (2009). Mehta & Bosson, "Third Places and the Social Life of Streets", <i>Environment and Behavior</i> 42:6 (2010). Adelfio et al., "Social Activity in Gothenburg's Intermediate City: Mapping Third Places through Social Media Data", <i>Applied Spatial Analysis and Policy</i> (2020).</p>
      <p class="src">Places: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (ODbL, 24 Oct 2026) and <a href="https://overturemaps.org" target="_blank" rel="noopener">Overture Maps</a> (CDLA-P-2.0, 2026-10-21). Work scores come from visitors. Nobody has paid to appear here. A working pilot: if a pin is wrong, fix it on OpenStreetMap.</p>
    </section>`);
  sheet.querySelector('.line').addEventListener('click', e => { const li = e.target.closest('li[data-hood]'); if (li) openHood(li.dataset.hood); });
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
    <button class="send" type="submit">Save to passport</button>
    <p class="micro">Saved on this device only.</p>`;
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
  const input = form.querySelector('input[type=file]');
  input.addEventListener('change', () => { form.querySelector('.picked').textContent = input.files.length ? `${Math.min(4, input.files.length)} photo(s)` : ''; });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const send = form.querySelector('.send'); send.disabled = true; send.textContent = 'Saving…';
    try {
      await Passport.add({ place: p.id, name: p.n, kind: p.k, y: p.y, x: p.x, stars,
        words: [...form.querySelectorAll('.feel [aria-pressed="true"]')].map(b => b.textContent),
        note: form.querySelector('textarea').value, files: input.files });
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
      <button type="button" class="export">↓ Export backup</button>
      <label class="importer">↑ Import<input type="file" accept="application/json" hidden></label>
    </nav>
    <p class="src">Saved on this device only, never uploaded. Export a backup before clearing your browser or changing phones.</p>`);
  sheet.querySelector('.stamps').addEventListener('click', e => { const li = e.target.closest('[data-hood]'); if (li) openHood(li.dataset.hood); });
  sheet.querySelectorAll('.moment-place').forEach(li => li.addEventListener('click', () => select(state.byId.get(li.dataset.id), true)));
  bindMoments(sheet);
  sheet.querySelector('.export').onclick = async e => { const n = await Passport.exportFile(); e.target.textContent = `↓ Exported ${n}`; };
  sheet.querySelector('.importer input').onchange = async e => {
    try { const n = await Passport.importFile(e.target.files[0]); await loadVisits(); refresh(); openPassport(); alert(`${n} moments imported.`); }
    catch (err) { alert(err.message); }
  };
}
