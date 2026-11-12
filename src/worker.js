import { validateScore } from './validate.js';
import { notebookApi, readBody } from './notebook.js';
import { loadAliases, canon, catalogueUnavailable } from './aliases.js';
import { agentApi } from './agent-api.js';

const DAILY_LIMIT = 20;
let ids, cataloguePending; // publish only the complete catalogue and aliases, once per isolate
let names; // id -> [name, kind, index], for link previews
let hoods; // slug -> neighbourhood, for link previews

async function knownIds(env, url) {
  if(ids)return ids;
  if(!cataloguePending)cataloguePending=(async()=>{
    const nextIds=new Set(),nextNames=new Map();
    for(const f of ['work','food']){
      const r=await env.ASSETS.fetch(new URL(`/data/places-${f}.json`,url),{signal:AbortSignal.timeout(8000)});
      if(!r.ok)throw catalogueUnavailable();
      const d=await r.json();if(!Array.isArray(d.rows)||!Array.isArray(d.kinds))throw catalogueUnavailable();
      for(const row of d.rows){if(!Array.isArray(row)||typeof row[0]!=='string'||!d.kinds[row[2]])throw catalogueUnavailable();nextIds.add(row[0]);nextNames.set(row[0],[row[1],d.kinds[row[2]],row[7]]);}
    }
    await loadAliases(env,url,nextIds);
    names=nextNames;ids=nextIds;return ids;
  })().catch(()=>{cataloguePending=undefined;throw catalogueUnavailable();});
  return cataloguePending;
}

const SEC = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  // CSP: self-only scripts/styles, inline styles allowed for dynamic UI, images from self + data:, connect to self + OSM tiles + Overture + Google Maps directions.
  'content-security-policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.google.com https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://maps.googleapis.com https://maps.gstatic.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.openstreetmap.org https://overturemaps.org https://maps.googleapis.com https://www.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...SEC, ...headers } });

const secHeaders = (res) => {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(SEC)) h.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
};

async function hashIp(ip, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + '|' + ip));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getScores(env) {
  const { results } = await env.DB.prepare(
    `SELECT place_id, COUNT(*) n, ROUND(AVG(wifi),1) wifi, ROUND(AVG(power),1) power,
            ROUND(AVG(quiet),1) quiet, ROUND(AVG(laptop),1) laptop, MAX(day) last
     FROM ratings GROUP BY place_id`).all();
  const out = {};
  for (const r of results) out[r.place_id] = { n: r.n, wifi: r.wifi, power: r.power, quiet: r.quiet, laptop: r.laptop, last: r.last };
  return json(out, 200, { 'cache-control': 'public, max-age=60' });
}

