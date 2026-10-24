/**
 * JavaScript budgets that follow the import graph instead of file names.
 *
 * - First load: everything dist/index.html loads up front (the entry and its modulepreloaded
 *   chunks), plus the entry CSS.
 * - Each lazy screen: its chunk plus every chunk it statically imports that the first load did not
 *   already bring, so shared code (Motion, React Aria) counts wherever it first arrives.
 *
 * The bundler names shared chunks after whatever module it starts them from (react-*.js,
 * format-*.js…), so per-file budgets silently miss code. All sizes are gzipped.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const kB = 1024;
const firstLoadBudget = { js: 100 * kB, css: 8 * kB };
/** Lazy screens, by the start of their chunk name, and what each may add on top of the first load. */
const screenBudgets: Record<string, number> = {
  SignIn: 6 * kB,
  Onboarding: 90 * kB,
  MapView: 320 * kB,
  PeopleSheet: 55 * kB,
  SearchBar: 35 * kB,
  InboxButton: 3 * kB,
  // Counted alone; in practice Motion and React Aria are already loaded by the sheet and search bar.
  Inbox: 72 * kB,
};

const dist = resolve(import.meta.dirname, '../dist');
const assetsDir = resolve(dist, 'assets');
const files = readdirSync(assetsDir);
const gz = (file: string) => gzipSync(readFileSync(resolve(assetsDir, file))).length;
const show = (bytes: number) => `${(bytes / kB).toFixed(2)} kB`;

/** Chunks a chunk imports statically (dynamic imports load later, on their own). */
function staticImports(file: string): string[] {
  const code = readFileSync(resolve(assetsDir, file), 'utf8');
  return [...code.matchAll(/(?:^|[;}\n])\s*import\s*(?:[\w${},\s*]+from\s*)?["']\.\/([^"']+\.js)["']/g)].map(
    ([, name]) => name ?? '',
  );
}

function closure(roots: readonly string[]): Set<string> {
  const seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    staticImports(file).forEach(visit);
  };
  roots.forEach(visit);
  return seen;
}

const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
const linked = [...html.matchAll(/(?:src|href)="\/assets\/([^"]+\.(?:js|css))"/g)].map(([, f]) => f ?? '');
const firstLoad = closure(linked.filter((f) => f.endsWith('.js')));

let failed = false;
const report = (label: string, bytes: number, budget: number, detail: string) => {
  const over = bytes > budget;
  failed ||= over;
  console.log(`${over ? '✖' : '✔'} ${label}: ${show(bytes)} of ${show(budget)}  (${detail})`);
};

const firstJs = [...firstLoad];
report(
  'First load JS',
  firstJs.reduce((s, f) => s + gz(f), 0),
  firstLoadBudget.js,
  firstJs.join(', '),
);
const firstCss = linked.filter((f) => f.endsWith('.css'));
report(
  'First load CSS',
  firstCss.reduce((s, f) => s + gz(f), 0),
  firstLoadBudget.css,
  firstCss.join(', '),
);

for (const [screen, budget] of Object.entries(screenBudgets)) {
  const chunk = files.find((f) => f.startsWith(`${screen}-`) && f.endsWith('.js'));
  if (!chunk) {
    console.log(`✖ ${screen}: no chunk found`);
    failed = true;
    continue;
  }
  const added = [...closure([chunk])].filter((f) => !firstLoad.has(f));
  report(
    `${screen} adds`,
    added.reduce((s, f) => s + gz(f), 0),
    budget,
    added.join(', '),
  );
}

if (failed) process.exit(1);
