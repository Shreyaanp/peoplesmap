/**
 * Builds public/tiles/hyderabad.pmtiles: a Hyderabad-only extract of the Protomaps planet basemap
 * (OpenStreetMap data, ODbL), for local development and the motion lab. About 30–60 MB, so it is
 * downloaded, never committed.
 *
 * Uses the official go-pmtiles CLI, which reads only the byte ranges it needs from the planet file.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Pinned for reproducible tiles. Newer builds: https://maps.protomaps.com/builds/ */
const planetBuild = '20261022';
const cliVersion = '1.31.2';
/** The launch area plus a margin (west, south, east, north). */
const bbox = '78.15,17.15,78.75,17.7';
const maxZoom = 15;

const root = resolve(import.meta.dirname, '..');
const cacheDir = join(root, 'node_modules/.cache/pmtiles');
const outDir = join(root, 'public/tiles');
const out = join(outDir, 'hyderabad.pmtiles');

function cliAsset(): { name: string; archive: 'zip' | 'tar.gz'; binary: string } {
  const arch = process.arch === 'arm64' ? 'arm64' : 'x86_64';
  switch (process.platform) {
    case 'win32':
      return { name: `go-pmtiles_${cliVersion}_Windows_${arch}.zip`, archive: 'zip', binary: 'pmtiles.exe' };
    case 'darwin':
      return { name: `go-pmtiles-${cliVersion}_Darwin_${arch}.zip`, archive: 'zip', binary: 'pmtiles' };
    default:
      return { name: `go-pmtiles_${cliVersion}_Linux_${arch}.tar.gz`, archive: 'tar.gz', binary: 'pmtiles' };
  }
}

async function ensureCli(): Promise<string> {
  const asset = cliAsset();
  const binary = join(cacheDir, asset.binary);
  if (existsSync(binary)) return binary;
  mkdirSync(cacheDir, { recursive: true });
  const url = `https://github.com/protomaps/go-pmtiles/releases/download/v${cliVersion}/${asset.name}`;
  console.info(`Downloading the pmtiles CLI ${cliVersion}…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const archive = join(cacheDir, asset.name);
  writeFileSync(archive, Buffer.from(await res.arrayBuffer()));
  // bsdtar (Windows 10+, macOS) reads zip as well as tar.gz. On Windows, name it explicitly: Git Bash's
  // GNU tar comes first on PATH and reads "C:" as a remote host.
  const tar =
    process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:/Windows', 'System32/tar.exe') : 'tar';
  execFileSync(tar, ['-xf', archive, '-C', cacheDir], { stdio: 'inherit' });
  return binary;
}

if (existsSync(out) && !process.argv.includes('--force')) {
  console.info(
    `public/tiles/hyderabad.pmtiles already exists (${(statSync(out).size / 1e6).toFixed(1)} MB). Use --force to rebuild.`,
  );
} else {
  const cli = await ensureCli();
  mkdirSync(outDir, { recursive: true });
  console.info(`Extracting Hyderabad (z0–${maxZoom}) from the ${planetBuild} planet build…`);
  execFileSync(
    cli,
    [
      'extract',
      `https://build.protomaps.com/${planetBuild}.pmtiles`,
      out,
      `--bbox=${bbox}`,
      `--maxzoom=${maxZoom}`,
    ],
    { stdio: 'inherit' },
  );
  console.info(`Wrote public/tiles/hyderabad.pmtiles (${(statSync(out).size / 1e6).toFixed(1)} MB).`);
}
