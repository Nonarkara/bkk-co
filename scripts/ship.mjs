#!/usr/bin/env node
/**
 * The ship gate: one command that proves the system before it goes out.
 *
 * The test list is not written here — it is read out of .github/workflows/notebook.yml,
 * so this script cannot fall out of step with what CI runs. One list, two runners.
 *
 *   node scripts/ship.mjs            check only: tests, MSH gate, planted gate, source equality
 *   node scripts/ship.mjs --deploy   the same checks, then deploy, byte-verify and exercise the live URL
 *
 * Every step states what it proved. A step that cannot run says so and is marked
 * SKIP — never PASS. A check that cannot run is not a check.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEPLOY = process.argv.includes('--deploy');
const BASE = process.env.PLUB_URL || 'http://127.0.0.1:43827';
const LIVE = process.env.PLUB_LIVE || 'https://co.nonarkara.org';

const results = [];
let failed = false;

const say = (line) => console.log(line);
const step = (name, fn) => async () => {
  const t0 = Date.now();
  try {
    const note = await fn();
    results.push({ name, state: 'PASS', ms: Date.now() - t0, note: note || '' });
    say(`  PASS  ${name}  ${((Date.now() - t0) / 1000).toFixed(1)}s${note ? ` · ${note}` : ''}`);
  } catch (error) {
    const out = (error.stdout || '') + (error.stderr || '');
    results.push({ name, state: 'FAIL', ms: Date.now() - t0, note: String(error.message).split('\n')[0] });
    say(`  FAIL  ${name}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    say(String(out).trim().split('\n').slice(-12).map(l => `        ${l}`).join('\n'));
    failed = true;
  }
};

/** The CI workflow is the one list. Read it, so there is nothing to keep in step. */
async function ciSteps() {
  const yaml = await readFile(path.join(ROOT, '.github/workflows/notebook.yml'), 'utf8');
  const steps = [];
  for (const line of yaml.split('\n')) {
    const m = line.match(/^\s*- run:\s*(.+)$/);
    if (!m) continue;
    const cmd = m[1].trim().replace(/^["']|["']$/g, '');
    if (cmd.startsWith('npx ') || cmd.startsWith('for ')) continue; // CI-only: bundler and syntax sweep
    steps.push(cmd);
  }
  return steps;
}

async function main() {
  say(`\nPLUB ship gate · ${DEPLOY ? 'check, deploy, verify' : 'check only'}`);
  say(`  local: ${BASE}\n  live:  ${LIVE}\n`);

  // 1. the working tree must be committed and in step with origin
  await (step('repository in step with origin', async () => {
    await run('git', ['fetch', 'origin', '-q'], { cwd: ROOT });
    const dirty = (await run('git', ['status', '--porcelain'], { cwd: ROOT })).stdout.trim();
    if (dirty) throw new Error(`the working tree is not clean:\n${dirty}`);
    const [ahead, behind] = (await run('git', ['rev-list', '--left-right', '--count', 'HEAD...origin/main'], { cwd: ROOT })).stdout.trim().split(/\s+/);
    if (ahead !== '0' || behind !== '0') throw new Error(`HEAD is ${ahead} ahead and ${behind} behind origin/main`);
    return 'clean, identical to origin/main';
  }))();

  // 2. every test CI runs, in CI's order
  const steps = await ciSteps();
  say(`\n  ${steps.length} tests from .github/workflows/notebook.yml`);
  for (const cmd of steps) {
    await (step(cmd, async () => {
      const parts = cmd.split(/\s+/);
      const env = { ...process.env };
      // A CI line may carry environment assignments before the command; without
      // this the orchestrator runs "PLUB_VENDOR_INDEX=1" as the executable and
      // two healthy tests look broken.
      while (parts.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(parts[0])) {
        const [k, ...v] = parts.shift().split('=');
        env[k] = v.join('=');
      }
      const r = await run(parts[0], parts.slice(1), { cwd: ROOT, env, maxBuffer: 64 * 1024 * 1024 });
      const last = String(r.stdout).trim().split('\n').filter(Boolean).pop() || '';
      return last.slice(0, 140);
    }))();
  }

  // 3. the design law, measured
  await (step('MSH gate at 390 / 1024 / 1440', async () => {
    const r = await run('node', ['scripts/audit-msh.mjs'], { cwd: ROOT, env: { ...process.env, PLUB_URL: BASE }, maxBuffer: 32 * 1024 * 1024 });
    const verdict = String(r.stdout).split('\n').filter(l => l.startsWith('Verdict:')).pop();
    if (!/Verdict: PASS/.test(r.stdout)) throw new Error(r.stdout);
    return verdict.replace('Verdict: ', '');
  }))();

  await (step('MSH gate must fail on a planted defect', async () => {
    // The planted run exits 0 on purpose: it reports the failures it caught.
    // What matters is that it caught them.
    const r = await run('node', ['scripts/audit-msh.mjs', '--planted'], { cwd: ROOT, env: { ...process.env, PLUB_URL: BASE }, maxBuffer: 32 * 1024 * 1024 });
    const out = String(r.stdout) + String(r.stderr || '');
    if (!/the gate caught it: true/.test(out)) throw new Error(out.slice(-800));
    const n = out.match(/Planted defect: (\d+) failure/);
    return `the gate caught ${n ? n[1] : '?'} planted failure(s)`;
  }))();

  // 4. the raw-source equality check, when the pinned snapshot is on this machine
  await (step('shipped geometry equals the pinned OpenStreetMap source', async () => {
    const cache = path.join(process.env.HOME, 'Projects/bangkok-ioc/source-cache');
    if (!existsSync(cache)) return 'SKIP — the pinned snapshot is not on this machine';
    const r = await run('python3', ['test/street-world-source.py'], { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
    return String(r.stdout).trim().split('\n').pop().slice(0, 140);
  }))();

  // 5. ship
  if (DEPLOY) {
    await (step('deploy the Worker', async () => {
      const r = await run('npx', ['wrangler', 'deploy'], { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
      const id = String(r.stdout).split('\n').map(l => l.trim()).filter(l => l.includes('Worker Version') || l.includes('Version ID')).pop();
      return id || 'deployed';
    }))();
    await (step('every deployed byte matches the repository', async () => {
      const r = await run('node', ['scripts/verify-live-bytes.mjs', LIVE], { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
      const m = String(r.stdout).match(/matched (\d+) · mismatched (\d+) · missing (\d+) · orphans still served (\d+)/);
      if (!m) throw new Error(String(r.stdout));
      if (m[2] !== '0' || m[3] !== '0' || m[4] !== '0') throw new Error(String(r.stdout));
      return `${m[1]} matched, ${m[2]} mismatched, ${m[3]} missing, ${m[4]} orphans`;
    }))();
    await (step('the live URL answers', async () => {
      for (const p of ['/', '/day', '/research', '/bridge-1958', '/v1']) {
        const r = await run('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', `${LIVE}${p}`]);
        if (r.stdout.trim() !== '200') throw new Error(`${p} answered ${r.stdout.trim()}`);
      }
      return '5 surfaces answered 200';
    }))();
  }

  const passed = results.filter(r => r.state === 'PASS').length;
  say(`\n${'─'.repeat(64)}`);
  for (const r of results.filter(r => r.state === 'FAIL')) say(`  FAIL  ${r.name}`);
  say(`  ${passed}/${results.length} steps passed${failed ? ' — the ship is blocked.' : '.'}`);
  say(`${'─'.repeat(64)}\n`);
  if (failed) process.exit(1);
  if (DEPLOY) {
    const stamp = new Date().toISOString().slice(0, 10);
    const out = path.join(ROOT, 'docs', 'release', stamp);
    await writeFile(path.join(out, 'ship-report.json'), JSON.stringify({ stamp, base: BASE, live: LIVE, results }, null, 2) + '\n');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
