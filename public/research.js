// Research & data: the numbers, computed from the catalogue that ships.
// Nothing here is typed by hand. If the catalogue changes, these figures change with it,
// and the footnote says which snapshot they came from.
(() => {
  'use strict';
  const F = { WIFI: 1, NOWIFI: 2, HOURS: 4, OUTDOOR: 8, OVERTURE: 16, CHAIN: 32, NOTABLE: 64, HAND: 128, PARK: 256, COFFEE: 512 };
  const fmt = n => Number(n).toLocaleString('en-GB');
  // A share that rounds to zero must never read as "0%": that would say "none",
  // which is not what the catalogue says.
  const pct = (a, b) => {
    if (!b) return '—';
    const v = a / b * 100;
    if (v < 0.1) return '<0.1%';
    return v.toFixed(v < 10 ? 1 : 0) + '%';
  };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const row = (label, value, note) => `<div class="rd-row"><dt>${esc(label)}</dt><dd>${value}</dd>${note ? `<p class="rd-note">${note}</p>` : ''}</div>`;

  async function get(path) {
    const r = await fetch(path, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`${path} is unavailable`);
    return r.json();
  }

  async function run() {
    const host = document.getElementById('rd-figures');
    const lede = document.getElementById('rd-lede');
    if (!host) return;
    let places, joins, areas, fabric;
    try {
      [places, joins, areas, fabric] = await Promise.all([
        get('/data/places-work.json'), get('/data/journey-places.json'), get('/data/street-areas.json'),
        get('/data/height-coverage.json'),
      ]);
    } catch (e) {
      lede.textContent = `The catalogue could not be read (${e.message}). The figures below would be a claim without evidence, so they are not shown.`;
      lede.setAttribute('role', 'alert');
      return;
    }

    const rows = places.rows || [];
    const total = rows.length;
    const byKind = {};
    for (const k of places.kinds || []) byKind[k] = 0;
    let wifi = 0, nowifi = 0, hours = 0, chain = 0, notable = 0, hand = 0, overture = 0;
    const bands = new Array(11).fill(0);
    for (const r of rows) {
      byKind[places.kinds[r[2]]] = (byKind[places.kinds[r[2]]] || 0) + 1;
      const f = r[5] || 0;
      if (f & F.WIFI) wifi++;
      if (f & F.NOWIFI) nowifi++;
      if (f & F.HOURS) hours++;
      if (f & F.CHAIN) chain++;
      if (f & F.NOTABLE) notable++;
      if (f & F.HAND) hand++;
      if (f & F.OVERTURE) overture++;
      bands[Math.min(10, Math.floor((r[7] || 0) / 10))]++;
    }

    // How much of the catalogue can PLUB actually score? Same rule set the place sheet uses:
    // map tags, visitor ratings and named on-site reports. Leaving the visitor and on-site
    // tiers out would understate what is documented, and the headline would be wrong.
    const [scores, reportFile] = await Promise.all([
      get('/api/scores').catch(() => null),
      get('/data/venue-reports.json').catch(() => null),
    ]);
    const visitorScores = scores || {};
    const reports = reportFile?.reports || {};
    const liveVisitors = scores !== null;
    const WorkAtmosphere = window.WorkAtmosphere;
    let anyDocumented = 0, publishable = 0, coverageSum = 0;
    if (WorkAtmosphere) {
      const data = { raw: { join: { venueTags: joins.venueTags || {} }, geo: { manifest: { asOf: joins.manifest?.asOf } } } };
      for (const r of rows) {
        const pr = WorkAtmosphere.profile(
          { id: r[0], n: r[1], k: places.kinds[r[2]], x: r[4], y: r[3], flags: r[5], idx: r[7] }, data, visitorScores, undefined, reports[r[0]]);
        if (pr.scored > 0) { anyDocumented++; coverageSum += pr.coverage; }
        if (pr.publishable) publishable++;
      }
    }

    const asOf = joins.manifest?.asOf ? new Date(joins.manifest.asOf).toISOString().slice(0, 10) : 'snapshot date unknown';
    lede.textContent = `Computed from the catalogue that ships with this page — the snapshot of ${asOf}. Every figure below is counted from that file, not typed in.`;

    const peak = Math.max(...bands);
    const dist = bands.map((n, i) => `<li><span>${i * 10}–${i * 10 + 9}</span><span class="rd-bar"><i style="width:${n / peak * 100}%"></i></span><span class="rd-n">${fmt(n)}</span></li>`).join('');

    const kindRows = Object.entries(byKind).filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => row(k === 'coworking' ? 'Co-working spaces' : k === 'cafe' ? 'Cafés' : k === 'library' ? 'Libraries' : k,
        `${fmt(n)} <span class="rd-share">· ${pct(n, total)}</span>`)).join('');

    const areaCount = (areas.areas || []).length;

    // The city fabric: how much of it can honestly be given a height.
    const hood = fabric?.populations?.neighbourhoods || {};
    const boxes = fabric?.populations?.extractionBoxes || {};
    const fp = hood.footprints || 0;
    const fabricRows = fp ? `
      <h3 class="rd-head">The city fabric</h3>
      <dl class="rd-figures">
        ${row('Building footprints in the twelve neighbourhoods', fmt(fp))}
        ${row('With an explicit height in metres', `${fmt(hood.explicitHeight)} <span class="rd-share">· ${pct(hood.explicitHeight, fp)}</span>`, 'The only heights PLUB draws. Each one is a height the source states in metres; none is estimated.')}
        ${row('With a floor count but no height', `${fmt(hood.levelsOnly)} <span class="rd-share">· ${pct(hood.levelsOnly, fp)}</span>`, 'A floor count is not a height. PLUB never turns floors into metres, so these footprints stay flat.')}
        ${row('With no height information at all', `${fmt(hood.noHeightInfo)} <span class="rd-share">· ${pct(hood.noHeightInfo, fp)}</span>`)}
      </dl>
      <p class="rd-note">Counted against the pinned OpenStreetMap snapshot${fabric.snapshotAsOf ? ` of ${String(fabric.snapshotAsOf).slice(0, 10)}` : ''} on ${fabric.measuredOn}. ${fmt(boxes.explicitHeight || 0)} buildings carry an explicit height in the wider boxes the pipeline reads; ${fmt(hood.explicitHeight || 0)} of them fall inside a neighbourhood and are drawn. Nothing else in the snapshot states a height, so the flat outlines are the honest picture, not a missing download.</p>
    ` : '';

    host.innerHTML = `
      <div class="rd-callout">
        <b>Most of Bangkok cannot be honestly scored, and PLUB says so.</b>
        <p>${WorkAtmosphere
          ? `Of ${fmt(total)} places, ${fmt(anyDocumented)} carry at least one documented fact about working there, and ${fmt(publishable)} clear the coverage floor where a work-readiness score may be published at all. The mean documented coverage across the whole catalogue is ${(coverageSum / total * 100).toFixed(1)}%.`
          : `Of ${fmt(total)} places, the count of documented working facts is shown below.`}</p>
        <p class="rd-note">${liveVisitors
          ? 'Counted with the same rule as the place sheet: map tags, visitor ratings and named on-site reports.'
          : 'Counted with the same rule as the place sheet: map tags and named on-site reports. The visitor rating record was unreachable when this page was rendered, so visitor ratings are not counted in these figures.'}</p>
      </div>
      <h3 class="rd-head">The catalogue</h3>
      <dl class="rd-figures">${kindRows}
        ${row('Places in total', fmt(total))}
        ${row('From OpenStreetMap + Overture Maps', `${fmt(overture)} <span class="rd-share">· ${pct(overture, total)}</span>`, 'The rest are catalogue records without a mapped counterpart.')}
        ${row('Carrying a chain signal', `${fmt(chain)} <span class="rd-share">· ${pct(chain, total)}</span>`)}
        ${row('Neighbourhoods with a walked street sketch', fmt(areaCount))}
      </dl>
      <h3 class="rd-head">What is actually documented</h3>
      <dl class="rd-figures">
        ${row('Wi-Fi recorded', `${fmt(wifi)} <span class="rd-share">· ${pct(wifi, total)}</span>`, 'A map tag or a visitor report. A missing tag is not a claim that there is no Wi-Fi.')}
        ${row('Wi-Fi explicitly recorded as absent', fmt(nowifi))}
        ${row('Opening hours recorded', `${fmt(hours)} <span class="rd-share">· ${pct(hours, total)}</span>`)}
        ${row('Notable records', fmt(notable))}
        ${row('Hand pins — visited, not yet on the open map', fmt(hand))}
      </dl>
      <h3 class="rd-head">The Great Good Place index, by band</h3>
      <ul class="rd-dist">${dist}</ul>
      <p class="rd-note">The index is the average of access, scene and character, each ranked against every other place. Work and notable are shown in the interface but held out of the index: too few places carry them yet to rank fairly.</p>
      ${fabricRows}
    `;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
