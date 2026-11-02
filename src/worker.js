import { validateScore } from './validate.js';

const DAILY_LIMIT = 20;
let ids; // catalogue ids, loaded once per isolate from the static asset

async function knownIds(env, url) {
  if (!ids) {
    ids = new Set();
    for (const f of ['work', 'food']) {
      const r = await env.ASSETS.fetch(new URL(`/data/places-${f}.json`, url));
      for (const row of (await r.json()).rows) ids.add(row[0]);
    }
  }
  return ids;
}

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });

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
  const text = await request.text();
  if (text.length > 512) return json({ error: 'too large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: 'invalid json' }, 400); }
  const { value, error } = validateScore(body, await knownIds(env, request.url));
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
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'bkkco.nonarkara.org') { // links shared on 2 Nov 2026 keep working
      url.hostname = 'co.nonarkara.org';
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === '/api/scores') {
      if (request.method === 'GET') return getScores(env);
      if (request.method === 'POST') return postScore(request, env);
      return json({ error: 'method not allowed' }, 405, { allow: 'GET, POST' });
    }
    return env.ASSETS.fetch(request);
  },
};