async function postScore(request, env) {
  if (!env.IP_SALT) return json({ error: 'ratings are closed' }, 503); // fail closed without a salt
  if ((request.headers.get('content-type') || '').split(';')[0] !== 'application/json') return json({ error: 'json only' }, 415);
  let body;
  try { body = await readBody(request,512); } catch(e) { return json({ error:e.message },e.status||400); }
  let known;try{known=await knownIds(env,request.url)}catch{return json({error:catalogueUnavailable().message},503,{'retry-after':'5','cache-control':'no-store'})}
  if (body && typeof body === 'object') body.place = canon(body.place); // a retired twin's id rates its survivor
  const { value, error } = validateScore(body, known);
  if (error) return json({ error }, 400);

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ipHash = await hashIp(ip, env.IP_SALT);
  const now = new Date();
  const day = new Date(now.getTime() + 7 * 3600e3).toISOString().slice(0, 10); // Asia/Bangkok
  const { c } = await env.DB.prepare('SELECT COUNT(*) c FROM ratings WHERE ip_hash = ? AND day = ?').bind(ipHash, day).first();
  if (c >= DAILY_LIMIT) return json({ error: 'daily limit reached' }, 429);
  const res = await env.DB.prepare(
    `INSERT OR IGNORE INTO ratings (place_id, wifi, power, quiet, laptop, ip_hash, day, created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .bind(value.place, value.wifi, value.power, value.quiet, value.laptop, ipHash, day, now.toISOString()).run();
  if (!res.meta.changes) return json({ error: 'already rated this place today' }, 429);
  return json({ ok: true }, 201);
}

export default {
  async scheduled(_event, env) {
    const now=Date.now(),bucket=Math.floor(now/3600000);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM notebook_limits WHERE bucket<?').bind(bucket-24),
      env.DB.prepare('DELETE FROM notebook_sessions WHERE expires<?').bind(now),
    ]);
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'bkkco.nonarkara.org') { // links shared on 2 Nov 2026 keep working
      url.hostname = 'co.nonarkara.org';
      return secHeaders(Response.redirect(url.toString(), 301));
    }
    if (/^\/api\/(account|notebook|community|moderation|research|hops)(?:\/|$)/.test(url.pathname)) return secHeaders(notebookApi(request, env, () => knownIds(env, request.url)));
    // The agent-facing API: read-only, no account, no write. The catalogue and its evidence
    // are public; the notebook is not, and never appears here.
    if (url.pathname === '/v1' || url.pathname.startsWith('/v1/')) return secHeaders(agentApi(request, env, url));
    if (url.pathname === '/api/scores') {
      if (request.method === 'GET') return getScores(env);
      if (request.method === 'POST') return postScore(request, env);
      return json({ error: 'method not allowed' }, 405, { allow: 'GET, POST' });
    }
    if (url.pathname === '/' && ['hood', 'p', 'mood'].some(k => url.searchParams.has(k))) return secHeaders(withPreview(request, env, url));
    return secHeaders(env.ASSETS.fetch(request));
  },
};

// Shared links (LINE, WhatsApp, X) show the place or neighbourhood, not the generic page.
const KIND = { cafe: 'Café', restaurant: 'Food', coworking: 'Co-working', library: 'Library' };
async function withPreview(request, env, url) {
  const page = await env.ASSETS.fetch(new URL('/', url));
  let title, desc, image;
  try {
    const MOOD = { slow: 'slow mornings', midnight: 'studying past midnight', crossing: 'crossing paths', afterwork: 'after work' };
    if (MOOD[url.searchParams.get('mood')]) {
      title = `Bangkok places for ${MOOD[url.searchParams.get('mood')]} · PLUB`;
      desc = 'Great Good Places across the whole city, picked from open data. Nong Plub shows you where.';
    } else if (url.searchParams.has('hood')) {
      if (!hoods) hoods = Object.fromEntries((await (await env.ASSETS.fetch(new URL('/data/hoods.json', url))).json()).hoods.map(h => [h.slug, h]));
      const h = hoods[url.searchParams.get('hood')];
      if (h) { title = `${h.name} ${h.th} · for ${h.for.toLowerCase()} · PLUB`; desc = `${h.stats.work} work spots within 800 m of ${h.anchorLabel}. ${h.plub}`; image = `https://co.nonarkara.org/og/${h.slug}.png?v=clean-20261104b`; }
    } else {
      await knownIds(env, request.url);
      const n = names.get(canon(url.searchParams.get('p'))); // old shared links preview the survivor
      if (n) { title = `${n[0]} · PLUB`; desc = `${KIND[n[1]] || 'Place'} in Bangkok · Great Good Place index ${n[2]} of 100. Scored from open data, with Nong Plub as your guide.`; }
    }
  } catch { /* fall back to the generic preview */ }
  if (!title) return page;
  const set = (attr) => ({ element(e) { e.setAttribute('content', attr); } });
  return new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(title); } })
    .on('meta[property="og:title"]', set(title))
    .on('meta[property="og:description"]', set(desc))
    .on('meta[name="description"]', set(desc))
    .on('meta[property="og:image"]', image ? set(image) : {})
    .transform(page);
}
