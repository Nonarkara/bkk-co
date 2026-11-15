// PLUB views: Nong Plub's guide, neighbourhood sheets, the passport, and "I've been here".
// Uses helpers from app.js (state, map, $, esc, fmt, select, openSheet, petals, dots, GGP, F, KIND_LABEL).
const TRAIT_SYM = { neutral: '○', leveler: '=', talk: '❝', access: '↦', regulars: '↺', low: '▁', playful: '✳', home: '⌂' };
function guideArt(size=104) { return `<img class="guide-art ${size<50?'guide-portrait':''}" src="plub/nong-plub.png" alt="Nong Plub" width="${size<50?size:Math.round(size*246/420)}" height="${size}">`; }
const FEELINGS = ['Calm', 'Focused', 'Cozy', 'Buzzing', 'Social', 'Inspiring', 'Slow', 'Meh'];
const hoods = { list: [], bySlug: {}, ofId: new Map(), data: null };

const hoodsReady = fetch('data/hoods.json').then(r => r.json()).then(d => {
  hoods.data = d; hoods.list = d.hoods;
  for (const h of d.hoods) { hoods.bySlug[h.slug] = h; for (const id of h.ids) if (!hoods.ofId.has(id)) hoods.ofId.set(id, h); }
  drawHoods();
}).catch(() => {});

$('#guide').innerHTML = '<img class="plub-badge" src="plub/nong-plub.png" alt="" width="22" height="22"><span class="btn-lbl">Guide</span>';

window.hoodOf = p => hoods.ofId.get(p.id);
// How people actually name these areas, in Thai and English. "near" = an alias that is a neighbouring area, said so.
const HOOD_ALIASES = {
  ari: [['aree', 'อารี', 'phahonyothin 7', 'พหลโยธิน 7', 'ซอยอารีย์']],
  samyan: [['chula', 'จุฬา', 'chulalongkorn', 'mitrtown', 'มิตรทาวน์', 'สามย่านมิตรทาวน์', 'samyan'], ['siam', 'สยาม', 'สามย่าน', 'rama 4', 'พระราม 4']],
  charoenkrung: [['talat noi', 'talad noi', 'ตลาดน้อย', 'tcdc', 'bang rak', 'บางรัก', 'saphan taksin', 'สะพานตากสิน', 'riverside']],
  thonglo: [['thonglor', 'thong lor', 'ทองหล่อ', 'sukhumvit 55', 'สุขุมวิท 55', 'ekkamai', 'เอกมัย']],
};
const NEAR_ALIAS = { samyan: [['siam', 'Siam'], ['สยาม', 'สยาม']], thonglo: [['ekkamai', 'Ekkamai'], ['เอกมัย', 'เอกมัย']] }; // close by, not the same place
window.hoodHits = q => hoods.list.filter(h => [h.name, h.th, h.for, ...(HOOD_ALIASES[h.slug] || []).flat()].some(s => s.toLowerCase().includes(q)))
  .map(h => {
    const near = ((NEAR_ALIAS[h.slug] || []).find(([a]) => a.includes(q) || q.includes(a)) || [])[1];
    return `<li data-hood="${h.slug}" role="option"><span class="ring" aria-hidden="true"></span><span class="nm">${esc(h.name)} <span class="th" lang="th">${esc(h.th)}</span></span><span class="meta">${near ? `near ${esc(near)} · ` : ''}for ${esc(h.for.toLowerCase())}</span></li>`;
  }).join('');
$('#hits').addEventListener('click', e => { const li = e.target.closest('li[data-hood]'); if (li) openHood(li.dataset.hood); });

