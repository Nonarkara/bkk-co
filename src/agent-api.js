// The agent-facing API: PLUB's evidence network, machine-readable.
//
// The design is taken from the agent-first architecture brief (docs/agent-api.md names the
// sources). What it adds to that brief is the part PLUB can actually stand behind: no Google
// scraping, no directory scraping, no private-group reading. The evidence here is the open map,
// the visitor record and published editorial facts — each with its source, its date and its tier.
//
// Every venue has one canonical record and many time-stamped evidence records. A fact is never
// overwritten; a dimension with no evidence stays unknown. The composite is labelled inferred and
// always states its coverage.

import WorkAtmosphere from '../public/work-atmosphere.js';

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', ...headers } });

const fail = (message, status = 400) => json({ error: message }, status);

// Evidence tiers, in the order the brief puts them. These are the weights PLUB would apply if
// it held the higher tiers; PLUB currently holds mapped and visitor evidence only.
export const TIERS = [
  { id: 'operator_claim', weight: 0.90, present: true, note: 'What the venue states about itself: operator, brand, website, description.' },
  { id: 'platform_reported', weight: 0.80, present: false, note: 'A commercial platform field. PLUB does not hold these; it does not scrape them.' },
  { id: 'visitor_reported', weight: 0.70, present: true, note: 'What people who went there report: Wi-Fi, outlets, quiet, laptop welcome.' },
  { id: 'onsite_reported', weight: 0.75, present: true, note: 'A named, dated first-hand account from someone who was in the room and working there. One visit, one day. It is kept apart from the open map and never merged with it.' },
  { id: 'editorial', weight: 0.80, present: true, note: 'A named publisher fact, with its own check date.' },
  { id: 'mapped', weight: 0.55, present: true, note: 'What the open map records, with the snapshot date.' },
  { id: 'single_report', weight: 0.45, present: false, note: 'One anonymous detailed review from a passer-by. PLUB keeps named on-site reports and visitor aggregates, not anonymous individual reviews.' },
  { id: 'social_mention', weight: 0.30, present: false, note: 'A social post. PLUB does not read private groups.' },
  { id: 'category_only', weight: 0.15, present: false, note: 'Inferred from the category. PLUB never infers a facility from a category.' },
  { id: 'conflicting', weight: 0.20, present: true, note: 'Until resolved, conflicting evidence is kept and shown, never averaged away.' },
];

