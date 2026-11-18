#!/usr/bin/env node
/**
 * Stamp every asset reference with the fingerprint of the file it points at.
 *
 * The pages carried hand-written `?v=` strings, and they drifted: four assets
 * changed while their version string stayed, so a browser could keep serving
 * the old stylesheet or the old script after a release. The stamp is derived
 * from the bytes instead of from a person remembering to change a number, so a
 * changed asset always gets a new URL and an unchanged one keeps its cache.
 *
 *   node scripts/stamp-assets.mjs          rewrite the stamps
 *   node scripts/stamp-assets.mjs --check  fail if any stamp is out of date
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const CHECK = process.argv.includes('--check');

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 8);

// A reference is a local asset path with an optional ?v= stamp.
const REF = /(\b(?:href|src)=")(?!(?:https?:|data:|\/\/))([^"?#]+\.(?:css|js|woff2|png|webp|svg|ico|json|webmanifest))(\?v=[^"]*)?(")/g;

const pages = (await readdir(PUBLIC)).filter(f => f.endsWith('.html'));
const changed = [];
const unstamped = [];

// Collect first: the replacement itself is synchronous, so every fingerprint is
// computed before any page is rewritten.
for (const page of pages) {
  const text = await readFile(path.join(PUBLIC, page), 'utf8');
  for (const m of text.matchAll(REF)) {
    const asset = m[2];
    if (asset.startsWith('//') || asset.includes('${')) continue;
    let digest;
    try {
      digest = sha(await readFile(path.join(PUBLIC, asset.replace(/^\//, ''))));
    } catch {
      continue; // not a file we ship; leave it alone
    }
    const next = `?v=${digest}`;
    if (m[3] !== next) changed.push(`${page}: ${asset} ${m[3] || '(none)'} → ${next}`);
    if (!m[3]) unstamped.push(`${page}: ${asset}`);
  }
}

for (const page of pages) {
  const file = path.join(PUBLIC, page);
  const text = await readFile(file, 'utf8');
  const stamps = new Map();
  for (const m of text.matchAll(REF)) {
    const asset = m[2];
    if (asset.startsWith('//') || asset.includes('${') || stamps.has(asset)) continue;
    try { stamps.set(asset, `?v=${sha(await readFile(path.join(PUBLIC, asset.replace(/^\//, ''))))}`); }
    catch { /* not a shipped file */ }
  }
  const stamped = text.replace(REF, (whole, open, asset, stamp, close) =>
    stamps.has(asset) ? `${open}${asset}${stamps.get(asset)}${close}` : whole);
  if (stamped !== text && !CHECK) await writeFile(file, stamped);
}

if (CHECK) {
  if (changed.length) {
    console.error(`FAIL — ${changed.length} asset stamp(s) are out of date:\n  ${changed.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`every asset reference in ${pages.length} pages carries the fingerprint of the file it points at`);
} else {
  console.log(changed.length ? changed.join('\n') : 'every stamp was already current');
  if (unstamped.length) console.log(`\nno stamp: ${unstamped.join(', ')}`);
}
