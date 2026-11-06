import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('public/data/neighborhood-photos.json', root), 'utf8'));
assert.ok(manifest.photos.length >= 100, 'At least 100 genuinely distinct photo files');
assert.equal(new Set(manifest.photos.map(p => p.id)).size, manifest.photos.length);
assert.equal(new Set(manifest.photos.map(p => p.sourceSha1)).size, manifest.photos.length, 'No duplicate source bytes');
assert.equal(new Set(manifest.photos.map(p => p.sha256)).size, manifest.photos.length, 'No duplicate derivatives');
const counts = {};
for (const p of manifest.photos) {
  assert.match(p.license, /^(CC BY(?:-SA)? [1-4]\.0(?: [a-z]{2})?|CC0|Public domain)$/);
  for (const key of ['title','creator','sourcePage','licenseUrl','dateTaken','sourceSha1','credit','changes']) assert.ok(p[key], `${p.id}: missing ${key}`);
  assert.match(p.sourcePage, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.match(p.originalImageUrl, /^https:\/\/upload\.wikimedia\.org\//);
  assert.match(p.url, /^\/neighborhood-photos\/commons-\d+\.webp$/);
  assert.equal(p.aiGenerated, false);
  assert.equal(p.actualVenue, false, 'Never pretend neighborhood imagery shows a selected venue');
  assert.ok(p.association.description || p.association.categories.length);
  assert.ok(p.association.source === p.sourcePage);
  if (p.association.coords) {
    const [lat,lon] = p.association.coords;
    assert.ok(lat > 13.4 && lat < 14.1 && lon > 100.2 && lon < 100.95, `${p.id}: source coordinates outside Bangkok`);
  }
  assert.ok(p.width > 0 && p.height > 0 && p.width <= 640 && p.height <= 640);
  const bytes = await readFile(new URL('public' + p.url, root));
  assert.equal(bytes.subarray(0,4).toString(), 'RIFF');
  assert.equal(bytes.subarray(8,12).toString(), 'WEBP');
  assert.equal(bytes.length, p.bytes);
  assert.ok(bytes.length <= 80000);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), p.sha256);
  await stat(new URL(p.association.rawMetadata, root));
  for (const slug of p.neighborhoods) counts[slug] = (counts[slug] || 0) + 1;
}
for (const slug of ['ari','samyan','charoenkrung','thonglo','ramkhamhaeng']) assert.ok(counts[slug] >= 12, `${slug}: core area coverage missing`);
for (const hood of manifest.neighborhoods) assert.equal(counts[hood.slug], hood.count);
console.log(`PASS ${manifest.photos.length} attributed real photograph derivatives; core neighborhood coverage`, counts);
// Creator templates are not compact labels: preserve their notice in details.
const compact=JSON.parse(await readFile(new URL('../public/data/neighborhood-photos.json',import.meta.url),'utf8'));
assert(compact.photos.every(p=>p.creator.length<=120),'A creator notice must not inflate the compact caption');
const notices=compact.photos.filter(p=>p.creatorNotice);assert.equal(notices.length,5);for(const p of notices){assert.equal(p.creator,'Supanut Arunoprayote');assert(p.creatorNotice.startsWith('This Photo was taken by '+p.creator));assert(p.creatorNotice.includes('mention me as the author'));assert(p.credit.startsWith(p.creator+' · '))}
