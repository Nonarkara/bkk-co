// Pure map meanings: catalogue signals, not invented popularity or quality.
(function (root) {
  const indie = (p) => p.k === 'cafe' && !(p.flags & 32),
    sparse = (p) => indie(p) && p.d[3] <= 2;
  function icon(p, e = {}, rating = 0) {
    if (p.k !== 'cafe') return p.k;
    if (Number.isInteger(rating) && rating >= 4 && rating <= 5) return 'cafe-star';
    if (e.editorial_count > 0) return 'cafe-featured';
    if (sparse(p)) return 'cafe-hidden';
    return indie(p) ? 'cafe-indie' : 'cafe';
  }
  const dist = (a, b) =>
    Math.hypot(
      (a.y - b.y) * 111320,
      (a.x - b.x) * 111320 * Math.cos((((a.y + b.y) / 2) * Math.PI) / 180)
    );
  function triangles(places, centre, crosses) {
    const pool = places
        .filter(indie)
        .map((p) => ({ p, d: dist(p, centre) }))
        .filter((v) => v.d <= 3000)
        .sort((a, b) => a.d - b.d || a.p.id.localeCompare(b.p.id))
        .slice(0, 100)
        .map((v) => v.p),
      seen = new Set(),
      out = [];
    for (const a of pool) {
      const ns = pool
        .filter((b) => b !== a && dist(a, b) >= 150 && dist(a, b) <= 700 && !crosses(a, b))
        .sort((b, c) => dist(a, b) - dist(a, c))
        .slice(0, 8);
      for (let i = 0; i < ns.length; i++)
        for (let j = i + 1; j < ns.length; j++) {
          const b = ns[i],
            c = ns[j],
            ab = dist(a, b),
            ac = dist(a, c),
            bc = dist(b, c),
            key = [a.id, b.id, c.id].sort().join('|');
          if (seen.has(key) || bc < 150 || bc > 700 || crosses(b, c)) continue;
          seen.add(key);
          const s = (ab + ac + bc) / 2,
            area = Math.sqrt(Math.max(0, s * (s - ab) * (s - ac) * (s - bc)));
          if (area < 12000 || Math.min(ab, ac, bc) / Math.max(ab, ac, bc) < 0.4) continue;
          out.push({
            id: key,
            ids: [a.id, b.id, c.id],
            perimeter: Math.round(ab + ac + bc),
            area: Math.round(area),
            distance: Math.round((dist(a, centre) + dist(b, centre) + dist(c, centre)) / 3)
          });
        }
    }
    return out
      .sort(
        (a, b) => a.distance - b.distance || a.perimeter - b.perimeter || a.id.localeCompare(b.id)
      )
      .slice(0, 8);
  }
  root.AtlasModel = { indie, sparse, icon, dist, triangles };
  if (typeof module !== 'undefined') module.exports = root.AtlasModel;
})(typeof window !== 'undefined' ? window : globalThis);
