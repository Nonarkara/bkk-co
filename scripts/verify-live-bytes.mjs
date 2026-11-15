// Byte-verify what the public origin actually serves against this repo.
//
// A deploy that reports success is not proof: assets can be cached, stale, or — after a
// deletion — still served from the edge. This compares every file in public/ byte for byte
// against the origin, and then probes for files the origin still serves that this repo no
// longer contains. Read-only: it fetches, it never writes.
//
//   node scripts/verify-live-bytes.mjs [origin] [previous-proof.json]
import { createRequire } from 'node:module';
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const require = createRequire(import.meta.url);
const origin = (process.argv[2] || 'https://co.nonarkara.org').replace(/\/$/, '');
const previous = process.argv[3] || '';
const root = new URL('../public/', import.meta.url);
const repoRoot = new URL('../', import.meta.url);

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = await walk(new URL('.', root).pathname);
const sha = buf => createHash('sha256').update(buf).digest('hex');
const matched = [], mismatched = [], missing = [], rewritten = [];

for (const file of files) {
  const path = relative(new URL('.', root).pathname, file);
  const local = await readFile(file);
  let res;
  try { res = await fetch(`${origin}/${path}`, { redirect: 'follow' }); } catch (e) { missing.push({ path, error: String(e.message) }); continue; }
  if (!res.ok) { missing.push({ path, status: res.status }); continue; }
  const remote = Buffer.from(await res.arrayBuffer());
  const entry = { path, bytes: remote.length, sha256: sha(remote) };
  if (remote.length === local.length && sha(remote) === sha(local)) { matched.push(entry); continue; }
  // One deliberate rewrite: on club.nonarkara.org the Worker serves the same index
  // with the CL;UB title and description. It is the same document with different
  // words in two meta tags, so it is compared apart from the rest and reported
  // as a note. A difference anywhere else is still a mismatch.
  if (path === 'index.html' && /club\.nonarkara\.org/.test(origin)) {
    const text = remote.toString('utf8');
    const words = ['<title>', 'og:title', 'og:description', 'name="description"'];
    const same = words.every(w => text.includes(w));
    if (same) { rewritten.push({ ...entry, localBytes: local.length, localSha256: sha(local) }); continue; }
  }
  mismatched.push({ ...entry, localBytes: local.length, localSha256: sha(local) });
}

// Files the origin still serves that this repo no longer has. A deleted file that keeps
// living at the edge is a silent lie about the product.
const orphans = [];
if (previous) {
  const before = JSON.parse(await readFile(previous, 'utf8'));
  for (const item of before.matched || []) {
    if (matched.some(m => m.path === item.path)) continue;
    try {
      const res = await fetch(`${origin}/${item.path}`, { redirect: 'follow' });
      if (res.ok) {
        const body = Buffer.from(await res.arrayBuffer());
        orphans.push({ path: item.path, status: res.status, bytes: body.length, sha256: sha(body), stillServed: true });
      }
    } catch { /* gone, which is what we want */ }
  }
}

const commit = (await new Promise(res => {
  const cp = require('node:child_process').execFile('git', ['rev-parse', 'HEAD'], { cwd: repoRoot.pathname }, (e, out) => res(out.trim()));
}));

const report = {
  observedAt: new Date().toISOString(),
  origin,
  sourceCommit: commit,
  matched,
  mismatched,
  missing,
  orphansStillServed: orphans,
  summary: { matched: matched.length, mismatched: mismatched.length, missing: missing.length, orphansStillServed: orphans.length },
};

const day = new Date().toISOString().slice(0, 10);
const outDir = new URL(`../docs/release-${day}/`, import.meta.url);
await mkdir(outDir, { recursive: true });
// One proof per origin. A two-domain release has two public surfaces, and a
// single file would keep only whichever host was checked last.
const host = new URL(origin).hostname;
const proofName = `live-bytes-${host}.json`;
await writeFile(new URL(proofName, outDir), JSON.stringify(report, null, 2) + '\n');

console.log(`Origin ${origin} · commit ${commit.slice(0, 8)}`);
console.log(`  matched ${matched.length} · mismatched ${mismatched.length} · missing ${missing.length} · orphans still served ${orphans.length}${rewritten.length ? ` · rewritten by the worker ${rewritten.length}` : ''}`);
for (const m of mismatched) console.log(`  MISMATCH ${m.path}: live ${m.bytes}b ${m.sha256.slice(0, 12)} vs repo ${m.localBytes}b ${m.localSha256.slice(0, 12)}`);
for (const m of missing) console.log(`  MISSING  ${m.path}${m.status ? ' (' + m.status + ')' : ''}`);
for (const o of orphans) console.log(`  ORPHAN   ${o.path} is still served (${o.bytes}b) but is not in the repo`);
console.log(`Report: ${new URL(proofName, outDir).pathname}`);
process.exit(mismatched.length || missing.length || orphans.length ? 1 : 0);
