import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {addWindowsMediaPaths} from './scripts/windows-media-path.mjs';

 test('Windows añade las rutas locales de FFmpeg y WinGet sin duplicarlas', (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-studio-path-'));
  t.after(() => fs.rmSync(temp, {recursive: true, force: true}));
  const local = path.join(temp, 'local');
  const project = path.join(temp, 'project');
  const winget = path.join(local, 'Microsoft', 'WinGet', 'Links');
  const bundled = path.join(project, 'tools', 'ffmpeg', 'bin');
  fs.mkdirSync(winget, {recursive: true});
  fs.mkdirSync(bundled, {recursive: true});
  const env = {LOCALAPPDATA: local, PATH: 'C:\\Windows\\System32'};

  const added = addWindowsMediaPaths({env, projectRoot: project, platform: 'win32'});
  assert.deepEqual(added, [bundled, winget]);
  assert.equal(env.PATH, `${bundled};${winget};C:\\Windows\\System32`);

  assert.deepEqual(addWindowsMediaPaths({env, projectRoot: project, platform: 'win32'}), []);
});

test('no modifica PATH en sistemas que no son Windows', () => {
  const env = {PATH: '/usr/bin'};
  assert.deepEqual(addWindowsMediaPaths({env, platform: 'linux'}), []);
  assert.equal(env.PATH, '/usr/bin');
});
