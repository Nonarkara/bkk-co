import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Compile reviewed facts only. This builder never geocodes or joins venue names.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const input = read('data/journey-evidence.json');
const catalogue = new Map(read('public/data/places-work.json').rows.map(row => [row[0], row]));
const fail = message => { throw new Error(`Journey evidence: ${message}`); };
const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value));
if (input.version !== 1 || !date(input.checked_at)) fail('invalid version/check date');
const allowedFacts = new Set(['wifi', 'power', 'parking', 'work_allowed', 'hours', 'access', 'day_pass', 'short_pass']);
const binaryFacts = new Set(['wifi', 'power', 'parking', 'work_allowed']);
const sources = {};
for (const [id, source] of Object.entries(input.sources)) {
  if (!source.publisher || !['first_party', 'editorial'].includes(source.tier) || !date(source.checked_at)) fail(`invalid source ${id}`);
  if (new URL(source.url).protocol !== 'https:') fail(`non-HTTPS source ${id}`);
  if (source.published_at !== null && !date(source.published_at)) fail(`invalid publication date ${id}`);
  if (source.updated_at != null && !date(source.updated_at)) fail(`invalid update date ${id}`);
  if (!source.raw_archive || !/^[a-f0-9]{64}$/.test(source.raw_sha256 || '')) fail(`missing raw archive ${id}`);
  sources[id] = { publisher: source.publisher, url: source.url, published_at: source.published_at, updated_at: source.updated_at ?? null, checked_at: source.checked_at, tier: source.tier };
}
const places = {};
for (const [id, place] of Object.entries(input.places)) {
  const row = catalogue.get(id);
  if (!row || row[1] !== place.name) fail(`unknown/changed catalogue identity ${id}`);
  if (!place.identity?.publisher_address || !place.identity?.reason) fail(`missing branch proof ${id}`);
  if (!place.source_ids.length || place.source_ids.some(source => !sources[source])) fail(`unknown source for ${id}`);
  for (const [key, fact] of Object.entries(place.facts)) {
    if (!allowedFacts.has(key) || !fact.note || !date(fact.checked_at)) fail(`invalid fact ${id}/${key}`);
    if (!fact.source_ids.length || fact.source_ids.some(source => !place.source_ids.includes(source))) fail(`unlinked evidence ${id}/${key}`);
    if (binaryFacts.has(key) && typeof fact.value !== 'boolean') fail(`invalid boolean ${id}/${key}`);
    if (key === 'hours' && typeof fact.value !== 'string') fail(`invalid hours ${id}`);
    if (['day_pass', 'short_pass'].includes(key)) {
      if (fact.value?.currency !== 'THB') fail(`missing price currency ${id}/${key}`);
      if (fact.value.amount_thb !== null && (!Number.isFinite(fact.value.amount_thb) || fact.value.amount_thb < 0)) fail(`invalid price ${id}/${key}`);
    }
  }
  // Coordinates stay exclusively in the original open-data catalogue.
  places[id] = { name: place.name, area: place.area, source_ids: place.source_ids, facts: place.facts };
}
const output = { version: input.version, checked_at: input.checked_at, scope: input.scope, places, sources };
const target = path.join(root, 'public/data/journey-evidence.json');
const outputBytes = `${JSON.stringify(output)}\n`;
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== outputBytes) fail('published snapshot differs from reviewed inputs');
} else {
  writeFileSync(target, outputBytes);
}
console.log(`Journey evidence: ${Object.keys(places).length} existing places, ${Object.keys(sources).length} attributed sources.`);