// ---------- map: one 10-minute-walk ring per neighbourhood ----------
function ring(h, steps = 72) {
  const { y, x } = h.anchor, ky = h.radius / 111320, kx = ky / Math.cos(y * Math.PI / 180);
  const c = [];
  for (let i = 0; i <= steps; i++) { const a = i / steps * 2 * Math.PI; c.push([x + Math.cos(a) * kx, y + Math.sin(a) * ky]); }
  return c;
}
window.addHoodLayers = () => {
  if(map.getSource('hoods'))return;
  map.addSource('hoods', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'hood-fill', type: 'fill', source: 'hoods', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': '#7d133a', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.05, 15, 0.02] } });
  map.addLayer({ id: 'hood-line', type: 'line', source: 'hoods', filter: ['==', '$type', 'Polygon'], paint: { 'line-color': '#7d133a', 'line-width': 1.5, 'line-dasharray': [3, 2] } });
  // labels go on top of the pins once those exist (see window.raiseHoodLabels)
  map.addLayer({ id: 'hood-label', type: 'symbol', source: 'hoods', filter: ['==', '$type', 'Point'], maxzoom: 16,
    layout: { 'text-field': ['step', ['zoom'], ['get', 'name'], 12.5, ['get', 'label']], 'text-size': 13, 'text-font': ['Noto Sans Bold'],
      'text-anchor': ['match', ['get', 'slug'], [...LABEL_BELOW], 'top', 'bottom'], 'text-allow-overlap': false, 'symbol-sort-key': 0 },
    paint: { 'text-color': '#7d133a', 'text-halo-color': '#ffffff', 'text-halo-width': 2 } });
  map.on('click', 'hood-fill', e => {
    if (map.queryRenderedFeatures(e.point, { layers: [...PIN_LAYERS,'route-stop'] }).length) return; // a place or routed stop wins
    openHood(e.features[0].properties.slug);
  });
  map.on('click', 'hood-label', e => openHood(e.features[0].properties.slug));
  // finder results and café-hop routes: numbered ink stops, dashed straight legs.
  // Manga café hop: ink line + ink stops (manga line art), not the co-working amber.
  map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'route-line', type: 'line', source: 'route', filter: ['==', '$type', 'LineString'], paint: { 'line-color': '#7d133a', 'line-width': 3, 'line-dasharray': [2, 1.5] } });
  map.addLayer({ id: 'route-stop', type: 'circle', source: 'route', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 11, 'circle-color': '#7d133a', 'circle-stroke-color': '#7d133a', 'circle-stroke-width': 2 } });
  map.addLayer({ id: 'route-num', type: 'symbol', source: 'route', filter: ['==', '$type', 'Point'], layout: { 'text-field': ['get', 'n'], 'text-size': 12, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true }, paint: { 'text-color': '#ffffff' } });
  map.on('click','route-stop',e=>{const p=state.byId.get(e.features[0].properties.id);if(p)select(p,false)});
  map.on('mouseenter','route-stop',()=>{map.getCanvas().style.cursor='pointer'});
  map.on('mouseleave','route-stop',()=>{map.getCanvas().style.cursor=''});
  const before=PIN_LAYERS.find(id=>map.getLayer(id));
  if(before){for(const layer of ['hood-fill','hood-line'])map.moveLayer(layer,before);map.moveLayer('hood-label');for(const layer of ['route-line','route-stop','route-num'])map.moveLayer(layer);window.flushRoute?.()}
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
    <line x1="6" y1="22" x2="${W - 6}" y2="22" stroke="#b6bfc1"/>
    ${all.map(v => `<line x1="${x(v)}" y1="17" x2="${x(v)}" y2="27" stroke="#b6bfc1" stroke-width=".8"/>`).join('')}
    <line x1="${x(med)}" y1="12" x2="${x(med)}" y2="32" stroke="#974261" stroke-dasharray="2 2"/>
    <text x="${x(med)}" y="9" text-anchor="middle">median ${med}</text>
    <line x1="${x(h.stats.work)}" y1="6" x2="${x(h.stats.work)}" y2="36" stroke="#7d133a" stroke-width="3"/>
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
    <div class="hood-intro"><div class="hood-mood"><span class="micro">For</span><b class="for">${esc(h.for)}</b><span lang="th">${esc(h.forTh)}</span></div><div class="plub-say">${guideArt()}<p><q>${esc(h.plub)}</q>${moodOf(slug) ? `<button class="linkish" data-mood="${moodOf(slug)}">◐ Find ${esc(h.for.toLowerCase())} citywide</button>` : ''}</p></div></div>
    <section><h2 class="micro">Plub's walk · co-working &amp; libraries first, then Wi-Fi, then ✦</h2>
      <ol class="walk">${h.walk.map((id, i) => { const p = state.byId.get(id); return p ? `<li data-id="${esc(id)}"><span class="stop">${i + 1}</span><span class="nm">${nm(p.n)}</span>${state.visited.has(id) ? '<b>✓</b>' : ''}<span class="idx">✦${p.idx}</span></li>` : ''; }).join('')}</ol>
    </section>
    <details class="hood-more"><summary>Numbers and story</summary>
    <section class="hood-stats">
      <div class="stat"><span class="big">${fmt(s.work)}</span><span class="micro">work spots within 800 m of ${esc(h.anchorLabel)}</span></div>
      <div class="stat"><span class="big">#${s.stationRank}</span><span class="micro">${/^(BTS|MRT)/.test(h.anchorLabel) ? `of ${s.stations} rail stations` : `vs ${s.stations} rail-station circles`}</span></div>
      <div class="stat"><span class="big">✦${s.ggp}</span><span class="micro">average index</span></div>
      <div class="stat"><span class="big">${been}<small>/${fmt(workIds.length)}</small></span><span class="micro">✓ you've been</span></div>
      ${strip(h)}
      ${compBar(s.kinds)}
      <p class="micro data-note">≋ ${s.wifiTagged} list Wi-Fi · ◷ ${s.hoursKnown} list hours · ${fmt(Math.round(s.perKm2))} per km²</p>
    </section>
    <section><h2 class="micro">Plub's read · Oldenburg's traits, from the story below</h2>${traitsRow(h)}</section>
    <section class="story">${h.story.map(t => `<p>${esc(t)}</p>`).join('')}</section>
    </details>
    <nav class="links"><button type="button" class="show-map">◎ Show on map</button><button type="button" class="share">Share</button></nav>
    <p class="src">Sources: ${h.sources.map(([t, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(t)}</a>`).join(' · ')}. Numbers computed from OpenStreetMap and Overture Maps places within ${h.radius} m of OSM ${esc(h.anchor.id)}.</p>`);
  sheet.classList.add('hood-sheet');
  const context=document.createElement('nav');context.className='hood-context-actions';context.setAttribute('aria-label','Explore neighborhood');
  context.innerHTML='<button type="button" data-hood-stroll>Stroll source lanes</button><button type="button" data-hood-photos>Neighborhood photos</button>';
  sheet.querySelector('.hood-intro').after(context);
  context.querySelector('[data-hood-photos]').onclick=()=>window.NeighborhoodPhotos?.gallery(slug);
  context.querySelector('[data-hood-stroll]').onclick=()=>{map.jumpTo({center:[h.anchor.x,h.anchor.y],zoom:17});window.StreetWorld?.open()};
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
  const marks = hoods.list.map(h => `<line x1="${h.stats.ggp / 100 * W}" y1="0" x2="${h.stats.ggp / 100 * W}" y2="${H}" stroke="#7d133a" stroke-width="1.5"/>`).join('');
  return `<svg class="hist" viewBox="0 0 ${W} ${H + 12}" role="img" aria-label="Distribution of the Great Good Place index across ${P.length} places">
    ${bins.map((b, i) => `<rect x="${i * bw + 1}" y="${H - b / max * H}" width="${bw - 2}" height="${b / max * H}" fill="#c08da2"/>`).join('')}
    ${marks}<line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="#7d133a"/>
    <text x="0" y="${H + 11}">0</text><text x="${W / 2}" y="${H + 11}" text-anchor="middle">✦ index · each line is a neighbourhood</text><text x="${W}" y="${H + 11}" text-anchor="end">100</text></svg>`;
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
    <p class="discovery-entry"><button class="linkish" data-act="discovery">Explore 50 editorial picks + 50 discussed cafés →</button> · <button class="linkish" data-neighborhood-photos>Real neighborhood photos →</button></p>
    <div class="plub-say">${guideArt()}<p><q>Bangkok has ${fmt(P.length)} places to sit down. A great good place is the one you keep coming back to. Pick a neighbourhood, I'll walk you through it.</q></p></div>
    <section><h2 class="micro">Four neighbourhoods</h2>
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
    <section class="guide-tiers"><h2 class="micro">Where the facts come from</h2>
      <p class="data-note">Every fact PLUB shows carries the kind of evidence behind it. The kinds never mix, and a fact that nobody wrote down stays unknown — it is never given a zero.</p>
      <dl class="wa-grid guide-tier-grid">
        <div class="wa-row" data-state="documented"><dt>On the map</dt><dd><span class="wa-mark" aria-hidden="true">✓</span> an OpenStreetMap or Overture tag, with the snapshot date</dd></div>
        <div class="wa-row" data-state="documented"><dt>The venue says</dt><dd><span class="wa-mark" aria-hidden="true">✓</span> the operator's own page, account or card. PLUB has not checked it</dd></div>
        <div class="wa-row" data-state="documented"><dt>Visitors report</dt><dd><span class="wa-mark" aria-hidden="true">✓</span> what people who went there said, counted and dated</dd></div>
        <div class="wa-row" data-state="documented"><dt>Reported on site</dt><dd><span class="wa-mark" aria-hidden="true">✓</span> one named person, one dated visit, in their own words</dd></div>
        <div class="wa-row" data-state="unknown"><dt>Not documented</dt><dd><span class="wa-mark" aria-hidden="true">○</span> nobody wrote it down. PLUB will not guess it</dd></div>
      </dl>
      <p class="data-note">A place's <b>work readiness</b> is the weighted mean of the dimensions that are documented, published only when enough of them are, and it always names the ones it could not score. It measures what is recorded, not how good the place is. <a href="/bridge-1958">The Bridge 1958</a> is a worked example of a named on-site report.</p>
      <p class="data-note"><a href="/research">Read the research and the data analysis →</a></p>
    </section>
    <section class="about"><h2 class="micro">Sources</h2>
      <p class="src">Ray Oldenburg, <i>The Great Good Place</i> (1989). Jeffres, Bracken, Jian & Casey, "The Impact of Third Places on Community Quality of Life", <i>Applied Research in Quality of Life</i> 4 (2009). Mehta & Bosson, "Third Places and the Social Life of Streets", <i>Environment and Behavior</i> 42:6 (2010). Adelfio et al., "Social Activity in Gothenburg's Intermediate City: Mapping Third Places through Social Media Data", <i>Applied Spatial Analysis and Policy</i> (2020).</p>
      <p class="src">Places: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (ODbL, 24 Oct 2026) and <a href="https://overturemaps.org" target="_blank" rel="noopener">Overture Maps</a> (CDLA-P-2.0, 2026-10-21). Visitor ratings (Wi-Fi, outlets, quiet, laptop) come from visitors; ≋ Work comes from map tags. Nobody has paid to appear here. A working pilot: if a pin is wrong, fix it on OpenStreetMap. <a href="${osmNote(map.getCenter().lat, map.getCenter().lng)}" target="_blank" rel="noopener">Missing a place? Leave a note on OpenStreetMap</a>, and it appears here after mappers add it and the map is rebuilt. Hand pins (✎) mark places someone has visited that no open dataset has yet.</p>
    </section>`);
  sheet.querySelector('.line').addEventListener('click', e => { if (e.target.closest('[data-mood]')) return; const li = e.target.closest('li[data-hood]'); if (li) openHood(li.dataset.hood); });
});

// ---------- passport ----------
const urls = window.visitPhotoUrls = [];
const photoUrl = blob => { const u = URL.createObjectURL(blob); urls.push(u); return u; };
window.momentHtml = v => `<li class="moment" data-key="${v.key}">
  <div class="moment-head"><span>${new Date(Passport.day(v)+'T12:00:00+07:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone:'Asia/Bangkok' })}</span>
  <span class="stars" aria-label="${v.stars ? v.stars+' of 5' : 'Not rated yet'}">${v.stars ? '★'.repeat(v.stars)+'<s>'+'★'.repeat(5-v.stars)+'</s>' : '<span class="micro">Not rated yet</span>'}</span>
  <button class="del" aria-label="Delete this moment">×</button></div>
  <div class="moment-actions"><button type="button" data-note-edit="${v.key}">Edit</button><button type="button" data-note-backup="${v.key}">Back up</button><button type="button" data-note-share="${v.key}">Share…</button><span class="cloud-state">${v.cloudOwner ? (v.cloudAt === (v.updated || v.at) ? 'Cloud copy saved' : 'Cloud copy may be older') : 'Device only'}</span></div>
  ${v.words?.length ? `<div class="words">${v.words.map(w => `<span>${esc(w)}</span>`).join('')}</div>` : ''}
  ${v.note ? `<p>${esc(v.note)}</p>` : ''}
  ${v.photos?.length ? `<div class="thumbs">${v.photos.map(b => `<a href="${photoUrl(b)}" target="_blank" rel="noopener"><img src="${urls[urls.length - 1]}" alt="Photo from this visit"></a>`).join('')}</div>` : ''}</li>`;

window.bindMoments = root => root.querySelectorAll('.moment .del').forEach(b => b.addEventListener('click', async () => {
  if (!confirm('Delete this moment and its photos from this device? Cloud copies and public recommendations remain until removed separately.')) return;
  await Passport.remove(+b.closest('.moment').dataset.key);
  b.closest('.moment').remove();
  await loadVisits(); refresh();
}));

window.beenForm = (p, btn, done) => {
  const form = document.createElement('form');
  form.className = 'been-form';
  form.dataset.place = p.id;
  form.innerHTML = `
    <div class="stars-pick" role="group" aria-label="How was it">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-s="${i}" aria-label="${i} of 5" aria-pressed="false">★</button>`).join('')}</div>
    <div class="feel" role="group" aria-label="It felt">${FEELINGS.map(w => `<button type="button" aria-pressed="false">${w}</button>`).join('')}</div>
    <label>Visit date<input name="visit-date" type="date" required value="${new Date(Date.now()+7*3600000).toISOString().slice(0,10)}"></label>
    <label>Your private note<textarea rows="2" maxlength="600" placeholder="Coffee, Wi-Fi, outlets, noise — what should you remember?"></textarea></label>
    <label class="photo-pick">＋ Photos · up to 4<input type="file" accept="image/*" multiple class="sr"></label><span class="micro picked" role="status"></span><div class="thumbs photo-preview"></div>
    ${p.k === 'cannabis' ? '' : `<details class="work-q"><summary>For people who work here (optional, shared)</summary>
      <div class="rate">${SCORES.map(([k, label, opts]) => `<span>${label}</span><div class="seg" data-k="${k}" role="group" aria-label="${label}">${opts.map((o, i) => `<button type="button" data-v="${i + 1}" aria-pressed="false">${o}</button>`).join('')}</div>`).join('')}</div>
    </details>`}
    <button class="send" type="submit">Save visit</button>
    <p class="micro note">Stars, words, note and photos save on this device. Back up or share later from your notebook.${p.k === 'cannabis' ? ' A dispensary carries no working conditions, so there is nothing here to score.' : ' The four work answers, if all given, are shared anonymously.'}</p>`;
  btn.replaceWith(form);
  let stars = 0;
  try { const draft = JSON.parse(sessionStorage.getItem('plub-draft-'+p.id)||'null'); if (draft) { form.querySelector('textarea').value = draft.note || ''; form.querySelector('[name=visit-date]').value = draft.at || form.querySelector('[name=visit-date]').value; } } catch {}
  form.addEventListener('input', () => { try { sessionStorage.setItem('plub-draft-'+p.id, JSON.stringify({ note:form.querySelector('textarea').value, at:form.querySelector('[name=visit-date]').value })); } catch {} });
  form.querySelector('.stars-pick').addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    stars = +b.dataset.s;
    form.querySelectorAll('[data-s]').forEach(x => x.setAttribute('aria-pressed', +x.dataset.s <= stars));
  });
  form.querySelector('.feel').addEventListener('click', e => {
    const b = e.target.closest('button'); if (b) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
  });
  const vote = {};
  form.querySelector('.rate')?.addEventListener('click', e => {
    const b = e.target.closest('.seg button'); if (!b) return;
    b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    vote[b.parentElement.dataset.k] = +b.dataset.v;
  });
  const input = form.querySelector('input[type=file]');
  input.addEventListener('change', () => {
    form.querySelector('.picked').textContent = input.files.length ? `${Math.min(4,input.files.length)} photo(s) selected${input.files.length>4?' · only the first 4 will save':''}` : '';
    form.querySelector('.photo-preview').innerHTML=[...input.files].slice(0,4).map(file=>`<a href="${photoUrl(file)}"><img src="${urls[urls.length-1]}" alt="Selected visit photo"></a>`).join('');
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const send = form.querySelector('.send'); send.disabled = true; send.textContent = 'Saving…';
    try {
      const savedKey=await Passport.add({ at: form.querySelector('[name=visit-date]').value, place: p.id, name: p.n, kind: p.k, y: p.y, x: p.x, stars,
        words: [...form.querySelectorAll('.feel [aria-pressed="true"]')].map(b => b.textContent),
        note: form.querySelector('textarea').value, files: input.files });
      if (SCORES.every(([k]) => vote[k])) {
        const deadline=new AbortController(),timer=setTimeout(()=>deadline.abort(),8000);
        const r = await fetch('/api/scores', { signal:deadline.signal, method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ place: p.id, ...vote }) }).catch(() => null);
        clearTimeout(timer);
        if (r?.ok) await loadScores(); // a refused rating (e.g. already rated today) never blocks the passport entry
      }
      sessionStorage.removeItem('plub-draft-'+p.id);
      await loadVisits(); refresh(); const active=form.isConnected; form.remove(); if(active)await done(savedKey);
    } catch (err) { send.disabled = false; send.textContent = 'Save visit'; form.querySelector('.picked').textContent=err.message||'Could not save. Your form is kept; try again.'; }
  });
};

