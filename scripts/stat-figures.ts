#!/usr/bin/env bun
import { pageDirs } from '../src/documentation/lib/page-dirs-files.ts';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { rewriteStatFigures, type StatSources } from './lib/stat-figures.ts';
import { rewriteStatsClaim, type StatsDoc } from './lib/stats.ts';

/**
 * Why: write every `data-stat` figure on the doc pages from its measurement
 * (scripts/lib/stat-figures.ts) - dist/stats.json (`bun run stats`),
 * src/documentation/data/verify-timing.json (`bun scripts/time-verify.ts`) and
 * src/documentation/data/unit-tests.json (recorded by every full `bun run test:run`) -
 * and README's footprint sentence from dist/stats.json (rewriteStatsClaim).
 * VERIFIED: (verify's `stat figures` gate after `bun run figures`) every page figure equals its source.
 * make build runs it after stats, so a release's version bump (which moves the
 * shipped bytes) never leaves a figure behind; verify's `stat figures` and
 * `stats claim (README)` gates name this script when a figure lags.
 */

const ROOT = join(import.meta.dirname, '..');
const PAGES = join(ROOT, 'src', 'documentation', 'pages');

/** the measurements a figure may name - shared with verify's gate */
export function statSources(root: string): StatSources {
  const json = (file: string) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined);
  return {
    stats: json(join(root, 'dist', 'stats.json')),
    verify: json(join(root, 'src', 'documentation', 'data', 'verify-timing.json')),
    tests: json(join(root, 'src', 'documentation', 'data', 'unit-tests.json')),
  };
}

if (import.meta.main) {
  const sources = statSources(ROOT);
  let changed = 0;
  const write = (file: string, name: string, rewrite: (text: string) => string) => {
    const text = readFileSync(file, 'utf8');
    const next = rewrite(text);
    if (next === text) return;
    writeFileSync(file, next);
    changed++;
    console.log(`stat-figures: ${name}`);
  };
  for (const p of pageDirs(PAGES))
    write(p.file, p.folder ? `${p.folder}/${p.slug}.mdx` : `${p.slug}.mdx`, (t) => rewriteStatFigures(t, sources));
  const stats = sources.stats as StatsDoc | undefined;
  if (stats) write(join(ROOT, 'README.md'), 'README.md (stats claim)', (t) => rewriteStatsClaim(t, stats));
  console.log(`stat-figures: ${changed} file(s) rewritten`);
}