let cache; // per-isolate snapshot of the published catalogue and its evidence
let journeyLoad;
let journeyRetryAt = 0;
function loadJourney(env, url) {
  if (journeyLoad) return journeyLoad;
  if (Date.now() < journeyRetryAt) return null;
  journeyLoad = (async () => {
    const r = await env.ASSETS.fetch(new URL('/data/journey-evidence.json', url), { signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error('Journey evidence unavailable');
    const data = await r.json();
    if (data?.version !== 1 || !data.places || !data.sources) throw new Error('Invalid journey evidence');
    return data;
  })().catch(() => {
    journeyRetryAt = Date.now() + 30000;
    journeyLoad = null;
    return null;
  });
  return journeyLoad;
}
async function load(env, url) {
  if (cache) return cache;
  const get = async path => {
    const r = await env.ASSETS.fetch(new URL(path, url), { signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error(`The catalogue is unavailable (${path}).`);
    return r.json();
  };
  const [places, joins, evidence, areas, reports] = await Promise.all([
    get('/data/places-work.json'), get('/data/journey-places.json'),
    get('/data/atlas-evidence.json').catch(() => ({ sources: [] })),
    get('/data/street-areas.json').catch(() => ({ areas: [] })),
    get('/data/venue-reports.json').catch(() => ({ reports: {} })),
  ]);
  const byId = new Map(places.rows.map(r => [r[0], {
    id: r[0], name: r[1], kind: places.kinds[r[2]], lat: r[3], lng: r[4], flags: r[5], index: r[7], hours: r[8] ?? null,
  }]));
  const scores = new Map();
  try {
    const { results } = await env.DB.prepare(
      'SELECT place_id, COUNT(*) n, ROUND(AVG(wifi),1) wifi, ROUND(AVG(power),1) power, ROUND(AVG(quiet),1) quiet, ROUND(AVG(laptop),1) laptop, MAX(day) last FROM ratings GROUP BY place_id'
    ).all();
    for (const r of results) scores.set(r.place_id, r);
  } catch { /* the visitor record is optional; venues stay unknown without it */ }
  // The snapshot's as-of date, licence and catalogue hashes live in the joins manifest.
  const manifest = { ...(places.manifest || {}), ...(joins.manifest || {}) };
  cache = { byId, kinds: places.kinds, manifest, tags: joins.venueTags || {}, scores, evidence, areas, reports: reports.reports || {} };
  return cache;
}

// The data shape the browser model already understands, so one rule set serves both.
const modelData = (c) => ({ raw: { join: { venueTags: c.tags }, geo: { manifest: { asOf: c.manifest.asOf || 'snapshot date unknown' } } } });

function journeyTier(source) {
  if (source?.tier === 'first_party') return 'operator_claim';
  if (source?.tier === 'editorial') return 'editorial';
  return null;
}

function journeyEvidenceFor(c, place) {
  const record = c.journey?.places?.[place.id];
  const displayName = value => String(value ?? '').normalize('NFC').trim().toLowerCase();
  if (!record || displayName(record.name) !== displayName(place.name)) return [];
  return Object.entries(record.facts || {}).flatMap(([field, fact]) =>
    (fact.source_ids || []).flatMap(id => {
      const source = c.journey.sources[id];
      const tier = journeyTier(source);
      if (!tier || !source.url || !fact.checked_at || fact.value == null ||
          !record.source_ids?.includes(id)) return [];
      return [{
        source: source.publisher, tier, claim: fact.note,
        source_id: `journey:${id}`, url: source.url,
        retrieved_at: fact.checked_at, state: 'documented', field, value: fact.value,
      }];
    })
  );
}

function evidenceFor(c, place) {
  const out = [];
  const tag = c.tags[place.id];
  if (tag) {
    for (const [key, value] of Object.entries(tag.tags || {})) {
      out.push({
        source: 'openstreetmap', tier: 'mapped', claim: `${key}=${value}`,
        source_id: tag.sourceID, url: `https://www.openstreetmap.org/${tag.sourceID[0] === 'n' ? 'node' : tag.sourceID[0] === 'w' ? 'way' : 'relation'}/${tag.sourceID.slice(1)}`,
        retrieved_at: c.manifest.asOf || null, state: 'documented',
      });
    }
  }
  const report = c.reports?.[place.id];
  if (report) {
    out.push({
      source: 'plub_onsite_report', tier: 'onsite_reported',
      claim: `On-site report by ${report.reporter} on ${report.date}`,
      source_id: place.id, url: report.page ? `https://co.nonarkara.org${report.page}` : null,
      retrieved_at: report.date || null, state: 'documented',
      detail: Object.fromEntries(Object.entries(report.facts || {}).map(([k, f]) => [k, f.band ?? null])),
    });
  }
  const score = c.scores.get(place.id);
  if (score && score.n > 0) {
    out.push({
      source: 'plub_visitors', tier: 'visitor_reported', claim: `${score.n} visitor report${score.n === 1 ? '' : 's'}`,
      source_id: place.id, url: `https://co.nonarkara.org/?p=${encodeURIComponent(place.id)}`,
      retrieved_at: score.last || null, state: 'documented',
    });
  }
  const editorial = c.evidence?.places?.[place.id];
  for (const id of editorial?.source_ids || []) {
    const s = (c.evidence.sources || []).find(x => x.id === id);
    if (!s) continue;
    out.push({
      source: s.publisher || id, tier: s.tier || 'editorial', claim: s.title || 'Published fact',
      source_id: id, url: s.url || null, retrieved_at: s.checked_at || s.updated_at || null, state: 'documented',
    });
  }
  return out.concat(journeyEvidenceFor(c, place));
}

function components(c, place) {
  const profile = WorkAtmosphere.profile(place, modelData(c), Object.fromEntries(c.scores), undefined, c.reports?.[place.id]);
  const out = {};
  for (const d of WorkAtmosphere.DIMENSIONS) {
    const f = profile.dimensions[d.key];
    out[d.key] = {
      label: d.label, weight: d.weight,
      value: f.value === undefined ? null : f.value,
      points: f.points === undefined ? null : f.points,
      basis: f.basis, state: f.points === null || f.points === undefined ? 'unknown' : (f.value === false ? 'absent' : 'documented'),
      note: f.note,
    };
  }
  return {
    score: profile.score, coverage: +profile.coverage.toFixed(3), published: profile.publishable,
    scored: profile.scored, total: profile.total, missing: profile.missing, not_mapped: profile.notMapped,
    not_mapped_detail: profile.notMappedDetail,
    components: out,
  };
}

const venue = (c, place) => {
  const report = c.reports?.[place.id] || null;
  return {
    venue_id: place.id, name: place.name, category: place.kind,
    location: { lat: place.lat, lng: place.lng },
    index: place.index ?? null, hours: place.hours,
    work_readiness: components(c, place),
    ...(report ? { on_site_report: onSiteReport(report) } : {}),
    last_verified: c.scores.get(place.id)?.last || report?.date || c.manifest.asOf || null,
    evidence_count: evidenceFor(c, place).length,
  };
};

// The on-site report, published whole: the reporter, the date, what was recorded,
// and what was not. A report is one person's account of one day.
function onSiteReport(report) {
  return {
    tier: 'onsite_reported',
    reporter: report.reporter, reporter_role: report.reporterRole || null, date: report.date,
    reported_kind: report.reportedKind || null,
    url: report.page ? `https://co.nonarkara.org${report.page}` : null,
    facts: Object.fromEntries(Object.entries(report.facts || {}).map(([k, f]) => [k, {
      band: f.band ?? null, detail: f.detail || null,
      measure: f.measure || null,
    }])),
    also_recorded: Object.fromEntries(Object.entries(report.alsoRecorded || {}).map(([k, f]) => [k, {
      band: f.band ?? null, detail: f.detail || null, measure: f.measure || null,
    }])),
    scene: report.scene || null,
    sources: (report.sources || []).map(x => ({ label: x.label, url: x.url || null, date: x.date || null, tier: x.tier || null, covers: x.covers || null })),
    observations: report.observations || [],
    photos: (report.photos || []).map(p => ({ src: p.src, caption: p.caption || null, credit: p.credit || null })),
  };
}

const metres = (a, b) => Math.hypot((a.lat - b.lat) * 111320, (a.lng - b.lng) * 111320 * Math.cos((a.lat + b.lat) * Math.PI / 360));

export async function agentApi(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return fail('method not allowed', 405);
  const path = url.pathname.replace(/\/+$/, '') || '/v1';
  let c;
  try { c = await load(env, url); } catch (e) { return fail(e.message, 503); }
  if (path.startsWith('/v1/venues') || path === '/v1/sources') {
    c = { ...c, journey: await loadJourney(env, url) };
  }
  const q = url.searchParams;
  const limit = Math.max(1, Math.min(500, Number(q.get('limit')) || 50));

  if (path === '/v1' || path === '/v1/') {
    return json({
      name: 'PLUB agent API', version: 1,
      description: 'Great good places in Bangkok, as an evidence network. One canonical record per venue, many time-stamped evidence records, and an inferred work-readiness composite that always states its coverage.',
      licence: 'Catalogue: OpenStreetMap (ODbL-1.0) and Overture Maps (CDLA-P-2.0). Editorial facts are credited to their publishers.',
      docs: '/v1/openapi.json · /docs/agent-api.md',
      endpoints: [
        '/v1/venues?lat&lng&radius&category&q&limit',
        '/v1/venues/{venue_id}',
        '/v1/venues/{venue_id}/evidence',
        '/v1/venues/{venue_id}/history',
        '/v1/neighbourhoods',
        '/v1/sources',
        '/v1/atmosphere',
        '/v1/changes?since=YYYY-MM-DD',
        '/v1/openapi.json',
      ],
      count: c.byId.size,
      snapshot: { asOf: c.manifest.asOf || null, catalogueSHA256: c.manifest.catalogueSHA256 || null },
    });
  }

  if (path === '/v1/openapi.json') {
    return json({
      openapi: '3.1.0', info: { title: 'PLUB agent API', version: '1.0.0' },
      paths: Object.fromEntries([
        ['/v1/venues', { get: { summary: 'Search venues', parameters: [{ name: 'lat', in: 'query', schema: { type: 'number' } }, { name: 'lng', in: 'query', schema: { type: 'number' } }, { name: 'radius', in: 'query', schema: { type: 'integer', default: 1500 } }, { name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }] } }],
        ['/v1/venues/{venue_id}', { get: { summary: 'One canonical venue record' } }],
        ['/v1/venues/{venue_id}/evidence', { get: { summary: 'Every evidence record behind a venue' } }],
        ['/v1/venues/{venue_id}/history', { get: { summary: 'When each evidence tier was last checked' } }],
        ['/v1/neighbourhoods', { get: { summary: 'The twelve street-sketch neighbourhoods' } }],
        ['/v1/sources', { get: { summary: 'Every source, its licence and its tier' } }],
        ['/v1/atmosphere', { get: { summary: 'The work-readiness model: dimensions, weights, tiers' } }],
        ['/v1/changes', { get: { summary: 'Evidence changes since a date' } }],
      ].map(([p, v]) => [p, v])),
    });
  }

  if (path === '/v1/atmosphere') {
    return json({
      dimensions: WorkAtmosphere.DIMENSIONS, not_mapped: WorkAtmosphere.NOT_MAPPED,
      min_coverage_to_publish: WorkAtmosphere.MIN_COVERAGE,
      report_bands: WorkAtmosphere.REPORT_BANDS,
      tiers: TIERS,
      rule: 'A dimension with no evidence stays unknown and is never scored zero. The composite is the weighted mean over the evidenced dimensions only, published only above the coverage floor, and always states the dimensions it could not score.',
      on_site_rule: 'A named, dated on-site report is its own tier. It never overrides the open map: where the two disagree, both are shown. A dimension the reporter did not record stays unknown.',
    });
  }

  if (path === '/v1/sources') {
    const published = (c.evidence.sources || []).map(s => ({
      id: s.id, publisher: s.publisher, title: s.title, url: s.url || null, tier: s.tier || 'editorial',
      checked_at: s.checked_at || null, updated_at: s.updated_at || null,
    }));
    return json({
      sources: [
        { id: 'openstreetmap', publisher: 'OpenStreetMap contributors', tier: 'mapped', licence: 'ODbL-1.0', url: 'https://www.openstreetmap.org/copyright', as_of: c.manifest.asOf || null },
        { id: 'overture', publisher: 'Overture Maps', tier: 'mapped', licence: 'CDLA-P-2.0', url: 'https://overturemaps.org', as_of: c.manifest.asOf || null },
        { id: 'plub_visitors', publisher: 'PLUB visitors', tier: 'visitor_reported', licence: 'PLUB community record', url: 'https://co.nonarkara.org', as_of: null },
        ...published,
        ...Object.entries(c.journey?.sources || {}).flatMap(([id, s]) => journeyTier(s) ? [{
          id: `journey:${id}`, publisher: s.publisher, url: s.url, tier: journeyTier(s),
          checked_at: s.checked_at, updated_at: s.updated_at ?? null,
        }] : []),
      ],
      tiers: TIERS,
    });
  }

  if (path === '/v1/neighbourhoods') {
    return json({
      count: (c.areas.areas || []).length,
      rule: (c.areas.manifest || {}).rule || null,
      radius_m: (c.areas.manifest || {}).radiusM || 800,
      neighbourhoods: (c.areas.areas || []).map(a => ({
        id: a.id, name: a.name, name_th: a.nameTh || null, district: a.district || null,
        kind: a.kind || null, anchor: a.anchor, radius_m: a.radiusM,
        cafes_within_radius: a.cafesWithin800m ?? null, mix: a.mix || {},
        basis: a.basis || null, anchor_name: a.anchorName || null,
      })),
    });
  }

  if (path === '/v1/changes') {
    const since = q.get('since');
    if (!since || !/^\d{4}-\d{2}-\d{2}$/.test(since)) return fail('since must be a YYYY-MM-DD date');
    const changed = [];
    for (const [id, s] of c.scores) {
      if (!s.last || String(s.last).slice(0, 10) < since) continue;
      const place = c.byId.get(id);
      if (place) changed.push({ venue_id: id, name: place.name, changed_at: s.last, tier: 'visitor_reported' });
    }
    changed.sort((a, b) => String(b.changed_at).localeCompare(String(a.changed_at)));
    return json({
      since,
      mapped_evidence_as_of: c.manifest.asOf || null,
      note: 'Mapped evidence changes when the catalogue is rebuilt; visitor evidence changes as people report. Editorial evidence carries its own check date.',
      count: changed.length,
      changes: changed.slice(0, 200),
    });
  }

  const vm = path.match(/^\/v1\/venues\/([^/]+)(\/(evidence|history))?$/);
  if (vm) {
    const id = decodeURIComponent(vm[1]);
    const place = c.byId.get(id);
    if (!place) return fail('no such venue', 404);
    const evidence = evidenceFor(c, place);
    if (vm[2] === '/evidence') return json({
      venue_id: id, count: evidence.length, evidence,
      journey_evidence_status: c.journey ? 'available' : 'unavailable',
    });
    if (vm[2] === '/history') {
      const tiers = {};
      for (const e of evidence) {
        const t = tiers[e.tier] || (tiers[e.tier] = { tier: e.tier, count: 0, latest: null, sources: new Set() });
        t.count++; t.sources.add(e.source);
        if (e.retrieved_at && (!t.latest || String(e.retrieved_at) > String(t.latest))) t.latest = e.retrieved_at;
      }
      return json({
        venue_id: id, name: place.name,
        mapped_evidence_as_of: c.manifest.asOf || null,
        tiers: Object.values(tiers).map(t => ({ tier: t.tier, count: t.count, last_checked: t.latest, sources: [...t.sources] })),
      });
    }
    return json({ ...venue(c, place), evidence, journey_evidence_status: c.journey ? 'available' : 'unavailable' });
  }

  if (path === '/v1/venues') {
    const lat = Number(q.get('lat')), lng = Number(q.get('lng'));
    const radius = Math.max(50, Math.min(20000, Number(q.get('radius')) || 1500));
    const category = q.get('category'), text = (q.get('q') || '').trim().toLowerCase();
    const sort = q.get('sort') || (q.get('lat') !== null ? 'distance' : 'index');
    // A filter on documented facts, not on an inferred score: only venues whose Wi-Fi, power,
    // seating or access is actually documented survive.
    const documented = (q.get('documented') || '').split(',').map(s => s.trim()).filter(Boolean)
      .map(k => WorkAtmosphere.DIMENSIONS.find(d => d.key === k)).filter(Boolean);
    // Number(null) is 0, not NaN: an absent coordinate must not filter around the Gulf of Guinea.
    const hasGeo = q.get('lat') !== null && q.get('lng') !== null && Number.isFinite(lat) && Number.isFinite(lng);
    let rows = [...c.byId.values()];
    if (category) {
      const wanted = category.split(',').map(s => s.trim()).filter(Boolean);
      rows = rows.filter(p => wanted.includes(p.kind));
    }
    // The text search covers the name and the category, so "cafe" finds the cafés.
    if (text) rows = rows.filter(p => p.name.toLowerCase().includes(text) || p.kind.includes(text));
    if (hasGeo) {
      rows = rows.map(p => ({ p, d: metres(p, { lat, lng }) })).filter(r => r.d <= radius).sort((a, b) => a.d - b.d).map(r => r.p);
    }
    const scores = Object.fromEntries(c.scores);
    if (documented.length) {
      const data = modelData(c);
      rows = rows.filter(p => {
        const pr = WorkAtmosphere.profile(p, data, scores, undefined, c.reports?.[p.id]);
        return documented.every(d => pr.dimensions[d.key].points !== null);
      });
    }
    if (sort === 'work') {
      const data = modelData(c);
      rows = rows.map(p => ({ p, r: WorkAtmosphere.profile(p, data, scores, undefined, c.reports?.[p.id]) }))
        .sort((a, b) => (b.r.publishable - a.r.publishable) || (b.r.score ?? -1) - (a.r.score ?? -1) || (b.r.coverage - a.r.coverage))
        .map(x => x.p);
    }
    const out = [];
    for (const p of rows.slice(0, limit)) {
      const v = venue(c, p);
      if (hasGeo) v.distance_m = Math.round(metres(p, { lat, lng }));
      out.push(v);
    }
    return json({ count: out.length, total: rows.length, limit, sort, snapshot: { asOf: c.manifest.asOf || null }, venues: out });
  }

  return fail('unknown endpoint', 404);
}