$('#passport').addEventListener('click', openPassport);
window.openPassport = openPassport;
async function openPassport() {
  const pending=openSheet('<header><h1>Your notebook</h1><button class="close" aria-label="Close">×</button></header><p role="status">Loading your device visits…</p>');
  pending.classList.add('notebook-sheet');
  const generation=sheetGeneration;
  await hoodsReady;
  const visits = (await Passport.all().catch(() => [])).sort((a, b) => b.at.localeCompare(a.at));
  if(generation!==sheetGeneration||pending.hidden)return;
  const places = new Set(visits.map(v => canonId(v.place)));
  const stamped = hoods.list.filter(h => h.ids.some(id => places.has(id)));
  const sheet = openSheet(`
    <header><h1>Your notebook</h1><button class="close" aria-label="Close">×</button></header>
    <div class="plub-say">${guideArt()}<p><q>${visits.length ? `${places.size} ${places.size === 1 ? 'place' : 'places'}, ${stamped.length} of ${hoods.list.length} neighbourhoods stamped. Keep going.` : 'Start with a place you visited. Save a note or photo; back it up or share it when you choose.'}</q></p></div>
    <div id="notebook-tools"></div>
    <details class="notebook-stamps"><summary>Neighbourhood stamps</summary>
      <ul class="stamps">${hoods.list.map(h => { const n = h.ids.filter(id => places.has(id)).length; return `<li data-hood="${h.slug}" class="${n ? 'on' : ''}"><span class="stamp">${n ? '✓' : ''}<b>${esc(h.name)}</b><span class="th" lang="th">${esc(h.th)}</span></span><span class="micro">${n} been</span></li>`; }).join('')}</ul>
    </details>
    <section><h2 class="micro">Moments · ${visits.length}</h2>
      ${visits.length ? `<ul class="moments">${visits.map(v => `<li class="moment-place" data-id="${esc(v.place)}"><i class="dot ${esc(v.kind)}"></i><b>${esc(v.name)}</b></li>${momentHtml(v)}`).join('')}</ul>` : '<p class="micro">Your visits, impressions and photos will collect here.</p>'}
    </section>
    <nav class="links">
      <button type="button" class="card">⇪ Share stamp card</button>
      <button type="button" class="export">↓ Export backup</button>
      <label class="importer">↑ Import<input type="file" accept="application/json" class="sr"></label>
    </nav>
    <p class="src">Device copies stay here until you delete them. Cloud backup and public sharing are separate choices. Export before clearing your browser.</p>`);
  window.Notebook?.mount(sheet, visits);
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
  sheet.querySelector('.export').onclick = async e => {
    const button=e.target;button.disabled=true;
    try {
      const {count,parts}=await Passport.exportFile();
      let area=sheet.querySelector('.backup-parts');if(!area){area=document.createElement('div');area.className='backup-parts';button.closest('nav').after(area)}
      area.replaceChildren();const note=document.createElement('p');note.className='src';note.textContent=`${count} visits in ${parts.length} backup ${parts.length===1?'file':'files'}. Download every part; import each to restore. Files include private photos.`;area.append(note);
      parts.forEach((blob,i)=>{const a=document.createElement('a');a.href=photoUrl(blob);a.download=`plub-passport-${new Date().toISOString().slice(0,10)}-part-${i+1}.json`;a.textContent=`↓ Download part ${i+1} of ${parts.length}`;area.append(a)});
    } catch(err) {button.textContent=err.message}finally{button.disabled=false}
  };
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
  // Wordmark in his lettering; the semicolon is the seam.
  g.fillStyle = '#7d133a'; g.font = '700 74px "Sao Chingcha", Jost, Prompt, sans-serif'; g.fillText('PL', 80, 148);
  let wm = 80 + g.measureText('PL').width;
  g.fillStyle = '#e88ba1'; g.fillText(';', wm, 148);
  wm += g.measureText(';').width;
  g.fillStyle = '#7d133a'; g.fillText('UB', wm + 4, 148);
  g.fillStyle = '#974261'; g.font = '300 30px "Sao Chingcha", Jost, Prompt, sans-serif';
  g.fillText('placemaking laboratory ; urban bureau · bangkok', 80, 198);
  const img = new Image();
  img.src = 'plub/nong-plub.png';
  await img.decode().catch(() => {});
  if (img.naturalWidth) { const mh = 330, mw = img.naturalWidth * mh / img.naturalHeight; g.drawImage(img, W - 80 - mw, 40, mw, mh); }
  g.strokeStyle = '#7d133a'; g.lineWidth = 2; g.beginPath(); g.moveTo(80, 390); g.lineTo(W - 80, 390); g.stroke();
  hoods.list.forEach((h, i) => {
    const n = h.ids.filter(id => places.has(id)).length;
    const cx = 80 + 230 + (i % 2) * 460, cy = 560 + Math.floor(i / 2) * 360, r = 150;
    g.save(); g.translate(cx, cy); if (n) g.rotate(-0.1);
    g.beginPath(); g.arc(0, 0, r, 0, 2 * Math.PI);
    if (n) { g.fillStyle = '#f4f4f0'; g.fill(); g.setLineDash([]); g.strokeStyle = '#7d133a'; g.lineWidth = 6; }
    else { g.setLineDash([14, 12]); g.strokeStyle = '#b6bfc1'; g.lineWidth = 4; }
    g.stroke(); g.setLineDash([]);
    g.textAlign = 'center'; g.fillStyle = n ? '#7d133a' : '#974261';
    let fs = 44; do { g.font = `600 ${fs}px Jost, Prompt, sans-serif`; } while (g.measureText(h.name).width > 2 * r - 40 && --fs > 20);
    g.fillText(h.name, 0, n ? 10 : 0);
    g.font = '400 30px Prompt, Jost, sans-serif'; g.fillText(h.th, 0, n ? 52 : 44);
    if (n) { g.font = '600 52px Jost, sans-serif'; g.fillStyle = '#7d133a'; g.fillText('✓', 0, -50); g.fillStyle = '#7d133a'; g.font = '400 28px Jost, sans-serif'; g.fillText(`${n} been`, 0, 98); }
    g.restore();
  });
  g.textAlign = 'left'; g.fillStyle = '#7d133a'; g.font = '500 40px Jost, Prompt, sans-serif';
  g.fillText(`${places.size} great good ${places.size === 1 ? 'place' : 'places'} · ${hoods.list.filter(h => h.ids.some(id => places.has(id))).length} of ${hoods.list.length} neighbourhoods`, 80, H - 120);
  g.fillStyle = '#974261'; g.font = '400 30px Jost, sans-serif'; g.fillText('co.nonarkara.org', 80, H - 70);
  return new Promise(ok => c.toBlob(ok, 'image/png'));
}

