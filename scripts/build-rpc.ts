#!/usr/bin/env bun
/**
 * Bundles the API Documentation scaffold's defuss-rpc runtime (src/documentation/runtime/api-docs/: the
 * documented schema, the example API as the in-page mock, a wire client) into src/documentation/public/js/api-docs/
 * client.js. scripts/build-docs.ts runs it before the SSG build copies public/ into dist/documentation/.
 *
 * VERIFIED: why a bundle - the page imports one module that carries defuss-dson and the example's TypeScript; the example
 * server (runtime/api-docs/server.ts) runs the same api.ts on Bun.
 */
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'src', 'documentation', 'public', 'js', 'api-docs');

rmSync(OUT, { recursive: true, force: true });
const result = await Bun.build({
  entrypoints: [join(ROOT, 'src', 'documentation', 'runtime', 'api-docs', 'client.ts')],
  outdir: OUT,
  target: 'browser',
  format: 'esm',
  minify: true,
  naming: { entry: '[name].[ext]' },
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
for (const out of result.outputs)
  console.log(`api-docs → ${out.path.slice(ROOT.length + 1)} (${(out.size / 1024).toFixed(1)} KiB)`);
