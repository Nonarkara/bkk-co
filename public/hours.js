// Minimal OSM opening_hours reader. Returns true (open), false (closed) or null (cannot tell).
// ponytail: covers "24/7", "Mo-Fr 08:00-18:00; Sa,Su 09:00-17:00", "off", overnight ranges.
// Anything else (PH, months, week numbers, sunrise) returns null; swap in the opening_hours npm lib if that matters.
(function (root) {
  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  function days(spec) {
    const set = new Set();
    for (const part of spec.split(',')) {
      const [a, b] = part.trim().split('-');
      const i = DAYS.indexOf(a), j = b ? DAYS.indexOf(b) : i;
      if (i < 0 || j < 0) return null;
      for (let d = i; ; d = (d + 1) % 7) { set.add(d); if (d === j) break; }
    }
    return set;
  }

  const mins = (t, end = false) => { const m = /^(\d{1,2}):(\d{2})$/.exec(t); if (!m || +m[2]>59 || +m[1]>23 && !(end && +m[1]===24 && +m[2]===0)) return null; return +m[1]*60 + +m[2]; };

  function isOpen(text, now) {
    if (!text) return null;
    const s = text.trim();
    if (s === '24/7') return true;
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return null;
    // Every venue is in Bangkok. A traveller's device timezone must never move its hours.
    const local = new Date(now.getTime() + 7*3600000);
    const day = local.getUTCDay(), prev = (day + 6) % 7, t = local.getUTCHours()*60 + local.getUTCMinutes();
    let result = false, matched = false;
    for (const rule of s.split(';').map(r => r.trim()).filter(Boolean)) {
      const m = /^((?:[A-Z][a-z](?:-[A-Z][a-z])?,?)+)?\s*(.*)$/.exec(rule);
      if (!m) return null;
      const dset = m[1] ? days(m[1]) : new Set([0, 1, 2, 3, 4, 5, 6]);
      if (!dset) return null;
      const body = m[2].trim();
      if (body === 'off' || body === 'closed') {
        if (dset.has(day)) { result = false; matched = true; }
        continue;
      }
      if (!body) return null;
      let today = false, spill = false;
      for (const range of body.split(',')) {
        const parts = range.trim().split('-');
        if (parts.length !== 2) return null;
        const [a, b] = parts;
        const from = mins(a), to = mins(b || '', true);
        if (from === null || to === null) return null;
        if (to > from) { if (t >= from && t < to) today = true; }
        else { // overnight, e.g. 18:00-02:00: open tonight, and spills into the next morning
          if (t >= from) today = true;
          if (t < to) spill = true;
        }
      }
      // later rules override earlier ones for the days they name (OSM semantics)
      if (dset.has(day)) { result = today; matched = true; }
      if (spill && dset.has(prev)) { result = true; matched = true; }
    }
    return matched ? result : false;
  }

  root.isOpen = isOpen;
  if (typeof module !== 'undefined') module.exports = { isOpen };
})(typeof window !== 'undefined' ? window : globalThis);
