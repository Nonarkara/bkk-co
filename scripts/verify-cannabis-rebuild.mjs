#!/usr/bin/env node
/**
 * Rebuild the CL;UB catalogue from the committed builder and compare it with the
 * shipped bytes. This is the check that a locked digest cannot make on its own:
 * the lock proves the file has not been hand-edited since it was written, this
 * proves it was written by the builder in the first place.
 *
 *   node scripts/verify-cannabis-rebuild.mjs
 *
 * A machine without the pinned sources cannot run it. That is a SKIP, never a
 * PASS — an unrun check is not a check.
 */
import { readFile, mkdtemp, rm, mkdir, writeFile, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(process.env.HOME, 'Projects/bangkok-ioc/source-cache');

const skip = (why) => {
  console.log(`SKIP — ${why}`);
  process.exit(0);
};

if (!existsSync(path.join(CACHE, 'thailand-261024.osm.pbf'))) {
  skip('the pinned OpenStreetMap snapshot is not on this machine');
}
if (!existsSync(path.join(CACHE, 'overture', 'places-2026-10-21.0-bkk.parquet'))) {
  skip('the pinned Overture Places release is not on this machine');
}

const tmp = await mkdtemp(path.join(os.tmpdir(), 'plub-cannabis-'));
// The builder resolves its sources as <root>/../source-cache, so the tree it
// runs in must have the cache beside it, not inside it.
const work = path.join(tmp, 'repo');
try {
  await mkdir(path.join(work, 'scripts'), { recursive: true });
  await mkdir(path.join(work, 'public', 'data'), { recursive: true });
  for (const f of ['build-places.py', 'build-cannabis.py']) {
    await writeFile(path.join(work, 'scripts', f), await readFile(path.join(ROOT, 'scripts', f)));
  }
  // The builder reads the signed catalogue to drop any cannabis venue that is
  // already a PL;UB place — a venue may not be listed twice. Rebuild without it
  // and the builder legitimately produces one more row, so the rebuild must be
  // seeded with the same signed files the repository holds.
  for (const f of ['places-work.json', 'places-food.json']) {
    await writeFile(path.join(work, 'public', 'data', f), await readFile(path.join(ROOT, 'public', 'data', f)));
  }
  await symlink(CACHE, path.join(tmp, 'source-cache'), 'dir');

  await run('python3', ['scripts/build-cannabis.py'], { cwd: work, maxBuffer: 64 * 1024 * 1024 });

  const rebuilt = await readFile(path.join(work, 'public', 'data', 'places-cannabis.json'));
  const shipped = await readFile(path.join(ROOT, 'public', 'data', 'places-cannabis.json'));
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  const a = sha(rebuilt), b = sha(shipped);
  if (a !== b) {
    console.error(`FAIL — the shipped catalogue is not what the builder produces.`);
    console.error(`  builder: ${a} (${rebuilt.length} bytes)`);
    console.error(`  shipped: ${b} (${shipped.length} bytes)`);
    console.error(`  run "python3 scripts/build-cannabis.py" and commit the result.`);
    process.exit(1);
  }
  const manifest = JSON.parse(await readFile(path.join(ROOT, 'public', 'data', 'manifest-cannabis.json'), 'utf8'));
  if (manifest.sha256 !== b) {
    console.error(`FAIL — the manifest records ${manifest.sha256} but the shipped file is ${b}.`);
    process.exit(1);
  }
  const n = JSON.parse(shipped).total;
  console.log(`the committed builder reproduces the shipped catalogue exactly: ${n} venues, sha256 ${b.slice(0, 12)}…`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
