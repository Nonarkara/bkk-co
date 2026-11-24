/**
 * The pre-commit hook restamps public pages from the asset bytes in the commit,
 * and it refuses to do that while those files also have unstaged edits.
 */
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod, cp, lstat, readlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hookSrc = path.join(ROOT, '.githooks', 'pre-commit');

execFileSync('sh', ['-n', hookSrc], { stdio: 'inherit' });
execFileSync(process.execPath, ['--check', path.join(ROOT, 'scripts', 'install-hooks.mjs')], { stdio: 'inherit' });

const dir = await mkdtemp(path.join(tmpdir(), 'plub-stamp-hook-'));
const git = (args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });

try {
  git(['init', '-b', 'main']);
  git(['config', 'user.email', 'hook@example.com']);
  git(['config', 'user.name', 'Hook Test']);
  git(['config', 'commit.gpgsign', 'false']);
  git(['config', 'core.hooksPath', '.githooks']);
  await mkdir(path.join(dir, '.githooks'), { recursive: true });
  await mkdir(path.join(dir, 'public'), { recursive: true });
  await mkdir(path.join(dir, 'scripts'), { recursive: true });
  await cp(hookSrc, path.join(dir, '.githooks', 'pre-commit'));
  await chmod(path.join(dir, '.githooks', 'pre-commit'), 0o755);
  await cp(path.join(ROOT, 'scripts', 'stamp-assets.mjs'), path.join(dir, 'scripts', 'stamp-assets.mjs'));
  await writeFile(path.join(dir, 'public', 'style.css'), 'body{color:#111}\n');
  await writeFile(path.join(dir, 'public', 'index.html'), '<link href="style.css" rel="stylesheet">\n');
  git(['add', '.']);
  git(['commit', '-m', 'initial']);

  const stamped = git(['show', 'HEAD:public/index.html']);
  const v1 = stamped.match(/style\.css\?v=([0-9a-f]{8})/);
  assert.ok(v1, `initial commit should carry a fingerprint:\n${stamped}`);

  await writeFile(path.join(dir, 'public', 'style.css'), 'body{color:#222}\n');
  git(['add', 'public/style.css']);
  git(['commit', '-m', 'recolor']);
  const stamped2 = git(['show', 'HEAD:public/index.html']);
  const v2 = stamped2.match(/style\.css\?v=([0-9a-f]{8})/);
  assert.ok(v2, stamped2);
  assert.notEqual(v1[1], v2[1]);
  assert.equal(await readFile(path.join(dir, 'public', 'index.html'), 'utf8'), stamped2);

  await writeFile(path.join(dir, 'public', 'style.css'), 'body{color:#333}\n');
  await writeFile(path.join(dir, 'public', 'app.js'), 'console.log(1)\n');
  git(['add', 'public/app.js']);
  let blocked = false;
  try {
    git(['commit', '-m', 'should fail']);
  } catch (error) {
    blocked = true;
    const text = `${error.stderr || ''}${error.stdout || ''}${error.message || ''}`;
    assert.match(text, /unstaged/);
  }
  assert.equal(blocked, true, 'a dirty public asset must block the commit');
  assert.equal(git(['status', '--porcelain', '--', 'public/app.js']).startsWith('A '), true);

  console.log('stamp hook restamps a staged asset and refuses a dirty worktree');
} finally {
  await rm(dir, { recursive: true, force: true });
}

// install-hooks.mjs either points core.hooksPath at .githooks, or, when a
// dispatcher already chains to another directory, links the hook there.
const installDir = await mkdtemp(path.join(tmpdir(), 'plub-install-hooks-'));
const install = (args = []) => execFileSync(process.execPath, ['scripts/install-hooks.mjs', ...args], {
  cwd: installDir, encoding: 'utf8',
});
const config = (args) => execFileSync('git', args, { cwd: installDir, encoding: 'utf8' }).trim();
try {
  execFileSync('git', ['init', '-b', 'main'], { cwd: installDir });
  await mkdir(path.join(installDir, '.githooks'), { recursive: true });
  await mkdir(path.join(installDir, 'scripts'), { recursive: true });
  await writeFile(path.join(installDir, '.githooks', 'pre-commit'), '#!/bin/sh\nexit 0\n');
  await cp(path.join(ROOT, 'scripts', 'install-hooks.mjs'), path.join(installDir, 'scripts', 'install-hooks.mjs'));

  const plain = install();
  assert.match(plain, /core\.hooksPath=\.githooks/);
  assert.equal(config(['config', '--local', '--get', 'core.hooksPath']), '.githooks');
  assert.match(install(), /already \.githooks/);

  config(['config', '--local', '--unset', 'core.hooksPath']);
  const dispatcher = path.join(installDir, 'dispatcher');
  await mkdir(dispatcher);
  await writeFile(path.join(dispatcher, '.cursor-original-hooks-path'), '.git/hooks\n');
  config(['config', '--local', 'core.hooksPath', 'dispatcher']);
  const chained = install();
  assert.match(chained, /linked/);
  assert.equal(config(['config', '--local', '--get', 'core.hooksPath']), 'dispatcher');
  const link = path.join(installDir, '.git', 'hooks', 'pre-commit');
  assert.equal((await lstat(link)).isSymbolicLink(), true);
  assert.equal(await readlink(link), path.relative(path.dirname(link), path.join(installDir, '.githooks', 'pre-commit')));
  assert.match(install(), /already chains/);

  await rm(link);
  await writeFile(link, '#!/bin/sh\nexit 0\n');
  await chmod(link, 0o755);
  const kept = install();
  assert.match(kept, /not a symlink/);
  assert.equal((await lstat(link)).isSymbolicLink(), false);
  console.log('install-hooks sets .githooks, or chains without replacing an existing path');
} finally {
  await rm(installDir, { recursive: true, force: true });
}
