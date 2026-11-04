// Retired place ids (public/data/aliases.json, written by scripts/clean-catalogue.py) point at the venue that
// absorbed them. Writes are rewritten to the survivor at the trust boundary so one venue never splits in two.
let map = new Map();
export async function loadAliases(env, url) {
  try {
    const r = await env.ASSETS.fetch(new URL('/data/aliases.json', url));
    if (r.ok) map = new Map(Object.entries(await r.json()));
  } catch { /* no aliases published: ids are used as given */ }
}
export const canon = id => (typeof id === 'string' && map.get(id)) || id;
