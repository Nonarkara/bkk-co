#!/usr/bin/env node
/**
 * Make this clone restamp public asset fingerprints on commit.
 *
 * A plain clone gets core.hooksPath=.githooks.
 * A clone whose hooks already chain to another directory (Cursor's dispatcher
 * records that directory in .cursor-original-hooks-path) keeps that path and
 * gains a pre-commit symlink, so the restamp runs and the existing hooks stay.
 *
 *   node scripts/install-hooks.mjs
 */
import { execFileSync } from 'node:child_process';
import { chmod, lstat, mkdir, readFile, readlink, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const want = '.githooks';
const hookName = 'pre-commit';
const hookFile = path.join(root, want, hookName);

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function isWant(value) {
  if (!value) return false;
  return value === want || path.resolve(root, value) === path.resolve(root, want);
}

let hooksPath = '';
try {
  hooksPath = git(['config', '--local', '--get', 'core.hooksPath']);
} catch {
  hooksPath = '';
}

if (hooksPath && !isWant(hooksPath)) {
  let original = '';
  try {
    original = (await readFile(path.join(path.resolve(root, hooksPath), '.cursor-original-hooks-path'), 'utf8')).trim();
  } catch {
    original = '';
  }
  if (!original) {
    console.log(`core.hooksPath is ${hooksPath}; leaving it. Set it to ${want} to restamp on commit.`);
    process.exit(0);
  }
  const destDir = path.resolve(root, original);
  const dest = path.join(destDir, hookName);
  const relTarget = path.relative(destDir, hookFile);
  await chmod(hookFile, 0o755);
  try {
    const current = await lstat(dest);
    if (!current.isSymbolicLink()) {
      console.log(`${dest} already exists and is not a symlink; leaving it.`);
      process.exit(0);
    }
    if (await readlink(dest) === relTarget) {
      console.log(`pre-commit already chains to ${want}/${hookName}`);
      process.exit(0);
    }
  } catch {
    // No hook there yet.
  }
  await mkdir(destDir, { recursive: true });
  await rm(dest, { force: true });
  await symlink(relTarget, dest);
  console.log(`linked ${path.relative(root, dest)} -> ${relTarget}`);
  console.log(`core.hooksPath stays ${hooksPath}`);
  process.exit(0);
}

await chmod(hookFile, 0o755);
if (isWant(hooksPath)) {
  console.log(`core.hooksPath is already ${want}`);
} else {
  execFileSync('git', ['config', '--local', 'core.hooksPath', want], { cwd: root });
  console.log(`core.hooksPath=${want}`);
}
