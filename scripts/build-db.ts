#!/usr/bin/env bun
/**
 * Bundles the Database Explorer's defuss-db runtime (src/documentation/runtime/db/) into
 * src/documentation/public/js/db/: db.js (connect(): the worker, else memory on the page) and db-worker.js (the
 * OPFS worker), their shared defuss-db code as chunks. scripts/build-docs.ts runs it before the SSG build copies
 * public/ into dist/documentation/.
 *
 * Why a bundle, not the jsDelivr files the other scaffolds import: defuss-db's modules import their packages by
 * bare name (VERIFIED: defuss-db 3.1.0's dist), and openOPFS runs only in a dedicated worker - a module worker reads no import map of its page.
 * The search worker is bundled the same way (scripts/build-search-worker.ts).
 */
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'src', 'documentation', 'runtime', 'db');
const OUT = join(ROOT, 'src', 'documentation', 'public', 'js', 'db');

rmSync(OUT, { recursive: true, force: true });
const result = await Bun.build({
  entrypoints: [join(SRC, 'db.ts'), join(SRC, 'db-worker.ts')],
  outdir: OUT,
  target: 'browser',
  format: 'esm',
  splitting: true,
  minify: true,
  naming: { entry: '[name].[ext]', chunk: 'chunk-[hash].[ext]' },
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
for (const out of result.outputs)
  console.log(`db → ${out.path.slice(ROOT.length + 1)} (${(out.size / 1024).toFixed(1)} KiB)`);
