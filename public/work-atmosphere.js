// Workspace atmosphere: what is actually documented about working somewhere, and by whom.
//
// Four tiers stay apart, because a reader must be able to tell them apart:
//   mapped   - what the map records (an OpenStreetMap tag, with its date)
//   venue    - what the venue claims about itself (operator, brand, website, description)
//   visitor  - what people who went there report (Wi-Fi, power, quiet, laptop welcome)
//   inferred - what this page computes, and says so
//
// Nothing here is a rating of a place. A dimension with no evidence stays unknown and is
// named as unknown; it never becomes zero. The composite is published only when enough of
// the weight is documented, and it always states its coverage.
(function (root) {
  'use strict';

  // The composite weights come from the research brief. A dimension with no evidence is
  // excluded from the mean and counted against the coverage instead of being scored 0.
  const DIMENSIONS = [
    { key: 'wifi', label: 'Wi-Fi', weight: 0.25 },
    { key: 'seating', label: 'Seating & comfort', weight: 0.20 },
    { key: 'power', label: 'Power access', weight: 0.15 },
    { key: 'focus', label: 'Noise & focus', weight: 0.15 },
    { key: 'stay', label: 'Long-stay policy', weight: 0.10 },
    { key: 'value', label: 'Price', weight: 0.10 },
    { key: 'access', label: 'Step-free access', weight: 0.05 },
  ];
  // Named in the brief, and genuinely absent from public map data. They are shown as
  // undocumented rather than quietly dropped, so the gap is visible.
  const NOT_MAPPED = [
    { key: 'meeting', label: 'Meeting rooms' },
    { key: 'booth', label: 'Phone booths' },
    { key: 'table', label: 'Table type' },
    { key: 'speed', label: 'Download / upload speed' },
  ];
  const MIN_COVERAGE = 0.5;

  const lookup = (source, id) => (source instanceof Map ? source.get(id) : source ? source[id] : undefined);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const osmURL = id => /^[nwr]\d+$/.test(id || '') ? `https://www.openstreetmap.org/${{ n: 'node', w: 'way', r: 'relation' }[id[0]]}/${id.slice(1)}` : null;
  const asDate = data => data?.raw?.geo?.manifest?.asOf || data?.raw?.join?.manifest?.asOf || 'snapshot date unknown';
  const lower = v => String(v ?? '').trim().toLowerCase();

  // A fact is evidence, not a grade. `value` null means unknown.
  const fact = (value, basis, note, sources) => ({ value, basis, note, sources: sources || [] });
  const unknown = note => ({ ...fact(null, 'unknown', note || 'Not documented; check with the venue.', []), points: null });

  // --- evidence readers ---------------------------------------------------------
  // Visitor fields are 1=None/No, 2=OK, 3=Yes/Welcome. That is a report, not a measurement.
  const visitorScore = (scores, p, field) => {
    const score = lookup(scores, p.id);
    if (!(score?.n > 0) || typeof score?.[field] !== 'number' || !Number.isFinite(score[field])) return null;
    if (score[field] < 1 || score[field] > 3) return null;
    return { value: score[field], n: score.n, last: score.last, field };
  };
  const visitorScorePoints = s => (s.value === 3 ? 100 : s.value === 2 ? 50 : 0);
  const visitorNote = (s, label) => `${s.n} visitor report${s.n === 1 ? '' : 's'}; ${label} average ${s.value}/3 (1 No, 2 OK, 3 Yes). A report from visitors, not a measured figure.`;

  function mappedSources(p, asOf, extra) {
    const url = osmURL(p.id);
    return [{ label: `OpenStreetMap ${p.id}`, url, date: asOf, tier: 'mapped' }, ...(extra || [])];
  }
  function venueSources(p, tags, asOf) {
    const out = [];
    const site = tags.website || tags['contact:website'];
    if (site) out.push({ label: `Venue site${tags['contact:instagram'] || tags['contact:facebook'] ? ' and social' : ''}`, url: /^https?:\/\//i.test(site) ? site : null, date: asOf, tier: 'venue claim' });
    for (const [key, label] of [['contact:instagram', 'Venue Instagram'], ['contact:facebook', 'Venue Facebook'], ['contact:line', 'Venue LINE']]) {
      if (!tags[key]) continue;
      const handle = String(tags[key]).replace(/^@/, '');
      out.push({ label: `${label} @${handle}`, url: null, date: asOf, tier: 'venue claim' });
    }
    return out;
  }

  // --- dimension derivations ----------------------------------------------------
  // Each returns {value, basis, note, sources, points|null}. points null means unknown.
  function wifiDimension(p, tags, facilities, scores, asOf) {
    const visitor = visitorScore(scores, p, 'wifi');
    if (visitor) {
      const access0 = lower(tags.internet_access);
      const mappedValue = access0 === 'no' ? false : ['wlan', 'yes'].includes(access0) ? true : (p.flags & 2) ? false : (p.flags & 1) ? true : null;
      // A visitor report and a mapped tag can disagree. Both are stated, not hidden.
      const conflict = mappedValue !== null && mappedValue !== (visitor.value >= 2);
      return {
        value: visitor.value >= 2, basis: 'visitor', points: visitorScorePoints(visitor),
        note: visitorNote(visitor, 'Wi-Fi') + (conflict ? ` The map record disagrees: it records internet_access=${access0 || (mappedValue ? 'yes' : 'no')}. Both are shown.` : ''),
        sources: [{ label: 'PLUB visitor reports', url: `https://co.nonarkara.org/?p=${encodeURIComponent(p.id)}`, date: visitor.last || 'rating date unknown', tier: 'visitor' },
          ...(mappedValue !== null ? mappedSources(p, asOf) : (facilities?.wifi?.sources || []))],
      };
    }
    const access = lower(tags.internet_access);
    if (access === 'no') return { value: false, basis: 'mapped', points: 0, note: 'The map records internet_access=no.', sources: mappedSources(p, asOf) };
    if (['wlan', 'yes'].includes(access)) return { value: true, basis: 'mapped', points: access === 'terminal' ? 40 : 100, note: `The map records internet_access=${access}.`, sources: mappedSources(p, asOf) };
    if (p.flags & 2) return { value: false, basis: 'mapped', points: 0, note: 'The catalogue has an explicit no-internet tag.', sources: mappedSources(p, asOf) };
    if (p.flags & 1) return { value: true, basis: 'mapped', points: 100, note: 'The catalogue has a Wi-Fi tag.', sources: mappedSources(p, asOf) };
    const f = facilities?.wifi;
    if (f && typeof f.value === 'boolean') {
      const points = f.value ? (access === 'terminal' ? 40 : 100) : 0;
      return { value: f.value, basis: f.basis === 'osm' ? 'mapped' : f.basis, points, note: f.note, sources: f.sources || [] };
    }
    return unknown();
  }

  function powerDimension(p, tags, facilities, scores, asOf) {
    const visitor = visitorScore(scores, p, 'power');
    if (visitor) {
      return {
        value: visitor.value >= 2, basis: 'visitor', points: visitorScorePoints(visitor),
        note: visitorNote(visitor, 'outlets') + ' An outlet at your seat is not assured.',
        sources: [{ label: 'PLUB visitor reports', url: `https://co.nonarkara.org/?p=${encodeURIComponent(p.id)}`, date: visitor.last || 'rating date unknown', tier: 'visitor' }],
      };
    }
    const direct = lower(tags.socket ?? tags.power_supply);
    // Ordinary mains sockets only. EV connectors and generation types are not laptop outlets.
    const mainsCount = ['schuko', 'bs1363', 'nema_5_15', 'nema_5_20']
      .map(type => tags['socket:' + type])
      .find(c => c === 'yes' || (typeof c === 'string' && /^\d+$/.test(c) && Number(c) > 0));
    if (['no', '0', 'none'].includes(direct)) return { value: false, basis: 'mapped', points: 0, note: `The map records socket/power_supply=${direct}.`, sources: mappedSources(p, asOf) };
    if (direct === 'yes') return { value: true, basis: 'mapped', points: 60, note: 'The map records socket/power_supply=yes. An outlet at your seat is not assured.', sources: mappedSources(p, asOf) };
    if (mainsCount !== undefined) {
      const n = /^\d+$/.test(String(mainsCount)) ? Number(mainsCount) : 1;
      return { value: true, basis: 'mapped', points: Math.min(100, 60 + (n - 1) * 8), note: `The map records ${n} ordinary mains socket${n === 1 ? '' : 's'}. An outlet at your seat is not assured.`, sources: mappedSources(p, asOf) };
    }
    const f = facilities?.power;
    if (f && typeof f.value === 'boolean') {
      // A documented socket is supply, not comfort: presence alone is capped below full marks.
      const points = f.value ? 60 : 0;
      return { value: f.value, basis: f.basis === 'osm' ? 'mapped' : f.basis, points, note: f.note, sources: f.sources || [] };
    }
    return unknown();
  }

  function focusDimension(p, scores) {
    const visitor = visitorScore(scores, p, 'quiet');
    if (!visitor) return unknown('Nobody has reported the noise level. Ask when you arrive.');
    return {
      value: visitor.value >= 2, basis: 'visitor', points: visitorScorePoints(visitor),
      note: visitorNote(visitor, 'quiet') + ' Quiet is what a visitor noticed on one visit, not a sound measurement.',
      sources: [{ label: 'PLUB visitor reports', url: `https://co.nonarkara.org/?p=${encodeURIComponent(p.id)}`, date: visitor.last || 'rating date unknown', tier: 'visitor' }],
    };
  }

  function seatingDimension(p, tags, asOf) {
    const capacity = Number(tags.capacity);
    if (Number.isFinite(capacity) && capacity > 0) {
      const points = capacity >= 30 ? 100 : capacity >= 15 ? 80 : capacity >= 5 ? 60 : 35;
      return {
        value: true, basis: 'mapped', points,
        note: `The map records a capacity of ${capacity} people for this venue. Capacity is a mapped figure, not a seat count.`,
        sources: mappedSources(p, asOf),
      };
    }
    const outdoor = lower(tags.outdoor_seating);
    if (outdoor === 'yes' || outdoor === 'true') {
      const chairs = tags['outdoor_seating:chairs'];
      return {
        value: true, basis: 'mapped', points: 55,
        note: `The map records outdoor seating${chairs ? ` (${chairs} chairs)` : ''}. Seating inside is not recorded.`,
        sources: mappedSources(p, asOf),
      };
    }
    if (outdoor === 'no') {
      return { value: false, basis: 'mapped', points: 30, note: 'The map records outdoor_seating=no. Indoor seating is not counted.', sources: mappedSources(p, asOf) };
    }
    return unknown('Seating is not recorded for this venue.');
  }

  function stayDimension(p, tags, asOf) {
    const access = lower(tags.access);
    const hours = tags.opening_hours || '';
    let points = null, base = null, note = '';
    if (['private', 'no', 'permit', 'military'].includes(access)) {
      base = 0; note = `The map records access=${access}: not open for working.`;
    } else if (access === 'customers') {
      base = 45; note = 'The map records access=customers: you are expected to buy something.';
    } else if (['yes', 'permissive', 'designated'].includes(access)) {
      base = 75; note = `The map records access=${access}.`;
    }
    const late = lateClose(hours);
    if (base !== null) {
      let p2 = base;
      if (late === 'always') { p2 = Math.min(100, p2 + 25); note += ' Recorded opening hours run around the clock.'; }
      else if (late) { p2 = Math.min(100, p2 + 15); note += ` Recorded hours close at ${late}.`; }
      points = p2;
      return { value: true, basis: 'mapped', points, note, sources: mappedSources(p, asOf) };
    }
    if (hours) {
      // Hours alone say when the door is open, not how long you may stay.
      return {
        value: null, basis: 'mapped', points: null,
        note: `Recorded opening hours (${hours}) say when the door is open. No long-stay policy is recorded.`,
        sources: mappedSources(p, asOf),
      };
    }
    return unknown('No long-stay policy is recorded for this venue.');
  }

  function valueDimension(p, tags, asOf) {
    const fee = lower(tags.fee);
    const wifiFee = lower(tags['internet_access:fee']);
    const charge = lower(tags.charge);
    if (fee === 'no') return { value: true, basis: 'mapped', points: 100, note: 'The map records fee=no: no charge to enter or use.', sources: mappedSources(p, asOf) };
    if (fee === 'yes') return { value: false, basis: 'mapped', points: 40, note: 'The map records fee=yes. The amount is not recorded.', sources: mappedSources(p, asOf) };
    if (charge === 'yes') return { value: false, basis: 'mapped', points: 35, note: 'The map records charge=yes. The amount is not recorded.', sources: mappedSources(p, asOf) };
    if (wifiFee === 'yes') return { value: false, basis: 'mapped', points: 30, note: 'The map records a charge for internet access. The amount is not recorded.', sources: mappedSources(p, asOf) };
    if (wifiFee === 'no') return { value: true, basis: 'mapped', points: 75, note: 'The map records no charge for internet access. Other charges are not recorded.', sources: mappedSources(p, asOf) };
    return unknown('No price is recorded for this venue.');
  }

  function accessDimension(p, tags, asOf) {
    const value = lower(tags.wheelchair);
    if (value === 'yes') return { value: true, basis: 'mapped', points: 100, note: 'The map records wheelchair=yes.', sources: mappedSources(p, asOf) };
    if (value === 'limited') return { value: 'limited', basis: 'mapped', points: 50, note: 'The map records wheelchair=limited.', sources: mappedSources(p, asOf) };
    if (value === 'no') return { value: false, basis: 'mapped', points: 0, note: 'The map records wheelchair=no.', sources: mappedSources(p, asOf) };
    return unknown('Step-free access is not recorded for this venue.');
  }

  // The latest close time in an OSM opening_hours string, or 'always' for 24/7.
  function lateClose(hours) {
    if (!hours) return null;
    if (/24\/7|00:00-24:00/.test(hours)) return 'always';
    const closes = [...hours.matchAll(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g)].map(m => Number(m[3]) * 60 + Number(m[4]));
    if (!closes.length) return null;
    // A close at 00:00 is midnight, not lunchtime.
    const last = Math.max(...closes) || 24 * 60;
    return last >= 22 * 60 ? `${String(Math.floor(last / 60) % 24).padStart(2, '0')}:${String(last % 60).padStart(2, '0')}` : null;
  }

  // --- profile ------------------------------------------------------------------
  function profile(p, data, scores = {}, facilities) {
    const tags = data?.raw?.join?.venueTags?.[p.id]?.tags || {};
    const asOf = asDate(data);
    const f = facilities || null;
    const dimensions = {
      wifi: wifiDimension(p, tags, f, scores, asOf),
      seating: seatingDimension(p, tags, asOf),
      power: powerDimension(p, tags, f, scores, asOf),
      focus: focusDimension(p, scores),
      stay: stayDimension(p, tags, asOf),
      value: valueDimension(p, tags, asOf),
      access: accessDimension(p, tags, asOf),
    };
    const scored = DIMENSIONS.filter(d => typeof dimensions[d.key].points === 'number');
    const weight = scored.reduce((a, d) => a + d.weight, 0);
    const total = DIMENSIONS.reduce((a, d) => a + d.weight, 0);
    const coverage = total ? weight / total : 0;
    const score = weight ? Math.round(scored.reduce((a, d) => a + d.weight * dimensions[d.key].points, 0) / weight) : null;
    const missing = DIMENSIONS.filter(d => typeof dimensions[d.key].points !== 'number').map(d => d.label);
    const claims = venueClaims(p, tags, asOf);
    return {
      dimensions, score, coverage, missing, claims,
      scored: scored.length, total: DIMENSIONS.length,
      // A score is published only when enough of the weight is documented.
      publishable: coverage >= MIN_COVERAGE,
      notMapped: NOT_MAPPED.map(n => n.label),
    };
  }

  // What the venue says about itself. These are claims, never scores.
  function venueClaims(p, tags, asOf) {
    const out = [];
    if (tags.operator) out.push({ label: 'Operator', value: tags.operator });
    if (tags.brand) out.push({ label: 'Brand', value: tags.brand });
    if (tags.office) out.push({ label: 'Mapped office type', value: tags.office });
    if (tags.description) out.push({ label: 'Own description', value: tags.description, truncated: tags.description_truncated === 'yes' });
    const sources = venueSources(p, tags, asOf);
    return { items: out, sources };
  }

  // --- rendering ----------------------------------------------------------------
  // Plain words, one voice. A reader must be able to understand the rules without reading
  // the source: what "documented" means, who documented it, and what the score is not.
  const TIER_WORDS = { mapped: 'on the map', visitor: 'visitors report', venue: 'the venue says', first_party: 'the venue says', publisher: 'a publisher states', editorial: 'a publisher states' };
  function render(p, data, scores = {}, facilities) {
    const r = profile(p, data, scores, facilities);
    const row = d => {
      const f = r.dimensions[d.key];
      const known = typeof f.points === 'number';
      const mark = !known ? '\u25CB' : f.value === true ? '\u2713' : f.value === false ? '\u00D7' : '~';
      const state = !known ? 'unknown' : f.value === true ? 'documented' : f.value === false ? 'absent' : 'partial';
      const word = !known ? 'not documented' : f.value === true ? 'documented' : f.value === false ? 'recorded as absent' : 'partly recorded';
      const who = known ? (TIER_WORDS[f.basis] || 'recorded') : '';
      return `<div class="wa-row" data-wa="${d.key}" data-state="${state}"><dt>${esc(d.label)}</dt><dd><span class="wa-mark" aria-hidden="true">${mark}</span> ${esc(word)}${who ? ` <span class="wa-who">\u00B7 ${esc(who)}</span>` : ''}${known ? ` <span class="wa-points">${f.points}/100</span>` : ''}</dd></div>`;
    };
    const verdict = r.publishable
      ? `<p class="wa-verdict"><b>Work readiness ${r.score} out of 100</b><span>Worked out from the ${r.scored} of ${r.total} things that are documented${r.missing.length ? '. Still not documented: ' + esc(r.missing.join(', ')) : '. Every dimension has a source'}.</span></p>`
      : `<p class="wa-verdict wa-unscored"><b>Not enough is documented to score this place</b><span>${r.scored} of ${r.total} things are documented. PLUB will not guess the rest.</span></p>`;
    const rule = `<p class="wa-rule"><b>What "documented" means:</b> someone wrote it down \u2014 on the open map, by the venue itself, or by people who went there. Everything else stays unknown. The score measures what is recorded, not how good the place is.</p>`;
    const notMapped = `<p class="wa-rule wa-rule--quiet">No public map records these at all: ${esc(r.notMapped.join(', '))}. Ask the venue.</p>`;
    const claims = r.claims.items.length || r.claims.sources.length
      ? `<details class="wa-claims"><summary>What the venue says about itself</summary>${r.claims.items.map(c => `<p><b>${esc(c.label)}:</b> ${esc(c.value)}${c.truncated ? ' <span class="wa-trunc">(truncated)</span>' : ''}</p>`).join('')}${r.claims.sources.length ? `<p class="wa-claim-sources">${r.claims.sources.map(s => s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.label)}</a>` : esc(s.label)).join(' \u00B7 ')}</p>` : ''}<p class="src">A venue claim is what the operator wrote about itself. PLUB has not checked it.</p></details>`
      : '';
    const detail = DIMENSIONS.map(d => {
      const f = r.dimensions[d.key];
      return `<p><b>${esc(d.label)}</b> \u00B7 ${esc(f.note)}${f.sources.length ? `<br>${f.sources.map(s => s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.label)}</a>` : esc(s.label)).join(' \u00B7 ')}` : ''}</p>`;
    }).join('');
    return `<section class="work-atmosphere" aria-label="Workspace atmosphere">
      <h2>Working here</h2>
      ${verdict}
      <dl class="wa-grid">${DIMENSIONS.map(row).join('')}</dl>
      ${rule}${notMapped}${claims}
      <details class="wa-detail"><summary>Every dimension, and where it came from</summary>${detail}<p class="src">Mapped means the open map records it. Venue means the operator wrote it about itself. Visitor means people who went there reported it. Inferred means this page worked it out.</p></details>
    </section>`;
  }

  function tierLabel(basis) {
    return { mapped: 'mapped', venue: 'venue claim', visitor: 'visitor report', publisher: 'publisher', editorial: 'publisher', first_party: 'venue claim', osm: 'mapped', unknown: 'unknown' }[basis] || basis;
  }

  // Catalogue order: scored first, then by score, then by how much is documented.
  function rank(rows, data, scores = {}, facilitiesFor) {
    return rows.map((row, index) => {
      const p = row.p || row;
      const r = profile(p, data, scores, facilitiesFor ? facilitiesFor(p) : undefined);
      return { ...row, atmosphere: r, atmosphereOrder: index };
    }).sort((a, b) => {
      if (a.atmosphere.publishable !== b.atmosphere.publishable) return a.atmosphere.publishable ? -1 : 1;
      if (a.atmosphere.publishable && a.atmosphere.score !== b.atmosphere.score) return b.atmosphere.score - a.atmosphere.score;
      if (a.atmosphere.coverage !== b.atmosphere.coverage) return b.atmosphere.coverage - a.atmosphere.coverage;
      return a.atmosphereOrder - b.atmosphereOrder;
    });
  }

  root.WorkAtmosphere = { DIMENSIONS, NOT_MAPPED, MIN_COVERAGE, profile, render, rank, lateClose, tierLabel };
  if (typeof module !== 'undefined') module.exports = root.WorkAtmosphere;
})(typeof window !== 'undefined' ? window : globalThis);
