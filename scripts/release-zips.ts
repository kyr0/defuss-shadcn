#!/usr/bin/env bun
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { zipPlans } from './lib/release-zips.ts';
import type { StatsDoc } from './lib/stats.ts';

/**
 * Why: the vendoring downloads - one ZIP per section bundle + one for all.*
 * (scripts/lib/release-zips.ts decides what goes in). Built from the built
 * dist/ (run after `bun run build`), never committed: deploy.sh attaches the
 * ZIPs to the GitHub release, so the Bundles & Downloads page links
 * github.com/…/releases/download/vX.Y.Z/<zip>.
 *
 *   bun scripts/release-zips.ts [--out <dir>]   (default: release/)
 *
 * The section plan is read from dist/stats.json (stats.ts wrote it from the
 * same scripts/lib/sections-files.ts plan), so the ZIPs pack exactly what
 * was built and measured. Fails when a planned file is missing from dist/.
 *
 * VERIFIED: (tests/e2e/section-bundles.e2e.ts builds + unzips them) one ZIP
 * per section + all, each holding one folder with README, LICENSE, NOTICE.txt.
 */

const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const outArg = process.argv.indexOf('--out');
const OUT = resolve(ROOT, outArg > -1 ? process.argv[outArg + 1] : 'release');

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string; homepage: string };
const stats = JSON.parse(readFileSync(join(DIST, 'stats.json'), 'utf8')) as StatsDoc;
const plans = zipPlans(
  Object.entries(stats.sections).map(([name, s]) => ({ name, heading: s.heading, members: s.members, needs: s.needs, files: s.files })),
  pkg.version,
  pkg.homepage,
);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const missing: string[] = [];
for (const plan of plans) {
  const stage = join(OUT, plan.folder);
  for (const rel of plan.files) {
    const target = join(stage, rel === 'LICENSE' || rel === 'README.md' || rel === 'components/NOTICE.txt' ? rel.replace('components/', '') : rel);
    mkdirSync(dirname(target), { recursive: true });
    if (rel === 'README.md') writeFileSync(target, plan.readme);
    else if (rel === 'LICENSE') cpSync(join(ROOT, 'LICENSE'), target);
    else if (existsSync(join(DIST, rel))) cpSync(join(DIST, rel), target);
    else missing.push(`${plan.zip}: dist/${rel}`);
  }
}
if (missing.length) {
  console.error(`release-zips: ${missing.length} planned file(s) missing - run \`bun run build\` first:\n  ${missing.slice(0, 10).join('\n  ')}`);
  process.exit(1);
}
for (const plan of plans) {
  // -X: no extra file attributes (uid/gid) - the ZIP depends on the files only
  const zip = Bun.spawnSync(['zip', '-X', '-q', '-r', plan.zip, plan.folder], { cwd: OUT });
  if (zip.exitCode !== 0) {
    console.error(`release-zips: zip ${plan.zip} failed: ${zip.stderr.toString()}`);
    process.exit(1);
  }
  rmSync(join(OUT, plan.folder), { recursive: true, force: true });
}
console.log(`release-zips: ${plans.length} ZIPs → ${OUT} (${plans.map((p) => p.zip.replace(`defuss-shadcn-v${pkg.version}-`, '')).join(', ')})`);
