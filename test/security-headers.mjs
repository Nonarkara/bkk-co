// The security headers must say what the interface actually does.
//
// A Content-Security-Policy is only worth having if it is narrow. The policy
// used to allow Google Fonts, Google Maps and the Places API — none of which
// the interface loads any more — which meant an injected script could reach
// three more origins than it needed. A policy that lists origins nobody uses
// is not security; it is decoration.
//
// These checks read the live policy out of the Worker and compare it with what
// the shipped code actually loads.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const repo = new URL('../', import.meta.url);
const read = async p => readFile(new URL(p, repo), 'utf8');

const worker = await read('src/worker.js');
const sec = worker.match(/const SEC = \{([\s\S]*?)\n\};/);
assert.ok(sec, 'the Worker still declares its security headers');
const block = sec[1];

const header = name => {
  const m = block.match(new RegExp(`'${name}':\\s*'([^']+)'`));
  return m ? m[1] : null;
};

// --- the basics a public site needs ----------------------------------------------
assert.equal(header('x-content-type-options'), 'nosniff', 'nosniff must be set');
assert.equal(header('x-frame-options'), 'DENY', 'the site must refuse to be framed');
assert.equal(header('referrer-policy'), 'strict-origin-when-cross-origin');
assert.ok(header('permissions-policy'), 'a permissions policy must be declared');
const hsts = header('strict-transport-security');
assert.ok(hsts, 'HSTS must be set: a browser that has seen HTTPS once must not try plain HTTP again');
assert.ok(/max-age=(\d{7,})/.test(hsts), 'HSTS needs a real max-age');
assert.ok(Number(hsts.match(/max-age=(\d+)/)[1]) >= 31536000, 'HSTS for at least a year');
assert.ok(/includeSubDomains/.test(hsts), 'HSTS must cover the subdomains');

// --- the policy itself ------------------------------------------------------------
const csp = block.match(/'content-security-policy':\s*\[([\s\S]*?)\]\.join/);
assert.ok(csp, 'the Worker still declares a content security policy');
const directives = new Map();
for (const line of csp[1].split('\n')) {
  const m = line.trim().match(/^"([^"]+)"/);
  if (!m) continue;
  const [name, ...values] = m[1].split(/\s+/);
  directives.set(name, values);
}
assert.equal(directives.get('default-src')?.[0], "'self'", 'the default must be self');
assert.equal(directives.get('frame-ancestors')?.[0], "'none'", 'no site may frame this one');
assert.equal(directives.get('object-src')?.[0], "'none'", 'plugins must not load');
assert.equal(directives.get('base-uri')?.[0], "'self'");
assert.equal(directives.get('form-action')?.[0], "'self'");

// Scripts: no inline, no eval. The one inline script was moved to a file.
const scripts = directives.get('script-src') || [];
assert.ok(!scripts.includes("'unsafe-inline'"), "script-src must not allow inline scripts");
assert.ok(!scripts.includes("'unsafe-eval'"), "script-src must not allow eval");
for (const value of scripts) assert.equal(value, "'self'", `script-src allows ${value}, which the interface does not need`);

// The only origins the interface loads are the map's tile host and the talk embed.
const LOADED = new Set(['https://tiles.openfreemap.org', 'https://www.youtube-nocookie.com']);
for (const name of ['img-src', 'font-src', 'connect-src', 'frame-src', 'style-src', 'worker-src']) {
  for (const value of directives.get(name) || []) {
    if (value.startsWith("'") || value === 'blob:' || value === 'data:') continue;
    assert.ok(LOADED.has(value),
      `${name} allows ${value}, which nothing in the interface loads — a policy that lists unused origins is not security`);
  }
}

// And no shipped page may carry an inline script: script-src cannot say 'self' while it does.
const pages = (await readdir(new URL('public/', repo))).filter(f => f.endsWith('.html'));
assert.ok(pages.length >= 6, 'the site still has its pages');
for (const page of pages) {
  const html = await read(`public/${page}`);
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/.test(html),
    `${page} still carries an inline script; script-src cannot say 'self' while it does`);
}

console.log('Security headers: HSTS, no framing, no inline scripts, and a policy that lists only the origins the interface loads.');
