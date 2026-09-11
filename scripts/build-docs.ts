#!/usr/bin/env node
/**
 * Why: dist/documentation/ is produced ONLY by defuss-ssg from the MDX pages
 * and TSX components in src/documentation/. defuss-ssg pulls in uWebSockets.js
 * through its serve machinery, which ships Node-only native binaries
 * (engines ^20.19 || >=22.12) — so this script runs under `node`, not bun
 * (Node ≥23 strips the TypeScript types natively; keep the syntax erasable).
 *
 * Steps: compile the client runtime (runtime/*.ts → public/js/, tsc strips
 * types), then render every pages/*.mdx into dist/documentation/.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { build } from 'defuss-ssg';

const ROOT = join(import.meta.dirname, '..');
const DOCS = join(ROOT, 'src', 'documentation');

// 1. client runtime TS → public/js/ (the SSG build copies public/ verbatim)
const tsc = spawnSync('bunx', ['tsc', '-p', join(ROOT, 'tsconfig.docs-runtime.json')], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

// 2. components read repo files (component sources, skills, stats.json) at
//    build time — the SSG copies the project into .ssg-temp, so pin the root
process.env.DEFUSS_SHADCN_ROOT = ROOT;

const status = await build({
  projectDir: DOCS,
  mode: 'build',
  debug: process.argv.includes('--debug'),
});
if (status.code !== 'OK') {
  console.error('defuss-ssg build failed:', status.message);
  process.exit(1);
}
console.log('dist/documentation/ rendered by defuss-ssg');
