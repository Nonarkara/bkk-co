// Byte-verify what the public origin actually serves against this repo.
//
// A deploy that reports success is not proof: assets can be cached, stale, or — after a
// deletion — still served from the edge. This compares every file in public/ byte for byte
// against the origin, and then probes for files the origin still serves that this repo no
// longer contains. Read-only: it fetches, it never writes.
//
//   node scripts/verify-live-bytes.mjs [origin] [previous-proof.json]
import { createRequire } from 'node:module';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, relative, resolve, sep } from 'node:path';

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
const localPaths = new Set();
const transportErrors = [], httpErrors = [];
const timeout = 20000;
async function fetchAsset(path, phase) {
  try {
    const response = await fetch(new URL('/' + path, origin), {
      redirect: 'follow', signal: AbortSignal.timeout(timeout)
    });
    return { status: response.status, body: response.ok ? Buffer.from(await response.arrayBuffer()) : null };
  } catch (error) {
    transportErrors.push({ path, phase, error: error.name + ': ' + error.message });
    return null;
  }
}
const withoutPreviewText = text => text
  .replace(/<title>[^<]*<\/title>/, '<title></title>')
  .replace(/(<meta (?:property="og:(?:title|description)"|name="description") content=")[^"]*(")/g, '$1$2');

for (const file of files) {
  const path = relative(new URL('.', root).pathname, file);
  localPaths.add(path);
  const local = await readFile(file);
  const result = await fetchAsset(path, 'current');
  if (!result) continue;
  const { status, body: remote } = result;
  if (!remote) {
    (status === 404 || status === 410 ? missing : httpErrors).push({ path, status });
    continue;
  }
  const entry = { path, bytes: remote.length, sha256: sha(remote) };
  if (remote.length === local.length && sha(remote) === sha(local)) { matched.push(entry); continue; }
  // One deliberate rewrite: on club.nonarkara.org the Worker serves the same index
  // with the CL;UB title and description. It is the same document with different
  // words in two meta tags, so it is compared apart from the rest and reported
  // as a note. A difference anywhere else is still a mismatch.
  if (path === 'index.html' && new URL(origin).hostname === 'club.nonarkara.org') {
    const text = remote.toString('utf8');
    const same = /<title>CL;UB · [^<]+<\/title>/.test(text) &&
      withoutPreviewText(text) === withoutPreviewText(local.toString('utf8'));
    if (same) { rewritten.push({ ...entry, localBytes: local.length, localSha256: sha(local) }); continue; }
  }
  mismatched.push({ ...entry, localBytes: local.length, localSha256: sha(local) });
}

// Files the origin still serves that this repo no longer has. A deleted file that keeps
// living at the edge is a silent lie about the product.
const orphans = [];
if (previous) {
  const before = JSON.parse(await readFile(previous, 'utf8'));
  for (const item of [...(before.matched || []), ...(before.rewritten || [])]) {
    if (localPaths.has(item.path)) continue;
    const result = await fetchAsset(item.path, 'removed');
    if (!result) continue;
    const { status, body } = result;
    if (body) orphans.push({ path: item.path, status, bytes: body.length, sha256: sha(body), stillServed: true });
    else if (status !== 404 && status !== 410) httpErrors.push({ path: item.path, status });
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
  rewritten,
  transportErrors,
  httpErrors,
  orphansStillServed: orphans,
  summary: { matched: matched.length, mismatched: mismatched.length, missing: missing.length, orphansStillServed: orphans.length, transportErrors: transportErrors.length, httpErrors: httpErrors.length },
};

// Asia/Bangkok is UTC+7 and does not observe DST: file byte proofs under the
// local day the check ran, not the UTC day.
const day = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
const output = process.env.PLUB_PROOF_DIR;
const outDir = output ? pathToFileURL(resolve(output) + sep) : new URL(`../docs/release-${day}/`, import.meta.url);
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
for (const item of transportErrors) console.log('  TRANSPORT', item.path, item.phase, item.error);
for (const item of httpErrors) console.log('  HTTP', item.path, item.status);
console.log(`Report: ${fileURLToPath(new URL(proofName, outDir))}`);
process.exit(mismatched.length || missing.length || orphans.length || transportErrors.length || httpErrors.length ? 1 : 0);
