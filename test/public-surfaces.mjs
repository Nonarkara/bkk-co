// A public site needs a way in, a way back, and a map of itself.
//
// Three surfaces were missing: a robots.txt, a sitemap, and a designed 404.
// The 404 mattered most — a lost reader was met with an empty body, which is
// the blankest possible answer to "where am I?".
//
// These checks read what ships, so the surfaces cannot quietly disappear again.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const repo = new URL('../', import.meta.url);
const read = async p => readFile(new URL(p, repo), 'utf8');
const exists = p => existsSync(new URL(p, repo));

// --- the way in -----------------------------------------------------------------
assert.ok(exists('public/robots.txt'), 'a public site needs a robots.txt');
const robots = await read('public/robots.txt');
assert.ok(/Sitemap:\s*https:\/\/co\.nonarkara\.org\/sitemap\.xml/.test(robots),
  'robots.txt must point at the sitemap');
assert.ok(/Allow:\s*\/v1/.test(robots), 'the read-only catalogue at /v1 is public by design and must be allowed');
assert.ok(/Disallow:\s*\/api\//.test(robots), 'the write APIs are not for crawlers');
assert.ok(/Disallow:\s*\/data\//.test(robots), 'the bulk data files are not for crawlers');

// --- the map of itself -----------------------------------------------------------
assert.ok(exists('public/sitemap.xml'), 'a public site needs a sitemap');
const sitemap = await read('public/sitemap.xml');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.ok(locs.length >= 6, `the sitemap lists ${locs.length} pages`);
for (const loc of locs) {
  assert.ok(loc.startsWith('https://'), `a sitemap entry must be absolute: ${loc}`);
  assert.ok(/co\.nonarkara\.org|club\.nonarkara\.org/.test(loc), `unexpected host in the sitemap: ${loc}`);
}
assert.ok(locs.some(l => l.includes('/v1') === false && l.endsWith('/')), 'the map is the first entry');
// Every page the sitemap names must actually exist as a shipped file.
const files = new Set(await readdir(new URL('public/', repo)));
for (const loc of locs) {
  const path = new URL(loc).pathname.replace(/^\//, '') || 'index.html';
  const base = path.endsWith('/') ? path + 'index.html' : path;
  const candidates = [base, base.replace(/\/$/, '') + '.html', base.replace(/\/$/, '')];
  assert.ok(candidates.some(c => files.has(c)), `the sitemap names ${loc}, which does not ship`);
}
// The notebook is private; it must never be indexed.
for (const loc of locs) {
  assert.ok(!/notebook|\/api\/|\/data\//.test(loc), `the sitemap must not point at a private or bulk surface: ${loc}`);
}

// --- the way back ----------------------------------------------------------------
assert.ok(exists('public/404.html'), 'a lost reader must be met with a page, not a blank body');
const notFound = await read('public/404.html');
assert.ok(/<html lang="en">/.test(notFound), 'the 404 page declares its language');
assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/.test(notFound), 'the 404 page carries no inline script');
for (const href of ['/', '/day', '/research']) {
  assert.ok(notFound.includes(`href="${href}"`), `the 404 page must offer a way back to ${href}`);
}
assert.ok(/not here|nothing at this address/i.test(notFound), 'the 404 page says what happened');
// And the Worker must actually serve it, with the same headers as everything else.
const worker = await read('src/worker.js');
assert.ok(/404\.html/.test(worker), 'the Worker must serve the 404 page');
assert.ok(/res\.status === 404/.test(worker), 'the Worker must recognise a missing page');
assert.ok(/res\.status === 404[^;]*startsWith\('\/data\/'\)/.test(worker),
  'a missing data file must stay a plain 404, not a page of HTML');

console.log('Public surfaces: robots.txt points at the sitemap, the sitemap names only real pages, and a missing address meets a designed page.');
