/**
 * Downloads the Fontshare typeface candidates for the Storybook specimen only.
 *
 * General Sans and Satoshi are under the ITF Free Font License (FFL) 2.0: free for commercial use
 * and self-hosting on our own site, but the files may not be redistributed (including through a
 * public repository) or modified (including subsetting). So they are fetched from Fontshare into
 * .storybook/specimen-fonts/ (gitignored) instead of being committed. Plus Jakarta Sans and Geist
 * are OFL-1.1 and come from @fontsource-variable packages.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const fonts = { 'general-sans': 'GeneralSans-Variable', satoshi: 'Satoshi-Variable' } as const;
const out = resolve(import.meta.dirname, '../.storybook/specimen-fonts');
mkdirSync(out, { recursive: true });

for (const [slug, file] of Object.entries(fonts)) {
  // "@1" asks Fontshare's CSS API for the variable font.
  const css = await (await fetch(`https://api.fontshare.com/v2/css?f[]=${slug}@1&display=swap`)).text();
  const url = /url\('(\/\/cdn\.fontshare\.com\/[^']+\.woff2)'\)/.exec(css)?.[1];
  if (!url) throw new Error(`No variable woff2 found for ${slug}`);
  const res = await fetch(`https:${url}`);
  if (!res.ok) throw new Error(`Download failed for ${slug}: ${res.status}`);
  writeFileSync(join(out, `${file}.woff2`), Buffer.from(await res.arrayBuffer()));
  console.info(`Downloaded ${slug} → .storybook/specimen-fonts/${file}.woff2`);
}
