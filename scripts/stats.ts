#!/usr/bin/env bun
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { writeStatsFile } from './lib/stats-files.ts';

/**
 * Why: publish the size/surface summary of the shipped system as
 * dist/stats.json — per-type counts, the JS/CSS-only split, and per-
 * component + total byte sizes (readable, minified, gzipped). It runs right
 * after minify (the min twins are what get measured), standalone via
 * `bun run stats` / `make stats`, and is part of `bun run build`. verify's
 * `stats.json fresh` gate keeps it from ever lagging dist/components/.
 */

const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');

if (!existsSync(join(DIST, 'components'))) {
  console.error('stats: dist/components/ missing — run `bun run build` first');
  process.exit(1);
}

const doc = writeStatsFile(DIST);
const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`;
console.log(
  `stats: ${doc.total} components (${Object.entries(doc.byType).map(([t, n]) => `${n} ${t}`).join(', ')}) · ` +
    `${doc.withJs} with JS / ${doc.withoutJs} CSS-only · ` +
    `total ${kb(doc.totalSize)} (${kb(doc.totalSizeMinified)} min, ${kb(doc.totalSizeGz)} gz, ${kb(doc.totalSizeGzMinified)} gz-min) · ` +
    `bundle ${kb(doc.bundle.totalSizeGzMinified)} gz-min → dist/stats.json`,
);
