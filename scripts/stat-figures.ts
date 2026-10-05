#!/usr/bin/env bun
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { rewriteStatFigures, type StatSources } from './lib/stat-figures.ts';

/**
 * Why: write every `data-stat` figure on the doc pages from its measurement
 * (scripts/lib/stat-figures.ts) - dist/stats.json (`bun run stats`) and
 * src/documentation/data/verify-timing.json (`bun scripts/time-verify.ts`).
 * Run after either changes; verify's `stat figures` gate names this script
 * when a figure lags.
 */

const ROOT = join(import.meta.dirname, '..');
const PAGES = join(ROOT, 'src', 'documentation', 'pages');

/** the measurements a figure may name - shared with verify's gate */
export function statSources(root: string): StatSources {
  const json = (file: string) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined);
  return {
    stats: json(join(root, 'dist', 'stats.json')),
    verify: json(join(root, 'src', 'documentation', 'data', 'verify-timing.json')),
  };
}

if (import.meta.main) {
  const sources = statSources(ROOT);
  let changed = 0;
  for (const f of readdirSync(PAGES).filter((n) => n.endsWith('.mdx'))) {
    const file = join(PAGES, f);
    const text = readFileSync(file, 'utf8');
    const next = rewriteStatFigures(text, sources);
    if (next !== text) {
      writeFileSync(file, next);
      changed++;
      console.log(`stat-figures: ${f}`);
    }
  }
  console.log(`stat-figures: ${changed} page(s) rewritten`);
}
