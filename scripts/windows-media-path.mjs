import fs from 'node:fs';
import path from 'node:path';

/**
 * Makes common Windows FFmpeg locations visible to Motion Studio without
 * requiring a machine-wide PATH edit. The caller's environment is updated in
 * place so child processes (HyperFrames/FFmpeg) inherit the same PATH.
 */
export function addWindowsMediaPaths({
  env = process.env,
  projectRoot = process.cwd(),
  platform = process.platform,
} = {}) {
  if (platform !== 'win32') return [];

  const candidates = [
    path.join(projectRoot, 'tools', 'ffmpeg', 'bin'),
    env.LOCALAPPDATA
      ? path.join(env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links')
      : null,
    'C:\\ffmpeg\\bin',
  ].filter(Boolean);

  const current = String(env.PATH ?? '').split(';').filter(Boolean);
  const seen = new Set(current.map((entry) => entry.replace(/[\\/]+$/, '').toLowerCase()));
  const added = [];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const normalized = candidate.replace(/[\\/]+$/, '').toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    added.push(candidate);
  }

  if (added.length) env.PATH = [...added, ...current].join(';');
  return added;
}