// ---------- shared: highlight a set of places on the map, optionally as a numbered walking route ----------
let pendingRoute={stops:[],line:false};
function showRoute(stops, line) {
  pendingRoute={stops,line};
  if(stops.length)openFromUrl.framed=true;
  const src = map.getSource('route');
  if (!src) return;
  src.setData({ type: 'FeatureCollection', features: [
    ...(line && stops.length > 1 ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: stops.map(p => [p.x, p.y]) }, properties: {} }] : []),
    ...stops.map((p, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.x, p.y] }, properties: { n: String(i + 1), id:p.id } })),
  ] });
  if (!stops.length) return;
  const xs = stops.map(p => p.x), ys = stops.map(p => p.y);
  map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]],
    { padding: { top: 50, left: 50, right: 50, bottom: isPhone() ? $('#sheet').offsetHeight + 30 : 50 }, maxZoom: 16 });
}
window.flushRoute = () => showRoute(pendingRoute.stops,pendingRoute.line);
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
  if(window.WorkFinder)return window.WorkFinder.open('nearby');
  const sheet = openSheet(`<header><span class="mini-plub">${guideArt(32)}</span><h1>Near me now</h1><button class="close" aria-label="Close">×</button></header>
    <div class="now-ctl">
      <div class="seg range" role="group" aria-label="How far">
        <button data-range="walk" aria-pressed="${nowState.range === 'walk'}">Walk · ≤ 800 m</button>
        <button data-range="drive" aria-pressed="${nowState.range === 'drive'}">Drive · ≤ 2 km</button>
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
    .filter(p => p.k !== 'restaurant' && window.isOpen(venueHours(p), now) !== false)
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
      <button class="linkish nm" data-open="${esc(p.id)}">${nm(p.n)}</button>
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
window.barriersReady = fetch('data/barriers.json', {signal:AbortSignal.timeout(10000)}).then(r => {if(!r.ok)throw new Error('No river geometry');return r.json()}).then(d => { river = JourneyModel.riverSegments(d.lines); return river.length>0; }).catch(() => false);
function crossesRiver(a, b) {
  return JourneyModel.crossesSegments(a,b,river);
}

// ---------- Café hop: a walkable day through the best independent cafés ----------
const hopState = { start: null };
function planHop(start) {
  const local = new Date(Date.now()+7*3600000);
  const today11 = new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate(),4));
  const pool = state.places.filter(p => p.k === 'cafe' && !(p.flags & F.CHAIN) && p.idx >= 70 &&
    window.isOpen(venueHours(p), today11) !== false && near(p, start) <= 1500 && !crossesRiver(start, p));
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

    <div class="feel hop-starts" role="group" aria-label="Start in">${starts.map(([k, l]) => `<button data-start="${k}" aria-pressed="${k === hopState.start}">${esc(l)}</button>`).join('')}</div>
    ${stops.length ? `<p class="micro">${esc(label)} · ${stops.length} stops · at least ${km.toFixed(1)} km on foot · ${Math.round(km * 1000 / 80)}+ min walking</p>
    <ol class="walk hop">${stops.map((p, i) => `<li data-id="${esc(p.id)}"><span class="stop">${i + 1}</span><span class="nm">${nm(p.n)}</span>${i ? `<span class="micro">${Math.round(legs[i - 1])} m</span>` : ''}<span class="idx">✦${p.idx}</span></li>`).join('')}</ol>
    <nav class="links">${g ? `<a href="${g}" target="_blank" rel="noopener">Walk it in Google Maps ↗</a>` : ''}<button type="button" class="share">Share</button></nav>`
    : '<p class="micro">Not enough independent cafés with a high index close together here. Try another start.</p>'}
    <button type="button" class="linkish" data-shared-hops>Shared hop notes · optional</button>
    <details class="hop-guide"><summary>Plub’s walking tip</summary><div class="plub-say">${guideArt()}<p><q>Five independent cafés, a short walk apart. Pace yourself: one coffee, one pastry, one water.</q></p></div></details>
    <p class="src">Picked from independent cafés with ✦ ≥ 70, not listed as closed at 11 am, each 250–800 m from the last. Legs never cross the Chao Phraya; they can cross big roads, so use crossings. Distances are straight lines, so the real walk is longer: Google Maps gives the path. Apple Maps takes one stop at a time: open a stop to get its link.</p>`);
  sheet.classList.add('hop-sheet');
  sheet.querySelector('[data-shared-hops]').onclick=()=>window.Notebook?.showHops(stops);
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

// A cached map can load before this script arrives. Initialise once in either order.
queueMicrotask(()=>{if(map.getLayer('pins-city')&&!map.getSource('hoods'))window.addHoodLayers();window.WorkFinder?.onViewsReady()});

// Optional reference gallery; source credits remain with each image.
document.addEventListener('click',e=>{if(e.target.closest('[data-neighborhood-photos]'))window.NeighborhoodPhotos?.gallery()});
